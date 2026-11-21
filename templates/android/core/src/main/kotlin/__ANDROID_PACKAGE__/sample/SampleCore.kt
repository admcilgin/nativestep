package __ANDROID_PACKAGE__.sample

import dev.nativestep.kit.EffectRunner
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.ModalNavigator
import dev.nativestep.kit.StackNavigator
import dev.nativestep.kit.TabNavigator
import __ANDROID_PACKAGE__.about.AboutNode
import __ANDROID_PACKAGE__.about.AboutViewModel
import __ANDROID_PACKAGE__.about.LicenseNode
import __ANDROID_PACKAGE__.about.LicenseViewModel
import java.net.URI
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

sealed interface SampleRoute {
    data object Sample : SampleRoute
    data class SampleDetail(val id: String) : SampleRoute
    data object License : SampleRoute

    companion object {
        /** Deep links resolve in Core (R16). The scheme is ignored so every app can keep its own. */
        fun parse(url: String): SampleRoute? {
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

fun interface SampleRouter {
    fun go(route: SampleRoute)
}

/**
 * The template's app shell, kept for the conformance tests (`_sample`) until the migration ends (COMPONENTS.md §6).
 * The host builds it for sessions with the `conformance` flag; the app itself never does. Effects run in [scope].
 */
class SampleCore(private val sampleService: SampleService, private val scope: CoroutineScope) : IntrospectionNode, SampleRouter {
    // App → Modal → Tabs → { sample: Stack → Sample…, about: About }
    val stack = StackNavigator()
    val tabs = TabNavigator()
    val modal = ModalNavigator(base = tabs)

    init {
        stack.reset(listOf(sample()))
        tabs.reset(listOf("sample" to stack, "about" to AboutNode(AboutViewModel(this))))
    }

    override fun go(route: SampleRoute) = when (route) {
        SampleRoute.Sample -> stack.reset(listOf(sample()))
        is SampleRoute.SampleDetail -> stack.push(SampleDetailNode(SampleDetailViewModel(route.id)))
        SampleRoute.License -> modal.present(LicenseNode(LicenseViewModel()))
    }

    /** Opens a deep link with the same stack the user would have reached by hand. Returns false for unknown links. */
    fun open(url: String): Boolean {
        val route = SampleRoute.parse(url) ?: return false
        when (route) {
            SampleRoute.Sample -> stack.reset(listOf(sample()))
            is SampleRoute.SampleDetail -> stack.reset(listOf(sample(), SampleDetailNode(SampleDetailViewModel(route.id))))
            SampleRoute.License -> {
                tabs.select("about")
                modal.present(LicenseNode(LicenseViewModel()))
            }
        }
        return true
    }

    private fun sample() = SampleNode(SampleViewModel(sampleService, this, EffectRunner(scope)))

    override val name = "App"
    override fun state(): JsonElement = JsonObject(emptyMap())
    override val child: IntrospectionNode get() = modal
}
