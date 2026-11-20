package dev.nativestep.basket.app

import dev.nativestep.basket.auth.AuthService
import dev.nativestep.basket.auth.LoginNode
import dev.nativestep.basket.auth.LoginViewModel
import dev.nativestep.basket.auth.User
import dev.nativestep.basket.basket.BasketNode
import dev.nativestep.basket.basket.BasketViewModel
import dev.nativestep.basket.basket.OrderPlacedNode
import dev.nativestep.basket.basket.OrderPlacedViewModel
import dev.nativestep.basket.basket.OrderService
import dev.nativestep.basket.catalog.Product
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
class Services(val auth: AuthService, val products: ProductService, val orders: OrderService)

sealed interface Route {
    data class Product(val id: String) : Route
}

/** What screens ask of the shell. Signing in changes the session, so it is a call rather than a route. */
interface Router {
    fun signedIn(user: User)
    fun signOut()
    fun go(route: Route)

    /** Catalog hands a product to the basket through the shell, so catalog does not depend on basket. */
    fun addToBasket(product: Product)

    /** Shows the "Order placed" dialog over the tabs. */
    fun orderPlaced(id: String)
}

/**
 * The single entry point (R3): builds everything and is the root node. Effects run in [scope].
 * App → Login while signed out; App → Modal → Tabs → { products: Stack → ProductList, basket: Basket } signed in,
 * with OrderPlaced presented on the Modal after an order.
 */
class AppCore(private val services: Services, private val scope: CoroutineScope) : IntrospectionNode, Router {
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()
    private val _login = MutableStateFlow(newLogin())
    val login: StateFlow<LoginNode> = _login.asStateFlow()
    val products = StackNavigator()
    val tabs = TabNavigator(popsToRootOnReselect = true)

    /**
     * The list, the basket and one detail per product live as long as AppCore, across sign-out, as the reference's
     * providers do (profile: Caching): signing in again shows them without fetching again.
     */
    private val details = mutableMapOf<String, ProductDetailNode>()
    private val productList by lazy { ProductListNode(ProductListViewModel(services.products, this, EffectRunner(scope))) }
    private val basket = BasketNode(BasketViewModel(services.orders, this, EffectRunner(scope)))
    val modal = ModalNavigator(base = tabs)

    override fun signedIn(user: User) {
        products.reset(listOf(productList))
        tabs.reset(listOf("products" to products, "basket" to basket))
        _user.value = user
    }

    /** Back to a clean sign-in form (memory.md, "Login after sign-in"). */
    override fun signOut() {
        _login.value = newLogin()
        _user.value = null
    }

    private fun newLogin() = LoginNode(LoginViewModel(services.auth, this, EffectRunner(scope)))

    override fun go(route: Route) {
        when (route) {
            // A page whose load failed is built again, so reopening the product tries again (memory.md).
            is Route.Product -> products.push(
                details[route.id]?.takeIf { it.vm.state.value.error == null }
                    ?: ProductDetailNode(ProductDetailViewModel(route.id, services.products, this, EffectRunner(scope))).also { details[route.id] = it },
            )
        }
    }

    override fun addToBasket(product: Product) {
        basket.vm.send(BasketViewModel.Action.Add(product.id, product.name, product.priceCents))
    }

    override fun orderPlaced(id: String) = modal.present(OrderPlacedNode(OrderPlacedViewModel(id)))

    override val name = "App"
    override fun state(): JsonElement = JsonObject(emptyMap())
    override val child: IntrospectionNode get() = if (_user.value == null) _login.value else modal
}
