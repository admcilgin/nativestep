package __ANDROID_PACKAGE__.host

import dev.nativestep.kit.host.FixtureStore
import dev.nativestep.kit.host.ProtocolError
import __ANDROID_PACKAGE__.app.AppCore
import __ANDROID_PACKAGE__.app.Services
import __ANDROID_PACKAGE__.sample.SampleList
import __ANDROID_PACKAGE__.sample.SampleService
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.JsonPrimitive

/** Builds Core with fixture services (R3) and opens [route]. Used by the headless host and the debug app. */
fun fixtureCore(fixtures: FixtureStore, route: String?, scope: CoroutineScope): AppCore {
    val core = AppCore(Services(sample = FixtureSampleService(fixtures)), scope)
    if (route != null && !core.open(route)) throw ProtocolError("bad_request", "no screen for route $route")
    return core
}

class FixtureSampleService(private val fixtures: FixtureStore) : SampleService {
    override suspend fun list(page: Int): Result<SampleList> =
        fixtures.call("SampleService", "list", "page" to JsonPrimitive(page))
}
