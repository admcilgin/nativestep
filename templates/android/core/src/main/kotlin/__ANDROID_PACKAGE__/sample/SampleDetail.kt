package __ANDROID_PACKAGE__.sample

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeJson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class SampleDetailViewModel(id: String) {
    @Serializable
    data class State(val id: String)

    /** No actions of its own; `goBack` is lent by the stack. */
    sealed interface Action

    private val _state = MutableStateFlow(State(id))
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) {}
}

class SampleDetailNode(val vm: SampleDetailViewModel) : IntrospectionNode {
    override val name = "SampleDetail"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
}
