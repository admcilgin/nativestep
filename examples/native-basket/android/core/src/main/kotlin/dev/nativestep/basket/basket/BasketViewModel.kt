package dev.nativestep.basket.basket

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/** The basket tab. AppCore keeps one for its lifetime; the basket survives sign-out as on the reference (memory.md). */
class BasketViewModel {
    @Serializable
    data class Line(val productId: String, val name: String, val priceCents: Int, val quantity: Int)

    @Serializable
    data class State(
        val lines: List<Line> = emptyList(),
        val count: Int = 0,
        val totalCents: Int = 0,
        val placing: Boolean = false,
    )

    sealed interface Action {
        data class Add(val productId: String, val name: String, val priceCents: Int) : Action
        data class AddOne(val productId: String) : Action
        data class RemoveOne(val productId: String) : Action
    }

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) = update(action)

    /** State changes only here (R8). No effects yet: placing an order (basket cp3) adds the first. */
    private fun update(action: Action) {
        val lines = when (action) {
            is Action.Add -> {
                val current = _state.value.lines
                if (current.any { it.productId == action.productId }) {
                    current.map { if (it.productId == action.productId) it.copy(quantity = it.quantity + 1) else it }
                } else {
                    current + Line(action.productId, action.name, action.priceCents, 1)
                }
            }
            is Action.AddOne -> _state.value.lines.map { if (it.productId == action.productId) it.copy(quantity = it.quantity + 1) else it }
            // The line goes when its quantity reaches zero.
            is Action.RemoveOne -> _state.value.lines
                .map { if (it.productId == action.productId) it.copy(quantity = it.quantity - 1) else it }
                .filter { it.quantity > 0 }
        }
        _state.value = _state.value.copy(
            lines = lines,
            count = lines.sumOf { it.quantity },
            totalCents = lines.sumOf { it.priceCents * it.quantity },
        )
    }
}
