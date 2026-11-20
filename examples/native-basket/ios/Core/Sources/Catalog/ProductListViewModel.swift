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
        public var loading = false
        public var error: AppError?
    }

    public enum Action: Equatable, Sendable {
        case load
    }

    enum Message: Sendable {
        case action(Action)
        case loaded(Result<[Product], AppError>)
    }

    public private(set) var state = State()
    @ObservationIgnored let effects = EffectRunner()
    private let products: any ProductService

    public init(products: any ProductService) {
        self.products = products
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
        case .action(.load):
            guard !state.loading else { return [] }
            state.loading = true
            state.error = nil
            return [{ [products] in .loaded(await products.list()) }]
        case .loaded(.success(let list)):
            state.loading = false
            state.products = list.map { Item(id: $0.id, name: $0.name, priceCents: $0.priceCents) }
            return []
        case .loaded(.failure(let error)):
            state.loading = false
            state.error = error
            return []
        }
    }
}
