package dev.nativestep.basket.catalog

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class ProductListNode(val vm: ProductListViewModel) : IntrospectionNode {
    override val name = "ProductList"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)

    /** `refresh` while the list is shown, `retry` while the error is; nothing during the first load or a retry. */
    override val actions: List<NodeAction>
        get() {
            val s = vm.state.value
            return when {
                vm.listShown -> listOf(NodeAction("refresh", "Refresh") { vm.send(ProductListViewModel.Action.Refresh) })
                s.error != null && !s.loading -> listOf(NodeAction("retry", "Retry") { vm.send(ProductListViewModel.Action.Retry) })
                else -> emptyList()
            }
        }
}
