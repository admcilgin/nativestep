package dev.nativestep.basket.basket

import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class BasketNode(val vm: BasketViewModel) : IntrospectionNode {
    override val name = "Basket"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
}
