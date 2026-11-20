package dev.nativestep.basket.app

import dev.nativestep.basket.auth.AuthService
import dev.nativestep.basket.auth.LoginNode
import dev.nativestep.basket.auth.LoginViewModel
import dev.nativestep.basket.auth.User
import dev.nativestep.basket.basket.BasketNode
import dev.nativestep.basket.basket.BasketViewModel
import dev.nativestep.basket.catalog.ProductDetailNode
import dev.nativestep.basket.catalog.ProductDetailViewModel
import dev.nativestep.basket.catalog.ProductListNode
import dev.nativestep.basket.catalog.ProductListViewModel
import dev.nativestep.basket.catalog.ProductService
import dev.nativestep.kit.EffectRunner
import dev.nativestep.kit.IntrospectionNode
import dev.nativestep.kit.ModalNavigator
import dev.nativestep.kit.StackNavigator
import dev.nativestep.kit.TabNavigator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/** Every external dependency of Core (R4). Mobile passes real implementations, Host fixture ones. */
class Services(val auth: AuthService, val products: ProductService)

sealed interface Route {
    data class Product(val id: String) : Route
}

/** What screens ask of the shell. Signing in changes the session, so it is a call rather than a route. */
interface Router {
    fun signedIn(user: User)
    fun go(route: Route)
}

/**
 * The single entry point (R3): builds everything and is the root node. Effects run in [scope].
 * App → Login while signed out; App → Modal → Tabs → { products: Stack → ProductList, basket: Basket } signed in.
 */
class AppCore(private val services: Services, private val scope: CoroutineScope) : IntrospectionNode, Router {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()
    val login = LoginNode(LoginViewModel(services.auth, this, EffectRunner(scope)))
    val products = StackNavigator()
    val tabs = TabNavigator(popsToRootOnReselect = true)

    /** One detail per product for the session: reopening shows it without fetching again (profile: Caching). */
    private val details = mutableMapOf<String, ProductDetailNode>()
    val modal = ModalNavigator(base = tabs)

    override fun signedIn(user: User) {
        products.reset(listOf(ProductListNode(ProductListViewModel(services.products, this, EffectRunner(scope)))))
        tabs.reset(listOf("products" to products, "basket" to BasketNode(BasketViewModel())))
        _user.value = user
    }

    override fun go(route: Route) {
        when (route) {
            is Route.Product -> products.push(
                details.getOrPut(route.id) { ProductDetailNode(ProductDetailViewModel(route.id, services.products, EffectRunner(scope))) },
            )
        }
    }

    override val name = "App"
    override fun state(): JsonElement = JsonObject(emptyMap())
    override val child: IntrospectionNode get() = if (_user.value == null) login else modal
}
