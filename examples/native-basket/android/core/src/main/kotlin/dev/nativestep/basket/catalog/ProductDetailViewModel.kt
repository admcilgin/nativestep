package dev.nativestep.basket.catalog

import dev.nativestep.kit.AppError
import dev.nativestep.kit.Effect
import dev.nativestep.kit.EffectRunner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

/** One product's page. AppCore keeps one per id for the session, so a product is fetched once (profile: Caching). */
class ProductDetailViewModel(
    id: String,
    private val products: ProductService,
    internal val effects: EffectRunner,
) {
    @Serializable
    data class Item(val id: String, val name: String, val priceCents: Int, val description: String)

    @Serializable
    data class State(val id: String, val product: Item? = null, val loading: Boolean = false, val error: AppError? = null)

    sealed interface Action {
        data object Load : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class Loaded(val result: Result<Product>) : Message
    }

    private val _state = MutableStateFlow(State(id))
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
        is Message.Act ->
            if (_state.value.loading) emptyList() else {
                _state.update { it.copy(loading = true, error = null) }
                val id = _state.value.id
                listOf(suspend { Message.Loaded(products.detail(id)) })
            }
        is Message.Loaded -> {
            message.result
                // The source reads a missing description as "".
                .onSuccess { p -> _state.update { it.copy(loading = false, product = Item(p.id, p.name, p.priceCents, p.description ?: "")) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = AppError.from(e)) } }
            emptyList()
        }
    }
}
