package dev.nativestep.basket.catalog

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class ProductListNode(val vm: ProductListViewModel) : IntrospectionNode {
    override val name = "ProductList"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
}
