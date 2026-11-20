import NativeStepKit

extension ProductListViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "ProductList", state: state, actions: actions + [
            NodeAction("signOut", title: "Sign out") { [weak self] in self?.send(.signOut) },
        ])
    }

    /// `search`, `openProduct` for the products shown and `refresh` while the list is shown, `retry` while the error is;
    /// nothing during the first load or a retry.
    /// `signOut` is always there.
    private var actions: [NodeAction] {
        if listShown {
            let ids = state.results.map(\.id)
            let open = NodeAction("openProduct", title: "Open product", input: OpenProductInput.self,
                                  schema: .object(["id": .string(oneOf: ids)])) { [weak self] in self?.send(.openProduct(id: $0.id)) }
            let search = NodeAction("search", title: "Search", input: SearchInput.self,
                                    schema: .object(["query": .string()])) { [weak self] in self?.send(.search(query: $0.query)) }
            return [search] + (ids.isEmpty ? [] : [open]) + [NodeAction("refresh", title: "Refresh") { [weak self] in self?.send(.refresh) }]
        }
        if state.error != nil && !state.loading { return [NodeAction("retry", title: "Retry") { [weak self] in self?.send(.retry) }] }
        return []
    }
}

struct OpenProductInput: Decodable {
    var id: String
}

struct SearchInput: Decodable {
    var query: String
}
