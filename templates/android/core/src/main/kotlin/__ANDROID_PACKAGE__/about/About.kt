package __ANDROID_PACKAGE__.about

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import __ANDROID_PACKAGE__.app.Route
import __ANDROID_PACKAGE__.app.Router
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

/** The second tab. Opens the license as a modal. */
class AboutViewModel(private val router: Router) {
    @Serializable
    class State

    sealed interface Action {
        data object OpenLicense : Action
    }

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) = when (action) {
        Action.OpenLicense -> router.go(Route.License)
    }
}

class AboutNode(val vm: AboutViewModel) : IntrospectionNode {
    override val name = "About"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
    override val actions get() = listOf(NodeAction("openLicense", "Show license") { vm.send(AboutViewModel.Action.OpenLicense) })
}

/** Presented by the modal navigator; `dismiss` is lent by it. */
class LicenseViewModel {
    @Serializable
    class State

    sealed interface Action

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) {}
}

class LicenseNode(val vm: LicenseViewModel) : IntrospectionNode {
    override val name = "License"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
}
