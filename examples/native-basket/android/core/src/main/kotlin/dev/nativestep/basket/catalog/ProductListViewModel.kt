package dev.nativestep.basket.catalog

import dev.nativestep.kit.AppError
import dev.nativestep.kit.Effect
import dev.nativestep.kit.EffectRunner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

/** The products tab's first screen. It loads the list as soon as it exists, as the reference does when it is shown. */
class ProductListViewModel(
    private val products: ProductService,
    internal val effects: EffectRunner,
) {
    @Serializable
    data class Item(val id: String, val name: String, val priceCents: Int)

    @Serializable
    data class State(
        val products: List<Item> = emptyList(),
        val loading: Boolean = false,
        val error: AppError? = null,
    )

    sealed interface Action {
        data object Load : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class Loaded(val result: Result<List<Product>>) : Message
    }

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    init {
        send(Action.Load)
    }

    fun send(action: Action) = handle(Message.Act(action))

    private fun handle(message: Message) {
        update(message).forEach { effect -> effects.run(effect) { handle(it) } }
    }

    /** State changes only here (R8). */
    private fun update(message: Message): List<Effect<Message>> = when (message) {
        is Message.Act -> when (message.action) {
            Action.Load ->
                if (_state.value.loading) emptyList() else {
                    _state.update { it.copy(loading = true, error = null) }
                    listOf(suspend { Message.Loaded(products.list()) })
                }
        }
        is Message.Loaded -> {
            message.result
                .onSuccess { list ->
                    _state.update { s -> s.copy(loading = false, products = list.map { Item(it.id, it.name, it.priceCents) }) }
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = AppError.from(e)) } }
            emptyList()
        }
    }
}
