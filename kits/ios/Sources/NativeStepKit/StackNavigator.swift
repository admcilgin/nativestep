import Observation

/// Navigation as state in Core (R14). Views draw `screens`; the stack lends `goBack` (R15).
@MainActor @Observable
public final class StackNavigator: IntrospectionNodeProviding {
    public private(set) var screens: [any IntrospectionNodeProviding] = []

    public init() {}

    public func push(_ screen: any IntrospectionNodeProviding) {
        screens.append(screen)
    }

    public func goBack() {
        if screens.count > 1 { screens.removeLast() }
    }

    public func reset(to screens: [any IntrospectionNodeProviding]) {
        self.screens = screens
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(
            name: "Stack",
            state: ["depth": screens.count],
            lends: screens.count > 1 ? [NodeAction("goBack", title: "Back") { [weak self] in self?.goBack() }] : [],
            child: screens.last?.introspectionNode
        )
    }
}
