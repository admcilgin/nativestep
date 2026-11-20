import NativeStepKit

extension LicenseViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "License", state: state)
    }
}
