package dev.nativestep.basket.catalog

import kotlinx.serialization.Serializable

@Serializable
data class Product(val id: String, val name: String, val priceCents: Int, val description: String? = null)

/** Names and parameters match the fixtures and the iOS service exactly (R5). */
interface ProductService {
    suspend fun list(): Result<List<Product>>
}
