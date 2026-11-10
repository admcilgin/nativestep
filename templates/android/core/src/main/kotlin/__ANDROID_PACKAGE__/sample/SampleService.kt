package __ANDROID_PACKAGE__.sample

import kotlinx.serialization.Serializable

@Serializable
data class SampleItem(val id: String, val title: String)

@Serializable
data class SampleList(val items: List<SampleItem>)

/** Names and parameters match the fixtures and the iOS service exactly (R5). */
interface SampleService {
    suspend fun list(page: Int): Result<SampleList>
}
