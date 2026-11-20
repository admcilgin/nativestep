import NativeStepKit

extension OrderPlacedViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "OrderPlaced", state: state)
    }
}
