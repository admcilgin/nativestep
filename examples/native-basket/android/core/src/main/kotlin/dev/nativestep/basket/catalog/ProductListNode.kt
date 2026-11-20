package dev.nativestep.basket.catalog

import dev.nativestep.kit.InputSchema
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class ProductListNode(val vm: ProductListViewModel) : IntrospectionNode {
    override val name = "ProductList"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)

    /**
     * `search`, `openProduct` for the products shown and `refresh` while the list is shown, `retry` while the error is;
     * nothing during the first load or a retry. `signOut` is always there.
     */
    override val actions: List<NodeAction>
        get() = listActions() + NodeAction("signOut", "Sign out") { vm.send(ProductListViewModel.Action.SignOut) }

    private fun listActions(): List<NodeAction> {
        val s = vm.state.value
        return when {
            vm.listShown -> {
                val ids = s.results.map { it.id }
                val search = NodeAction("search", "Search", SearchInput.serializer(), InputSchema.obj("query" to InputSchema.string())) {
                    vm.send(ProductListViewModel.Action.Search(it.query))
                }
                val open = NodeAction("openProduct", "Open product", OpenProductInput.serializer(),
                    InputSchema.obj("id" to InputSchema.string(oneOf = ids))) { vm.send(ProductListViewModel.Action.OpenProduct(it.id)) }
                listOf(search) + (if (ids.isEmpty()) emptyList() else listOf(open)) +
                    NodeAction("refresh", "Refresh") { vm.send(ProductListViewModel.Action.Refresh) }
            }
            s.error != null && !s.loading -> listOf(NodeAction("retry", "Retry") { vm.send(ProductListViewModel.Action.Retry) })
            else -> emptyList()
        }
    }
}

@Serializable
data class OpenProductInput(val id: String)

@Serializable
data class SearchInput(val query: String)
