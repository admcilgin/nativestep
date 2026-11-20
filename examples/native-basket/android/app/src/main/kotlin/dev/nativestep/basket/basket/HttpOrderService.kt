package dev.nativestep.basket.basket

import dev.nativestep.basket.shared.ApiClient
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class HttpOrderService : OrderService {
    @Serializable
    private data class Body(val items: List<OrderItem>)

    override suspend fun place(items: List<OrderItem>): Result<PlacedOrder> =
        ApiClient.send("POST", "orders", PlacedOrder.serializer(), Json.encodeToString(Body.serializer(), Body(items)))
}
