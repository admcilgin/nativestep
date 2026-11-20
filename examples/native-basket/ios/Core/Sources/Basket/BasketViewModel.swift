import NativeStepKit
import Observation

/// The basket tab. AppCore keeps one for its lifetime; the basket survives sign-out as on the reference (memory.md).
@MainActor @Observable
public final class BasketViewModel {
    public struct State: Codable, Equatable, Sendable {
        public var lines: [Line] = []
        public var count = 0
        public var totalCents = 0
        public var placing = false
        public var error: AppError?
    }

    public struct Line: Codable, Equatable, Sendable {
        public var productId: String
        public var name: String
        public var priceCents: Int
        public var quantity: Int
    }

    public enum Action: Equatable, Sendable {
        case add(productId: String, name: String, priceCents: Int)
        case addOne(productId: String)
        case removeOne(productId: String)
        case placeOrder
    }

    enum Message: Sendable {
        case action(Action)
        case placed(Result<PlacedOrder, AppError>)
    }

    public private(set) var state = State()
    /// The last failed order's error. It outlives the lines, as on the reference, but shows only while there are lines.
    private var orderError: AppError?
    @ObservationIgnored let effects = EffectRunner()
    private let orders: any OrderService
    private unowned let router: any Router

    public init(orders: any OrderService, router: any Router) {
        self.orders = orders
        self.router = router
    }

    public func send(_ action: Action) { handle(.action(action)) }

    private func handle(_ message: Message) {
        for effect in update(message) {
            effects.run(effect) { [weak self] in self?.handle($0) }
        }
    }

    /// State changes only here (R8). Count, total and the shown error follow the lines after every message.
    private func update(_ message: Message) -> [Effect<Message>] {
        defer {
            state.count = state.lines.reduce(0) { $0 + $1.quantity }
            state.totalCents = state.lines.reduce(0) { $0 + $1.priceCents * $1.quantity }
            state.error = state.lines.isEmpty ? nil : orderError
        }
        switch message {
        case .action(.add(let productId, let name, let priceCents)):
            if let i = state.lines.firstIndex(where: { $0.productId == productId }) {
                state.lines[i].quantity += 1
            } else {
                state.lines.append(Line(productId: productId, name: name, priceCents: priceCents, quantity: 1))
            }
            return []
        case .action(.addOne(let productId)):
            if let i = state.lines.firstIndex(where: { $0.productId == productId }) { state.lines[i].quantity += 1 }
            return []
        case .action(.removeOne(let productId)):
            // The line goes when its quantity reaches zero.
            if let i = state.lines.firstIndex(where: { $0.productId == productId }) {
                state.lines[i].quantity -= 1
                if state.lines[i].quantity == 0 { state.lines.remove(at: i) }
            }
            return []
        case .action(.placeOrder):
            guard !state.lines.isEmpty, !state.placing else { return [] }
            state.placing = true
            let items = state.lines.map { OrderItem(productId: $0.productId, quantity: $0.quantity) }
            return [{ [orders] in .placed(await orders.place(items: items)) }]
        case .placed(.success(let order)):
            state.placing = false
            orderError = nil
            state.lines = []
            router.orderPlaced(id: order.id)
            return []
        case .placed(.failure(let error)):
            state.placing = false
            orderError = error
            return []
        }
    }
}
