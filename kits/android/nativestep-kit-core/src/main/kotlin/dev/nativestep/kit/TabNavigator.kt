package dev.nativestep.kit

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Tabs as state in Core (R14). Each tab keeps its own node, often a [StackNavigator]; the tabs lend `selectTab` (R15). */
/** [popsToRootOnReselect]: selecting the selected tab again returns its stack to the first screen, as both platforms' tab bars do. */
class TabNavigator(private val popsToRootOnReselect: Boolean = false) : IntrospectionNode {
    private val _tabs = MutableStateFlow<List<Pair<String, IntrospectionNode>>>(emptyList())
    val tabs: StateFlow<List<Pair<String, IntrospectionNode>>> = _tabs.asStateFlow()
    private val _selected = MutableStateFlow("")
    val selected: StateFlow<String> = _selected.asStateFlow()

    fun reset(tabs: List<Pair<String, IntrospectionNode>>, selected: String? = null) {
        _tabs.value = tabs
        _selected.value = selected ?: tabs.firstOrNull()?.first ?: ""
    }

    fun select(id: String) {
        val tab = _tabs.value.firstOrNull { it.first == id } ?: return
        val stack = tab.second as? StackNavigator
        if (id == _selected.value && popsToRootOnReselect && stack != null) {
            stack.screens.value.firstOrNull()?.let { stack.reset(listOf(it)) }
        }
        _selected.value = id
    }

    @Serializable
    private data class SelectTab(val tab: String)

    override val name = "Tabs"
    override fun state(): JsonElement = buildJsonObject { put("selected", _selected.value) }
    override val lends: List<NodeAction>
        get() = listOf(
            NodeAction("selectTab", "Select tab", SelectTab.serializer(),
                InputSchema.obj("tab" to InputSchema.string(oneOf = _tabs.value.map { it.first }))) { select(it.tab) },
        )
    override val child: IntrospectionNode? get() = _tabs.value.firstOrNull { it.first == _selected.value }?.second
}
