import NativeStepKit
import Observation

/// Presented by the modal navigator; `dismiss` is lent by it.
@MainActor @Observable
public final class LicenseViewModel {
    public struct State: Codable, Equatable, Sendable {}

    public enum Action: Equatable, Sendable {}

    public private(set) var state = State()

    public init() {}

    public func send(_ action: Action) {}
}
