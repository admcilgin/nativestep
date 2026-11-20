package dev.nativestep.basket.catalog

import dev.nativestep.basket.shared.ApiClient
import kotlinx.serialization.builtins.ListSerializer

class HttpProductService : ProductService {
    override suspend fun list(): Result<List<Product>> = ApiClient.send("GET", "products", ListSerializer(Product.serializer()))
    override suspend fun detail(id: String): Result<Product> = ApiClient.send("GET", "products/$id", Product.serializer())
}
