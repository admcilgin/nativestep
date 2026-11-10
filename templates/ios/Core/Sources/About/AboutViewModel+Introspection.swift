import NativeStepKit

extension AboutViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "About", state: state, actions: [
            NodeAction("openLicense", title: "Show license") { [weak self] in self?.send(.openLicense) },
        ])
    }
}
