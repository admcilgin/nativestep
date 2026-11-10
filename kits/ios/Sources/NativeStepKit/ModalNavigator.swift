import Observation

/// A modal over `base` as state in Core (R14). While a node is presented it is the child, so `base` and
/// everything it lends are out of reach; the modal lends `dismiss` (R15).
@MainActor @Observable
public final class ModalNavigator: IntrospectionNodeProviding {
    public let base: any IntrospectionNodeProviding
    public private(set) var presented: (any IntrospectionNodeProviding)?

    public init(base: any IntrospectionNodeProviding) {
        self.base = base
    }

    public func present(_ node: any IntrospectionNodeProviding) {
        presented = node
    }

    public func dismiss() {
        presented = nil
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(
            name: "Modal",
            state: ["presented": presented != nil],
            lends: presented != nil ? [NodeAction("dismiss", title: "Dismiss") { [weak self] in self?.dismiss() }] : [],
            child: (presented ?? base).introspectionNode
        )
    }
}
