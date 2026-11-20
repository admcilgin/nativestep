import NativeStepKit

extension ProductDetailViewModel: IntrospectionNodeProviding {
    /// `addToBasket` comes with basket cp1.
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "ProductDetail", state: state)
    }
}
