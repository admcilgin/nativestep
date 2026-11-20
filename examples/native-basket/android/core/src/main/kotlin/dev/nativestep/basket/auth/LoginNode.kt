package dev.nativestep.basket.auth

import dev.nativestep.kit.InputSchema
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeAction
import dev.nativestep.kit.NodeJson
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.encodeToJsonElement

class LoginNode(val vm: LoginViewModel) : IntrospectionNode {
    override val name = "Login"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)
    override val actions: List<NodeAction>
        get() = if (vm.state.value.loading) emptyList() else listOf(
            NodeAction("signIn", "Sign in", SignInInput.serializer(), SignInInput.schema) {
                vm.send(LoginViewModel.Action.SignIn(it.email, it.password))
            },
        )
}

@Serializable
data class SignInInput(val email: String, val password: String) {
    companion object {
        val schema = InputSchema.obj("email" to InputSchema.string(), "password" to InputSchema.string())
    }
}
