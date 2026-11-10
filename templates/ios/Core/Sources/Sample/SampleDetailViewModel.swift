import NativeStepKit
import Observation

@MainActor @Observable
public final class SampleDetailViewModel {
    public struct State: Codable, Equatable, Sendable {
        public var id: String
    }

    /// No actions of its own; `goBack` is lent by the stack.
    public enum Action: Equatable, Sendable {}

    public private(set) var state: State

    public init(id: String) {
        state = State(id: id)
    }

    public func send(_ action: Action) {}
}

extension SampleDetailViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "SampleDetail", state: state)
    }
}
