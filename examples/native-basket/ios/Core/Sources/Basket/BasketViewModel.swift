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
    }

    public private(set) var state = State()

    public init() {}

    public func send(_ action: Action) { update(action) }

    /// State changes only here (R8). No effects yet: placing an order (basket cp3) adds the first.
    private func update(_ action: Action) {
        switch action {
        case .add(let productId, let name, let priceCents):
            if let i = state.lines.firstIndex(where: { $0.productId == productId }) {
                state.lines[i].quantity += 1
            } else {
                state.lines.append(Line(productId: productId, name: name, priceCents: priceCents, quantity: 1))
            }
        case .addOne(let productId):
            if let i = state.lines.firstIndex(where: { $0.productId == productId }) { state.lines[i].quantity += 1 }
        case .removeOne(let productId):
            // The line goes when its quantity reaches zero.
            if let i = state.lines.firstIndex(where: { $0.productId == productId }) {
                state.lines[i].quantity -= 1
                if state.lines[i].quantity == 0 { state.lines.remove(at: i) }
            }
        }
        state.count = state.lines.reduce(0) { $0 + $1.quantity }
        state.totalCents = state.lines.reduce(0) { $0 + $1.priceCents * $1.quantity }
    }
}
