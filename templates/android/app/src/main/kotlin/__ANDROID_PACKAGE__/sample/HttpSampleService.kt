package __ANDROID_PACKAGE__.sample

import dev.nativestep.kit.AppError
import dev.nativestep.kit.AppException
import dev.nativestep.kit.NodeJson
import java.net.HttpURLConnection
import java.net.URI
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** The real service (R4): lives in Mobile, never runs in a behavior session. */
class HttpSampleService(private val baseUrl: String = "https://api.example.com/") : SampleService {
    override suspend fun list(page: Int): Result<SampleList> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = URI("${baseUrl}items?page=$page").toURL().openConnection() as HttpURLConnection
            try {
                if (connection.responseCode != 200) throw AppException(AppError("http_${connection.responseCode}"))
                NodeJson.decodeFromString(SampleList.serializer(), connection.inputStream.bufferedReader().readText())
            } finally {
                connection.disconnect()
            }
        }.recoverCatching { e -> throw e as? AppException ?: AppException(AppError("offline", e.message)) }
    }
}
