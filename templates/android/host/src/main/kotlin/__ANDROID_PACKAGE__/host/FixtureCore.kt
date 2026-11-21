package __ANDROID_PACKAGE__.host

import dev.nativestep.kit.host.FixtureStore
import dev.nativestep.kit.host.ProtocolError
import __ANDROID_PACKAGE__.app.AppCore
import __ANDROID_PACKAGE__.app.Services
import __ANDROID_PACKAGE__.sample.SampleList
import __ANDROID_PACKAGE__.sample.SampleService
import __ANDROID_PACKAGE__.sample.SampleCore
import dev.nativestep.kit.IntrospectionNode
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.JsonPrimitive

/**
 * The headless host's root: the conformance core for `_sample` sessions (COMPONENTS.md §6), the app otherwise.
 * Until the app has a shell of its own the two are the same tree.
 */
fun hostRoot(fixtures: FixtureStore, route: String?, scope: CoroutineScope): IntrospectionNode {
    if (fixtures.flags["conformance"] != JsonPrimitive(true)) return fixtureCore(fixtures, route, scope)
    val core = SampleCore(FixtureSampleService(fixtures), scope)
    if (route != null && !core.open(route)) throw ProtocolError("bad_request", "no screen for route $route")
    return core
}

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
