package dev.nativestep.basket.basket

import dev.nativestep.kit.InputSchema
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

/** `addOne` and `removeOne` for the lines on screen, `placeOrder` unless one is being placed; nothing on an empty basket. */
class BasketNode(val vm: BasketViewModel) : IntrospectionNode {
    override val name = "Basket"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
    override val actions: List<NodeAction>
        get() {
            val lines = vm.state.value.lines
            if (lines.isEmpty()) return emptyList()
            val line = InputSchema.obj("productId" to InputSchema.string(oneOf = lines.map { it.productId }))
            return listOf(
                NodeAction("addOne", "Add one", LineInput.serializer(), line) { vm.send(BasketViewModel.Action.AddOne(it.productId)) },
                NodeAction("removeOne", "Remove one", LineInput.serializer(), line) { vm.send(BasketViewModel.Action.RemoveOne(it.productId)) },
            ) + if (vm.state.value.placing) emptyList() else listOf(NodeAction("placeOrder", "Place order") { vm.send(BasketViewModel.Action.PlaceOrder) })
        }
}

@Serializable
data class LineInput(val productId: String)
