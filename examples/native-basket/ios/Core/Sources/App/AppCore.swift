import Foundation
import NativeStepKit
import Observation

/// Every external dependency of Core (R4). Mobile passes real implementations, Host fixture ones.
public struct Services {
    public var auth: any AuthService
    public var products: any ProductService

    public init(auth: any AuthService, products: any ProductService) {
        self.auth = auth
        self.products = products
    }
}

public enum Route: Equatable, Sendable {
    case product(id: String)
}

/// What screens ask of the shell. Signing in changes the session, so it is a call rather than a route.
@MainActor
public protocol Router: AnyObject {
    func signedIn(_ user: User)
    func signOut()
    func go(_ route: Route)
    /// Catalog hands a product to the basket through the shell, so catalog does not depend on basket.
    func addToBasket(_ product: Product)
}

/// The single entry point (R3): `AppCore(services:)` builds everything and is the root node.
/// App → Login while signed out; App → Modal → Tabs → { products: Stack → ProductList, basket: Basket } signed in.
@MainActor @Observable
public final class AppCore: Router, IntrospectionNodeProviding {
    public private(set) var user: User?
    public private(set) var login: LoginViewModel?
    public let modal: ModalNavigator
    public let tabs = TabNavigator(popsToRootOnReselect: true)
    public let products = StackNavigator()
    private let services: Services
    /// The list, the basket and one detail per product live as long as AppCore, across sign-out, as the reference's
    /// providers do (profile: Caching): signing in again shows them without fetching again.
    private var details: [String: ProductDetailViewModel] = [:]
    private var productList: ProductListViewModel?
    private let basket = BasketViewModel()

    public init(services: Services) {
        self.services = services
        modal = ModalNavigator(base: tabs)
        login = LoginViewModel(auth: services.auth, router: self)
    }

    public func signedIn(_ user: User) {
        self.user = user
        login = nil
        let list = productList ?? ProductListViewModel(products: services.products, router: self)
        productList = list
        products.reset(to: [list])
        tabs.reset(to: [("products", products), ("basket", basket)])
    }

    /// Back to a clean sign-in form (memory.md, "Login after sign-in").
    public func signOut() {
        user = nil
        login = LoginViewModel(auth: services.auth, router: self)
    }

    public func go(_ route: Route) {
        switch route {
        case .product(let id):
            let detail = details[id] ?? ProductDetailViewModel(id: id, products: services.products, router: self)
            details[id] = detail
            products.push(detail)
        }
    }

    public func addToBasket(_ product: Product) {
        basket.send(.add(productId: product.id, name: product.name, priceCents: product.priceCents))
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "App", state: [String: Int](), child: user == nil ? login?.introspectionNode : modal.introspectionNode)
    }
}
