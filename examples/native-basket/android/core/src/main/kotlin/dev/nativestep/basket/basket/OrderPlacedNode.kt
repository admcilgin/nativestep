package dev.nativestep.basket.basket

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class OrderPlacedNode(val vm: OrderPlacedViewModel) : IntrospectionNode {
    override val name = "OrderPlaced"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
}
