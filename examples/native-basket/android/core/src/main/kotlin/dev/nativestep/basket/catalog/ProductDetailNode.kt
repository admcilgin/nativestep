package dev.nativestep.basket.catalog

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

/** `addToBasket` comes with basket cp1. */
class ProductDetailNode(val vm: ProductDetailViewModel) : IntrospectionNode {
    override val name = "ProductDetail"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
}
