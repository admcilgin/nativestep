import NativeStepKit

extension ProductDetailViewModel: IntrospectionNodeProviding {
    /// `addToBasket` only while the product shows.
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "ProductDetail", state: state, actions: state.product == nil ? [] : [
            NodeAction("addToBasket", title: "Add to basket") { [weak self] in self?.send(.addToBasket) },
        ])
    }
}
