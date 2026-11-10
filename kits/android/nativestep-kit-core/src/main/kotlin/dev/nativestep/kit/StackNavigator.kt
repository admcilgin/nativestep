package dev.nativestep.kit

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Navigation as state in Core (R14). Views draw [screens]; the stack lends `goBack` (R15). */
class StackNavigator : IntrospectionNode {
    private val _screens = MutableStateFlow<List<IntrospectionNode>>(emptyList())
    val screens: StateFlow<List<IntrospectionNode>> = _screens.asStateFlow()

    fun push(screen: IntrospectionNode) {
        _screens.value = _screens.value + screen
    }

    fun goBack() {
        if (_screens.value.size > 1) _screens.value = _screens.value.dropLast(1)
    }

    fun reset(screens: List<IntrospectionNode>) {
        _screens.value = screens
    }

    override val name = "Stack"
    override fun state(): JsonElement = buildJsonObject { put("depth", _screens.value.size) }
    override val lends: List<NodeAction>
        get() = if (_screens.value.size > 1) listOf(NodeAction("goBack", "Back") { goBack() }) else emptyList()
    override val child: IntrospectionNode? get() = _screens.value.lastOrNull()
}
