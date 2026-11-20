import Foundation
import NativeStepKit
import Observation

/// The products tab's first screen. It loads the list as soon as it exists, as the reference does when it is shown.
@MainActor @Observable
public final class ProductListViewModel {
    public struct Item: Codable, Equatable, Sendable {
        public var id: String
        public var name: String
        public var priceCents: Int
    }

    public struct State: Codable, Equatable, Sendable {
        public var products: [Item] = []
        /// The search as typed, and the products it shows, in catalog order (docs/features/search.md).
        public var query = ""
        public var results: [Item] = []
        public var loading = false
        public var error: AppError?
    }

    public enum Action: Equatable, Sendable {
        case load, refresh, retry
        case openProduct(id: String)
        case search(query: String)
        case signOut
    }

    enum Message: Sendable {
        case action(Action)
        case loaded(Result<[Product], AppError>)
    }

    public private(set) var state = State()
    /// True while a loaded list is on screen, empty or not, refreshing or not. Decides `refresh` against no action.
    public private(set) var listShown = false
    @ObservationIgnored let effects = EffectRunner()
    private let products: any ProductService
    private unowned let router: any Router

    public init(products: any ProductService, router: any Router) {
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

    /// State changes only here (R8). The results follow the products and the search after every message.
    private func update(_ message: Message) -> [Effect<Message>] {
        defer {
            // Case-insensitive without locale rules, like Kotlin's `ignoreCase`, so both platforms match the same names (R12).
            let text = state.query.trimmingCharacters(in: .whitespacesAndNewlines)
            state.results = text.isEmpty ? state.products : state.products.filter { $0.name.range(of: text, options: .caseInsensitive) != nil }
        }
        switch message {
        case .action(.search(let query)):
            state.query = query
            return []
        case .action(.openProduct(let id)):
            router.go(.product(id: id))
            return []
        case .action(.signOut):
            router.signOut()
            return []
        case .action:
            // load (on creation), refresh (list shown, keeps it) and retry (after an error) all reload.
            guard !state.loading else { return [] }
            state.loading = true
            state.error = nil
            return [{ [products] in .loaded(await products.list()) }]
        case .loaded(.success(let list)):
            state.loading = false
            state.products = list.map { Item(id: $0.id, name: $0.name, priceCents: $0.priceCents) }
            listShown = true
            return []
        case .loaded(.failure(let error)):
            // The reference shows the error alone, also when a refresh fails.
            state.loading = false
            state.error = error
            state.products = []
            listShown = false
            return []
        }
    }
}
