import NativeStepKit
import Observation

/// The "Order placed" dialog, presented by the modal navigator; `dismiss` (its OK button) is lent by it.
@MainActor @Observable
public final class OrderPlacedViewModel {
    public struct State: Codable, Equatable, Sendable {
        public var orderId: String
    }

    public private(set) var state: State

    public init(orderId: String) {
        state = State(orderId: orderId)
    }
}
