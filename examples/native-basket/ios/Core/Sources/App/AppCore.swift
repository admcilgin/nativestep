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
    func go(_ route: Route)
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
    /// One detail per product for the session: reopening shows it without fetching again (profile: Caching).
    private var details: [String: ProductDetailViewModel] = [:]

    public init(services: Services) {
        self.services = services
        modal = ModalNavigator(base: tabs)
        login = LoginViewModel(auth: services.auth, router: self)
    }

    public func signedIn(_ user: User) {
        self.user = user
        login = nil
        products.reset(to: [ProductListViewModel(products: services.products, router: self)])
        tabs.reset(to: [("products", products), ("basket", BasketViewModel())])
    }

    public func go(_ route: Route) {
        switch route {
        case .product(let id):
            let detail = details[id] ?? ProductDetailViewModel(id: id, products: services.products)
            details[id] = detail
            products.push(detail)
        }
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "App", state: [String: Int](), child: user == nil ? login?.introspectionNode : modal.introspectionNode)
    }
}
