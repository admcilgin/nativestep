package dev.nativestep.kit.host

import dev.nativestep.kit.Effects
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import java.io.FileDescriptor
import java.io.FileOutputStream
import java.io.PrintStream
import java.net.InetAddress
import java.net.ServerSocket
import java.util.concurrent.Executors
import kotlin.concurrent.thread
import kotlin.system.exitProcess
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.put

/** A protocol error response (PROTOCOL.md §8). [extra] fields go next to `code` and `message`. */
class ProtocolError(
    val code: String,
    override val message: String,
    val extra: Map<String, JsonElement> = emptyMap(),
) : Exception(message) {
    fun toJson() = JsonObject(extra + mapOf("code" to JsonPrimitive(code), "message" to JsonPrimitive(message)))
}

/**
 * The protocol server (PROTOCOL.md). [makeRoot] builds the app's root from fixture services, runs its effects
 * in the given scope and opens the route if one is given (R3, R16). In a debug app it also swaps the core the
 * UI draws. Every request and effect runs on [dispatcher]: the app's main dispatcher, or a single host thread.
 */
class NativeStepHost(
    private val app: String,
    private val target: String = "android",
    private val dispatcher: CoroutineDispatcher = Executors.newSingleThreadExecutor {
        Thread(it, "nativestep").apply { isDaemon = true }
    }.asCoroutineDispatcher(),
    private val makeRoot: (fixtures: FixtureStore, route: String?, scope: CoroutineScope) -> IntrospectionNode,
) {
    private var scope: CoroutineScope? = null
    private var root: IntrospectionNode? = null
    private var poisoned: ProtocolError? = null

    /** Headless mode: requests on stdin, responses on stdout. Anything else the app prints goes to stderr. */
    fun runStdio(): Nothing {
        val out = PrintStream(FileOutputStream(FileDescriptor.out), true, Charsets.UTF_8)
        System.setOut(System.err)
        NetworkGuard.install()
        val input = System.`in`.bufferedReader(Charsets.UTF_8)
        while (true) {
            val line = input.readLine() ?: break
            out.println(runBlocking(dispatcher) { respond(line) })
        }
        exitProcess(0)
    }

    /**
     * Device mode: the debug app listens on 127.0.0.1:[port] (PROTOCOL.md §1); reach it with `adb forward`.
     * Call it once, from debug code only (R20).
     */
    fun listen(port: Int = 7359): Thread = thread(isDaemon = true, name = "nativestep-server") {
        NetworkGuard.install()
        ServerSocket(port, 1, InetAddress.getLoopbackAddress()).use { server ->
            System.err.println("nativestep: listening on 127.0.0.1:$port")
            while (true) {
                val socket = server.accept()
                runCatching {
                    socket.use { s ->
                        val input = s.getInputStream().bufferedReader(Charsets.UTF_8)
                        val output = PrintStream(s.getOutputStream(), true, Charsets.UTF_8)
                        while (true) {
                            val line = input.readLine() ?: break
                            output.println(runBlocking(dispatcher) { respond(line) })
                        }
                    }
                }
            }
        }
    }

    /** Handles one request line and returns one response line. Must run on the host's dispatcher. */
    fun respond(line: String): String {
        var id: JsonElement = JsonNull
        val response = try {
            val request = runCatching { Json.parseToJsonElement(line) }.getOrNull() as? JsonObject
                ?: throw ProtocolError("bad_request", "the line is not a JSON object")
            id = request["id"] ?: JsonNull
            val cmd = (request["cmd"] as? JsonPrimitive)?.takeIf { it.isString }?.content
                ?: throw ProtocolError("bad_request", "missing cmd")
            JsonObject(handle(cmd, request) + mapOf("id" to id, "ok" to JsonPrimitive(true)))
        } catch (e: ProtocolError) {
            buildJsonObject { put("id", id); put("ok", false); put("error", e.toJson()) }
        } catch (e: Exception) {
            val error = ProtocolError("internal", "unexpected error", mapOf("detail" to JsonPrimitive(e.toString())))
            buildJsonObject { put("id", id); put("ok", false); put("error", error.toJson()) }
        }
        return response.toString()
    }

    private fun handle(cmd: String, request: JsonObject): Map<String, JsonElement> = when (cmd) {
        "hello" -> {
            if ((request["protocol"] as? JsonPrimitive)?.intOrNull != PROTOCOL_VERSION) {
                throw ProtocolError("protocol_mismatch", "this host speaks protocol $PROTOCOL_VERSION",
                    mapOf("supported" to JsonArray(listOf(JsonPrimitive(PROTOCOL_VERSION)))))
            }
            mapOf(
                "protocol" to JsonPrimitive(PROTOCOL_VERSION),
                "target" to JsonPrimitive(target),
                "app" to JsonPrimitive(app),
                "capabilities" to JsonArray(listOf(JsonPrimitive("start"))),
            )
        }
        "start" -> {
            stop()
            NetworkGuard.activate(true)
            val document = request["fixtures"] ?: JsonObject(emptyMap())
            if (document !is JsonObject) throw ProtocolError("bad_request", "fixtures must be an object")
            val fixtures = FixtureStore(document) { error -> if (poisoned == null) poisoned = error }
            val route = (request["route"] as? JsonPrimitive)?.takeIf { it.isString }?.content
            val session = CoroutineScope(SupervisorJob() + dispatcher)
            scope = session
            root = makeRoot(fixtures, route, session)
            snapshot()
        }
        "ls" -> snapshot()
        "do" -> {
            checkSession()
            val name = (request["action"] as? JsonPrimitive)?.takeIf { it.isString }?.content
                ?: throw ProtocolError("bad_request", "missing action")
            val actions = focus().second
            val action = actions.firstOrNull { it.first.name == name }?.first
                ?: throw ProtocolError("action_unavailable", "$name is not available here",
                    mapOf("available" to JsonArray(actions.map { JsonPrimitive(it.first.name) })))
            val input = request["input"] ?: JsonObject(emptyMap())
            action.input?.validate(input)?.takeIf { it.isNotEmpty() }?.let { violations ->
                throw ProtocolError("invalid_input", "input for $name does not match its schema", mapOf(
                    "errors" to JsonArray(violations.map { v ->
                        buildJsonObject { put("path", v.path); put("message", v.message) }
                    }),
                ))
            }
            try {
                action.perform(input)
            } catch (e: kotlinx.serialization.SerializationException) {
                throw ProtocolError("invalid_input", "input for $name could not be decoded", mapOf(
                    "errors" to JsonArray(listOf(buildJsonObject { put("path", ""); put("message", e.message ?: "") })),
                ))
            }
            snapshot()
        }
        "stop" -> {
            stop()
            emptyMap()
        }
        else -> throw ProtocolError("unknown_command", "unknown command $cmd",
            mapOf("commands" to JsonArray(listOf("hello", "start", "ls", "do", "stop").map(::JsonPrimitive))))
    }

    private fun stop() {
        scope?.cancel()
        scope = null
        Effects.reset()
        NetworkGuard.activate(false)
        poisoned = null
        root = null
    }

    private fun checkSession() {
        if (root == null) throw ProtocolError("no_session", "send start first")
        val blocked = NetworkGuard.firstBlocked
        if (poisoned == null && blocked != null) {
            poisoned = ProtocolError("network_blocked", "a network request was attempted during the session",
                mapOf("request" to buildJsonObject { put("url", blocked) }))
        }
        poisoned?.let { throw it }
    }

    /**
     * The chain from the root to the focused node, and the focused node's actions:
     * its own first, then those lent by the nodes above it, nearest first (PROTOCOL.md §4).
     */
    private fun focus(): Pair<List<IntrospectionNode>, List<Pair<NodeAction, String?>>> {
        val path = generateSequence(root!!) { it.child }.toList()
        val actions = path.last().actions.map { it to null as String? }.toMutableList()
        for (ancestor in path.dropLast(1).asReversed()) {
            for (action in ancestor.lends) {
                if (actions.none { it.first.name == action.name }) actions += action to ancestor.name
            }
        }
        return path to actions
    }

    private fun snapshot(): Map<String, JsonElement> {
        checkSession()
        val (path, actions) = focus()
        val node = path.last()
        return mapOf(
            "node" to buildJsonObject {
                put("name", node.name)
                put("state", node.state())
                put("actions", JsonArray(actions.map { (action, lentBy) ->
                    buildJsonObject {
                        put("name", action.name)
                        put("title", action.title)
                        action.input?.let { put("input", it.toJson()) }
                        lentBy?.let { put("lentBy", it) }
                    }
                }))
            },
            "path" to JsonArray(path.map { JsonPrimitive(it.name) }),
            "busy" to JsonPrimitive(Effects.inFlight > 0),
        )
    }

    companion object {
        const val PROTOCOL_VERSION = 1
    }
}
