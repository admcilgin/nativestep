import NativeStepKit

extension BasketViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "Basket", state: state)
    }
}
