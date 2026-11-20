package dev.nativestep.basket.basket

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/** The "Order placed" dialog, presented by the modal navigator; `dismiss` (its OK button) is lent by it. */
class OrderPlacedViewModel(orderId: String) {
    @Serializable
    data class State(val orderId: String)

    private val _state = MutableStateFlow(State(orderId))
    val state: StateFlow<State> = _state.asStateFlow()
}
