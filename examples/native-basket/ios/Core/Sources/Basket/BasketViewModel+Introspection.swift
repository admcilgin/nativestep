import NativeStepKit

extension BasketViewModel: IntrospectionNodeProviding {
    /// `addOne` and `removeOne` for the lines on screen, `placeOrder` unless one is being placed; nothing on an empty basket.
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "Basket", state: state, actions: actions)
    }

    private var actions: [NodeAction] {
        guard !state.lines.isEmpty else { return [] }
        let line: InputSchema = .object(["productId": .string(oneOf: state.lines.map(\.productId))])
        return [
            NodeAction("addOne", title: "Add one", input: LineInput.self, schema: line) { [weak self] in self?.send(.addOne(productId: $0.productId)) },
            NodeAction("removeOne", title: "Remove one", input: LineInput.self, schema: line) { [weak self] in self?.send(.removeOne(productId: $0.productId)) },
        ] + (state.placing ? [] : [NodeAction("placeOrder", title: "Place order") { [weak self] in self?.send(.placeOrder) }])
    }
}

struct LineInput: Decodable {
    var productId: String
}
