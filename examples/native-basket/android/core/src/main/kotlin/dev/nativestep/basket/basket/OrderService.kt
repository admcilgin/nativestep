package dev.nativestep.basket.basket

import kotlinx.serialization.Serializable

@Serializable
data class OrderItem(val productId: String, val quantity: Int)

@Serializable
data class PlacedOrder(val id: String)

/** Names and parameters match the fixtures and the iOS service exactly (R5). */
interface OrderService {
    suspend fun place(items: List<OrderItem>): Result<PlacedOrder>
}
