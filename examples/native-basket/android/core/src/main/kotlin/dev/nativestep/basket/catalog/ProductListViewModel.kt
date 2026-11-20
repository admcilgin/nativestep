package dev.nativestep.basket.catalog

import dev.nativestep.basket.app.Route
import dev.nativestep.basket.app.Router
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
    private val router: Router,
    internal val effects: EffectRunner,
) {
    @Serializable
    data class Item(val id: String, val name: String, val priceCents: Int)

    @Serializable
    data class State(
        val products: List<Item> = emptyList(),
        /** The search as typed, and the products it shows, in catalog order (docs/features/search.md). */
        val query: String = "",
        val results: List<Item> = emptyList(),
        val loading: Boolean = false,
        val error: AppError? = null,
    )

    sealed interface Action {
        data object Load : Action
        data object Refresh : Action
        data object Retry : Action
        data class OpenProduct(val id: String) : Action
        data class Search(val query: String) : Action
        data object SignOut : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class Loaded(val result: Result<List<Product>>) : Message
    }

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    /** True while a loaded list is on screen, empty or not, refreshing or not. Decides `refresh` against no action. */
    var listShown = false
        private set

    init {
        send(Action.Load)
    }

    fun send(action: Action) = handle(Message.Act(action))

    private fun handle(message: Message) {
        update(message).forEach { effect -> effects.run(effect) { handle(it) } }
    }

    /** State changes only here (R8). The results follow the products and the search after every message. */
    private fun update(message: Message): List<Effect<Message>> = step(message).also {
        _state.update { s ->
            val text = s.query.trim()
            s.copy(results = if (text.isEmpty()) s.products else s.products.filter { it.name.contains(text, ignoreCase = true) })
        }
    }

    private fun step(message: Message): List<Effect<Message>> = when (message) {
        is Message.Act -> when (val action = message.action) {
            is Action.Search -> {
                _state.update { it.copy(query = action.query) }
                emptyList()
            }
            is Action.OpenProduct -> {
                router.go(Route.Product(action.id))
                emptyList()
            }
            Action.SignOut -> {
                router.signOut()
                emptyList()
            }
            // Load (on creation), Refresh (list shown, keeps it) and Retry (after an error) all reload.
            else ->
                if (_state.value.loading) emptyList() else {
                    _state.update { it.copy(loading = true, error = null) }
                    listOf(suspend { Message.Loaded(products.list()) })
                }
        }
        is Message.Loaded -> {
            message.result
                .onSuccess { list ->
                    listShown = true
                    _state.update { s -> s.copy(loading = false, products = list.map { Item(it.id, it.name, it.priceCents) }) }
                }
                // The reference shows the error alone, also when a refresh fails.
                .onFailure { e ->
                    listShown = false
                    _state.update { it.copy(loading = false, error = AppError.from(e), products = emptyList()) }
                }
            emptyList()
        }
    }
}
