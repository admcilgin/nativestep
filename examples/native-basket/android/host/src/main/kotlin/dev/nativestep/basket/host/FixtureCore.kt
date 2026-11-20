package dev.nativestep.basket.host

import dev.nativestep.basket.app.AppCore
import dev.nativestep.basket.app.Services
import dev.nativestep.basket.auth.AuthService
import dev.nativestep.basket.auth.User
import dev.nativestep.basket.basket.OrderItem
import dev.nativestep.basket.basket.OrderService
import dev.nativestep.basket.basket.PlacedOrder
import dev.nativestep.basket.catalog.Product
import dev.nativestep.basket.catalog.ProductService
import dev.nativestep.basket.sample.SampleCore
import dev.nativestep.basket.sample.SampleList
import dev.nativestep.basket.sample.SampleService
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.NodeJson
import dev.nativestep.kit.host.FixtureStore
import dev.nativestep.kit.host.ProtocolError
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.encodeToJsonElement

/** The headless host's root: the conformance core for `_sample` sessions (COMPONENTS.md §6), the app otherwise. */
fun hostRoot(fixtures: FixtureStore, route: String?, scope: CoroutineScope): IntrospectionNode {
    if (fixtures.flags["conformance"] != JsonPrimitive(true)) return fixtureCore(fixtures, route, scope)
    val core = SampleCore(FixtureSampleService(fixtures), scope)
    if (route != null && !core.open(route)) throw ProtocolError("bad_request", "no screen for route $route")
    return core
}

/** Builds Core with fixture services (R3). Used by the headless host and the debug app. Basket has no deep links. */
fun fixtureCore(fixtures: FixtureStore, route: String?, scope: CoroutineScope): AppCore {
    if (route != null) throw ProtocolError("bad_request", "Basket has no deep links; got $route")
    return AppCore(Services(auth = FixtureAuthService(fixtures), products = FixtureProductService(fixtures), orders = FixtureOrderService(fixtures)), scope)
}

class FixtureSampleService(private val fixtures: FixtureStore) : SampleService {
    override suspend fun list(page: Int): Result<SampleList> =
        fixtures.call("SampleService", "list", "page" to JsonPrimitive(page))
}

class FixtureAuthService(private val fixtures: FixtureStore) : AuthService {
    override suspend fun signIn(email: String, password: String): Result<User> =
        fixtures.call("AuthService", "signIn", "email" to JsonPrimitive(email), "password" to JsonPrimitive(password))
}

class FixtureProductService(private val fixtures: FixtureStore) : ProductService {
    override suspend fun list(): Result<List<Product>> = fixtures.call("ProductService", "list")
    override suspend fun detail(id: String): Result<Product> = fixtures.call("ProductService", "detail", "id" to JsonPrimitive(id))
}

class FixtureOrderService(private val fixtures: FixtureStore) : OrderService {
    override suspend fun place(items: List<OrderItem>): Result<PlacedOrder> =
        fixtures.call("OrderService", "place", "items" to NodeJson.encodeToJsonElement(items))
}
