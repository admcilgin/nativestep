package dev.nativestep.basket.basket

import dev.nativestep.basket.app.Router
import dev.nativestep.kit.AppError
import dev.nativestep.kit.Effect
import dev.nativestep.kit.EffectRunner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.Serializable

/** The basket tab. AppCore keeps one for its lifetime; the basket survives sign-out as on the reference (memory.md). */
class BasketViewModel(
    private val orders: OrderService,
    private val router: Router,
    internal val effects: EffectRunner,
) {
    @Serializable
    data class Line(val productId: String, val name: String, val priceCents: Int, val quantity: Int)

    @Serializable
    data class State(
        val lines: List<Line> = emptyList(),
        val count: Int = 0,
        val totalCents: Int = 0,
        val placing: Boolean = false,
        val error: AppError? = null,
    )

    sealed interface Action {
        data class Add(val productId: String, val name: String, val priceCents: Int) : Action
        data class AddOne(val productId: String) : Action
        data class RemoveOne(val productId: String) : Action
        data object PlaceOrder : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class Placed(val result: Result<PlacedOrder>) : Message
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
            is Action.Add -> {
                val current = _state.value.lines
                setLines(
                    if (current.any { it.productId == action.productId }) {
                        current.map { if (it.productId == action.productId) it.copy(quantity = it.quantity + 1) else it }
                    } else {
                        current + Line(action.productId, action.name, action.priceCents, 1)
                    },
                )
                emptyList()
            }
            is Action.AddOne -> {
                setLines(_state.value.lines.map { if (it.productId == action.productId) it.copy(quantity = it.quantity + 1) else it })
                emptyList()
            }
            // The line goes when its quantity reaches zero.
            is Action.RemoveOne -> {
                setLines(
                    _state.value.lines
                        .map { if (it.productId == action.productId) it.copy(quantity = it.quantity - 1) else it }
                        .filter { it.quantity > 0 },
                )
                emptyList()
            }
            Action.PlaceOrder ->
                if (_state.value.lines.isEmpty() || _state.value.placing) emptyList() else {
                    _state.update { it.copy(placing = true) }
                    val items = _state.value.lines.map { OrderItem(it.productId, it.quantity) }
                    listOf(suspend { Message.Placed(orders.place(items)) })
                }
        }
        is Message.Placed -> {
            message.result
                .onSuccess { order ->
                    _state.update { it.copy(placing = false, error = null) }
                    setLines(emptyList())
                    router.orderPlaced(order.id)
                }
                .onFailure { e -> _state.update { it.copy(placing = false, error = AppError.from(e)) } }
            emptyList()
        }
    }

    /** Count and total follow the lines. */
    private fun setLines(lines: List<Line>) = _state.update {
        it.copy(lines = lines, count = lines.sumOf { l -> l.quantity }, totalCents = lines.sumOf { l -> l.priceCents * l.quantity })
    }
}
