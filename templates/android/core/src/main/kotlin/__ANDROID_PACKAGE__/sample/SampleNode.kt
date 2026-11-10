package __ANDROID_PACKAGE__.sample

import dev.nativestep.kit.InputSchema
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import __ANDROID_PACKAGE__.sample.SampleViewModel.Action
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class SampleNode(val vm: SampleViewModel) : IntrospectionNode {
    override val name = "Sample"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
    override val actions = listOf(
        NodeAction("increment", "Increment") { vm.send(Action.Increment) },
        NodeAction("decrement", "Decrement") { vm.send(Action.Decrement) },
        NodeAction("set", "Set count", SetInput.serializer(), SetInput.schema) { vm.send(Action.SetCount(it.value)) },
        NodeAction("load", "Load items") { vm.send(Action.Load) },
        NodeAction("openDetail", "Open item", OpenDetailInput.serializer(), OpenDetailInput.schema) {
            vm.send(Action.OpenDetail(it.id))
        },
        NodeAction("_probeNetwork", "Probe the network guard") { vm.send(Action.ProbeNetwork) },
    )
}

@Serializable
data class SetInput(val value: Int) {
    companion object {
        val schema = InputSchema.obj("value" to InputSchema.integer(minimum = 0))
    }
}

@Serializable
data class OpenDetailInput(val id: String) {
    companion object {
        val schema = InputSchema.obj("id" to InputSchema.string(minLength = 1))
    }
}
