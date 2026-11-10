package __ANDROID_PACKAGE__.app

import dev.nativestep.kit.EffectRunner
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.ModalNavigator
import dev.nativestep.kit.StackNavigator
import dev.nativestep.kit.TabNavigator
import __ANDROID_PACKAGE__.about.AboutNode
import __ANDROID_PACKAGE__.about.AboutViewModel
import __ANDROID_PACKAGE__.about.LicenseNode
import __ANDROID_PACKAGE__.about.LicenseViewModel
import __ANDROID_PACKAGE__.sample.SampleDetailNode
import __ANDROID_PACKAGE__.sample.SampleDetailViewModel
import __ANDROID_PACKAGE__.sample.SampleNode
import __ANDROID_PACKAGE__.sample.SampleService
import __ANDROID_PACKAGE__.sample.SampleViewModel
import java.net.URI
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/** Every external dependency of Core (R4). Mobile passes real implementations, Host fixture ones. */
class Services(val sample: SampleService)

sealed interface Route {
    data object Sample : Route
    data class SampleDetail(val id: String) : Route
    data object License : Route

    companion object {
        /** Deep links resolve in Core (R16). The scheme is ignored so every app can keep its own. */
        fun parse(url: String): Route? {
            val uri = runCatching { URI(url) }.getOrNull() ?: return null
            val parts = listOfNotNull(uri.host) + (uri.path ?: "").split("/").filter { it.isNotEmpty() }
            return when {
                parts.isEmpty() -> Sample
                parts.size == 2 && parts[0] == "detail" -> SampleDetail(parts[1])
                parts == listOf("license") -> License
                else -> null
            }
        }
    }
}

fun interface Router {
    fun go(route: Route)
}

/** The single entry point (R3): builds everything and is the root node. Effects run in [scope]. */
class AppCore(private val services: Services, private val scope: CoroutineScope) : IntrospectionNode, Router {
    // App → Modal → Tabs → { sample: Stack → Sample…, about: About }
    val stack = StackNavigator()
    val tabs = TabNavigator()
    val modal = ModalNavigator(base = tabs)

    init {
        stack.reset(listOf(sample()))
        tabs.reset(listOf("sample" to stack, "about" to AboutNode(AboutViewModel(this))))
    }

    override fun go(route: Route) = when (route) {
        Route.Sample -> stack.reset(listOf(sample()))
        is Route.SampleDetail -> stack.push(SampleDetailNode(SampleDetailViewModel(route.id)))
        Route.License -> modal.present(LicenseNode(LicenseViewModel()))
    }

    /** Opens a deep link with the same stack the user would have reached by hand. Returns false for unknown links. */
    fun open(url: String): Boolean {
        val route = Route.parse(url) ?: return false
        when (route) {
            Route.Sample -> stack.reset(listOf(sample()))
            is Route.SampleDetail -> stack.reset(listOf(sample(), SampleDetailNode(SampleDetailViewModel(route.id))))
            Route.License -> {
                tabs.select("about")
                modal.present(LicenseNode(LicenseViewModel()))
            }
        }
        return true
    }

    private fun sample() = SampleNode(SampleViewModel(services.sample, this, EffectRunner(scope)))

    override val name = "App"
    override fun state(): JsonElement = JsonObject(emptyMap())
    override val child: IntrospectionNode get() = modal
}
