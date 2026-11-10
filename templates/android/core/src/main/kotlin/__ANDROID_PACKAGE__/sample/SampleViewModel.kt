package __ANDROID_PACKAGE__.sample

import dev.nativestep.kit.AppError
import dev.nativestep.kit.Effect
import dev.nativestep.kit.EffectRunner
import __ANDROID_PACKAGE__.app.Route
import __ANDROID_PACKAGE__.app.Router
import java.net.URI
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

/** The conformance screen. Every target implements the same behavior (COMPONENTS.md §6). */
class SampleViewModel(
    private val sample: SampleService,
    private val router: Router,
    internal val effects: EffectRunner,
) {
    @Serializable
    data class State(
        val count: Int = 0,
        val items: List<SampleItem> = emptyList(),
        val loading: Boolean = false,
        val error: AppError? = null,
    )

    sealed interface Action {
        data object Increment : Action
        data object Decrement : Action
        data class SetCount(val value: Int) : Action
        data object Load : Action
        data class OpenDetail(val id: String) : Action
        data object ProbeNetwork : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class Loaded(val result: Result<SampleList>) : Message
        data object Probed : Message
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
            Action.Increment -> {
                _state.update { it.copy(count = it.count + 1) }
                emptyList()
            }
            Action.Decrement -> {
                _state.update { if (it.count > 0) it.copy(count = it.count - 1) else it }
                emptyList()
            }
            is Action.SetCount -> {
                _state.update { it.copy(count = action.value) }
                emptyList()
            }
            Action.Load ->
                if (_state.value.loading) emptyList() else {
                    _state.update { it.copy(loading = true, error = null) }
                    listOf(suspend { Message.Loaded(sample.list(page = 1)) })
                }
            is Action.OpenDetail -> {
                router.go(Route.SampleDetail(action.id))
                emptyList()
            }
            // Breaks R4 on purpose: a raw request that only the host's network guard can stop.
            Action.ProbeNetwork -> listOf(suspend {
                runCatching { URI("https://example.com/").toURL().openConnection().getInputStream().close() }
                Message.Probed
            })
        }
        is Message.Loaded -> {
            message.result
                .onSuccess { r -> _state.update { it.copy(loading = false, items = r.items) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = AppError.from(e)) } }
            emptyList()
        }
        Message.Probed -> emptyList()
    }
}
