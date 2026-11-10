package dev.nativestep.kit

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * A modal over [base] as state in Core (R14). While a node is presented it is the child, so [base] and
 * everything it lends are out of reach; the modal lends `dismiss` (R15).
 */
class ModalNavigator(val base: IntrospectionNode) : IntrospectionNode {
    private val _presented = MutableStateFlow<IntrospectionNode?>(null)
    val presented: StateFlow<IntrospectionNode?> = _presented.asStateFlow()

    fun present(node: IntrospectionNode) {
        _presented.value = node
    }

    fun dismiss() {
        _presented.value = null
    }

    override val name = "Modal"
    override fun state(): JsonElement = buildJsonObject { put("presented", _presented.value != null) }
    override val lends: List<NodeAction>
        get() = if (_presented.value != null) listOf(NodeAction("dismiss", "Dismiss") { dismiss() }) else emptyList()
    override val child: IntrospectionNode get() = _presented.value ?: base
}
