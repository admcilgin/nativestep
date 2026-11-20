package dev.nativestep.basket.auth

import dev.nativestep.basket.app.Router
import dev.nativestep.kit.AppError
import dev.nativestep.kit.Effect
import dev.nativestep.kit.EffectRunner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

class LoginViewModel(
    private val auth: AuthService,
    private val router: Router,
    internal val effects: EffectRunner,
) {
    @Serializable
    data class State(val loading: Boolean = false, val error: AppError? = null)

    sealed interface Action {
        data class SignIn(val email: String, val password: String) : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class SignedIn(val result: Result<User>) : Message
    }

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) = handle(Message.Act(action))

    private fun handle(message: Message) {
        update(message).forEach { effect -> effects.run(effect) { handle(it) } }
    }

    /** State changes only here (R8). */
    private fun update(message: Message): List<Effect<Message>> = when (message) {
        is Message.Act -> when (val action = message.action) {
            is Action.SignIn ->
                if (_state.value.loading) emptyList() else {
                    _state.update { it.copy(loading = true, error = null) }
                    val email = action.email.trim()
                    listOf(suspend { Message.SignedIn(auth.signIn(email = email, password = action.password)) })
                }
        }
        is Message.SignedIn -> {
            message.result
                .onSuccess { user ->
                    _state.update { it.copy(loading = false) }
                    router.signedIn(user)
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = AppError.from(e)) } }
            emptyList()
        }
    }
}
