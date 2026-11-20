import NativeStepKit

extension SampleViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "Sample", state: state, actions: [
            NodeAction("increment", title: "Increment") { [weak self] in self?.send(.increment) },
            NodeAction("decrement", title: "Decrement") { [weak self] in self?.send(.decrement) },
            NodeAction("set", title: "Set count", input: SetInput.self) { [weak self] in self?.send(.set($0.value)) },
            NodeAction("load", title: "Load items") { [weak self] in self?.send(.load) },
            NodeAction("openDetail", title: "Open item", input: OpenDetailInput.self) { [weak self] in
                self?.send(.openDetail(id: $0.id))
            },
            NodeAction("_probeNetwork", title: "Probe the network guard") { [weak self] in self?.send(.probeNetwork) },
        ])
    }
}

struct SetInput: NodeInput {
    var value: Int
    static let schema: InputSchema = .object(["value": .integer(minimum: 0)])
}

struct OpenDetailInput: NodeInput {
    var id: String
    static let schema: InputSchema = .object(["id": .string(minLength: 1)])
}
