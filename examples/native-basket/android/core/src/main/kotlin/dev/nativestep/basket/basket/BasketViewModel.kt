package dev.nativestep.basket.basket

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/** The basket tab. Empty until the basket feature fills it. */
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

    sealed interface Action

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) {}
}
