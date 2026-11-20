import NativeStepKit

extension ProductListViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "ProductList", state: state)
    }
}
