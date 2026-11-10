package dev.nativestep.kit.host

import dev.nativestep.kit.AppError
import dev.nativestep.kit.AppException
import dev.nativestep.kit.NodeJson
import kotlinx.coroutines.delay
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.serializer

/**
 * Answers service calls from the session's fixture document (PROTOCOL.md §7).
 * Host-side fixture services call [call] instead of doing real work.
 */
class FixtureStore internal constructor(document: JsonObject, private val poison: (ProtocolError) -> Unit) {
    private class Entry(
        val args: JsonObject?,
        val result: JsonElement?,
        val error: AppError?,
        val delayMs: Long,
        var remaining: Int?,
    )

    private val services = mutableMapOf<String, Map<String, List<Entry>>>()
    val flags: JsonObject = document["flags"] as? JsonObject ?: JsonObject(emptyMap())

    init {
        val services = document["services"] ?: JsonObject(emptyMap())
        if (services !is JsonObject) throw ProtocolError("bad_request", "fixtures.services must be an object")
        for ((service, methods) in services) {
            if (methods !is JsonObject) throw ProtocolError("bad_request", "fixtures.services.$service must be an object")
            this.services[service] = methods.mapValues { (method, entries) ->
                if (entries !is JsonArray) throw ProtocolError("bad_request", "fixtures for $service.$method must be a list")
                entries.map { e ->
                    e as? JsonObject ?: throw ProtocolError("bad_request", "a fixture for $service.$method must be an object")
                    val error = e["error"]?.let { NodeJson.decodeFromJsonElement(AppError.serializer(), it) }
                    if ((e["result"] == null) == (error == null)) {
                        throw ProtocolError("bad_request", "a fixture for $service.$method needs exactly one of result and error")
                    }
                    Entry(
                        args = e["args"] as? JsonObject,
                        result = e["result"],
                        error = error,
                        delayMs = (e["delayMs"] as? JsonPrimitive)?.intOrNull?.toLong() ?: 0,
                        remaining = (e["times"] as? JsonPrimitive)?.intOrNull,
                    )
                }
            }
        }
    }

    suspend fun <T> call(service: String, method: String, args: Map<String, JsonElement>, serializer: KSerializer<T>): Result<T> {
        val entry = services[service]?.get(method)?.firstOrNull { e ->
            e.remaining != 0 && (e.args ?: emptyMap()).all { (k, v) -> args[k] == v }
        }
        if (entry == null) {
            poison(ProtocolError("fixture_missing", "no fixture for $service.$method", mapOf(
                "service" to JsonPrimitive(service),
                "method" to JsonPrimitive(method),
                "args" to JsonObject(args),
            )))
            return Result.failure(AppException(AppError("fixture_missing")))
        }
        entry.remaining = entry.remaining?.minus(1)
        if (entry.delayMs > 0) delay(entry.delayMs)
        entry.error?.let { return Result.failure(AppException(it)) }
        return try {
            Result.success(NodeJson.decodeFromJsonElement(serializer, entry.result!!))
        } catch (e: Exception) {
            poison(ProtocolError("internal", "fixture result for $service.$method does not decode",
                mapOf("detail" to JsonPrimitive(e.message ?: e.toString()))))
            Result.failure(AppException(AppError("internal")))
        }
    }

    suspend inline fun <reified T> call(service: String, method: String, vararg args: Pair<String, JsonElement>): Result<T> =
        call(service, method, args.toMap(), serializer<T>())
}
