import NativeStepKit

extension ProductListViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "ProductList", state: state, actions: actions)
    }

    /// `refresh` while the list is shown, `retry` while the error is; nothing during the first load or a retry.
    private var actions: [NodeAction] {
        if listShown { return [NodeAction("refresh", title: "Refresh") { [weak self] in self?.send(.refresh) }] }
        if state.error != nil && !state.loading { return [NodeAction("retry", title: "Retry") { [weak self] in self?.send(.retry) }] }
        return []
    }
}
