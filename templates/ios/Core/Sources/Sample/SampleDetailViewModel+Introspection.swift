import NativeStepKit

extension SampleDetailViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "SampleDetail", state: state)
    }
}
