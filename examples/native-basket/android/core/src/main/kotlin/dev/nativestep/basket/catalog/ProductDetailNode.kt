package dev.nativestep.basket.catalog

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

/** `addToBasket` only while the product shows. */
class ProductDetailNode(val vm: ProductDetailViewModel) : IntrospectionNode {
    override val name = "ProductDetail"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
    override val actions: List<NodeAction>
        get() = if (vm.state.value.product == null) emptyList()
        else listOf(NodeAction("addToBasket", "Add to basket") { vm.send(ProductDetailViewModel.Action.AddToBasket) })
}
