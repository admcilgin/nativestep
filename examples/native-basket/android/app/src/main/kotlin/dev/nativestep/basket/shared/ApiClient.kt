package dev.nativestep.basket.shared

import dev.nativestep.kit.AppError
import dev.nativestep.kit.AppException
import dev.nativestep.kit.NodeJson
import java.net.HttpURLConnection
import java.net.URI
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer

/**
 * The real HTTP client (R4): lives in Mobile, never runs in a behavior session. It holds the bearer token
 * after sign-in, so service methods do not take it (profile: Services).
 */
object ApiClient {
    private const val BASE_URL = "https://api.basket.example/v1/"
    @Volatile private var token: String? = null

    fun signedIn(token: String) {
        this.token = token
    }

    suspend fun <T> send(method: String, path: String, serializer: KSerializer<T>, body: String? = null): Result<T> =
        withContext(Dispatchers.IO) {
            runCatching {
                val connection = URI(BASE_URL + path).toURL().openConnection() as HttpURLConnection
                try {
                    connection.requestMethod = method
                    connection.connectTimeout = 10_000
                    token?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
                    if (body != null) {
                        connection.doOutput = true
                        connection.setRequestProperty("Content-Type", "application/json")
                        connection.outputStream.use { it.write(body.toByteArray()) }
                    }
                    when (connection.responseCode) {
                        in 200..299 -> NodeJson.decodeFromString(serializer, connection.inputStream.bufferedReader().readText())
                        401 -> throw AppException(AppError("unauthorized"))
                        404 -> throw AppException(AppError("not_found"))
                        409 -> throw AppException(AppError("out_of_stock"))
                        else -> throw AppException(AppError("network"))
                    }
                } finally {
                    connection.disconnect()
                }
            }.recoverCatching { e -> throw e as? AppException ?: AppException(AppError("network")) }
        }
}
