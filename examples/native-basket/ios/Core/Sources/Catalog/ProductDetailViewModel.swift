import NativeStepKit
import Observation

/// One product's page. AppCore keeps one per id for the session, so a product is fetched once (profile: Caching).
@MainActor @Observable
public final class ProductDetailViewModel {
    public struct Item: Codable, Equatable, Sendable {
        public var id: String
        public var name: String
        public var priceCents: Int
        public var description: String
    }

    public struct State: Codable, Equatable, Sendable {
        public var id: String
        public var product: Item?
        public var loading = false
        public var error: AppError?
    }

    public enum Action: Equatable, Sendable {
        case load
        case addToBasket
    }

    enum Message: Sendable {
        case action(Action)
        case loaded(Result<Product, AppError>)
    }

    public private(set) var state: State
    @ObservationIgnored let effects = EffectRunner()
    private let products: any ProductService
    private unowned let router: any Router

    public init(id: String, products: any ProductService, router: any Router) {
        state = State(id: id)
        self.products = products
        self.router = router
        send(.load)
    }

    public func send(_ action: Action) { handle(.action(action)) }

    private func handle(_ message: Message) {
        for effect in update(message) {
            effects.run(effect) { [weak self] in self?.handle($0) }
        }
    }

    /// State changes only here (R8).
    private func update(_ message: Message) -> [Effect<Message>] {
        switch message {
        case .action(.addToBasket):
            // The reference also shows a snackbar; it is not state (profile: State).
            guard let p = state.product else { return [] }
            router.addToBasket(Product(id: p.id, name: p.name, priceCents: p.priceCents, description: p.description))
            return []
        case .action(.load):
            guard !state.loading else { return [] }
            state.loading = true
            state.error = nil
            return [{ [products, id = state.id] in .loaded(await products.detail(id: id)) }]
        case .loaded(.success(let p)):
            state.loading = false
            // The source reads a missing description as "".
            state.product = Item(id: p.id, name: p.name, priceCents: p.priceCents, description: p.description ?? "")
            return []
        case .loaded(.failure(let error)):
            state.loading = false
            state.error = error
            return []
        }
    }
}
