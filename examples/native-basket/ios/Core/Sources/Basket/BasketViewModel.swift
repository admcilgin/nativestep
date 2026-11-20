import NativeStepKit
import Observation

/// The basket tab. Empty until the basket feature fills it.
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

    public enum Action: Equatable, Sendable {}

    public private(set) var state = State()

    public init() {}

    public func send(_ action: Action) {}
}
