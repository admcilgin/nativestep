import Observation

/// Tabs as state in Core (R14). Each tab keeps its own node, often a `StackNavigator`; the tabs lend `selectTab` (R15).
@MainActor @Observable
public final class TabNavigator: IntrospectionNodeProviding {
    public private(set) var tabs: [(id: String, node: any IntrospectionNodeProviding)] = []
    public private(set) var selected = ""
    /// Selecting the selected tab again returns its stack to the first screen, as both platforms' tab bars do.
    private let popsToRootOnReselect: Bool

    public init(popsToRootOnReselect: Bool = false) {
        self.popsToRootOnReselect = popsToRootOnReselect
    }

    public func reset(to tabs: [(id: String, node: any IntrospectionNodeProviding)], selected: String? = nil) {
        self.tabs = tabs
        self.selected = selected ?? tabs.first?.id ?? ""
    }

    public func select(_ id: String) {
        guard let tab = tabs.first(where: { $0.id == id }) else { return }
        if id == selected, popsToRootOnReselect, let stack = tab.node as? StackNavigator, let root = stack.screens.first {
            stack.reset(to: [root])
        }
        selected = id
    }

    private struct SelectTab: Decodable {
        var tab: String
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(
            name: "Tabs",
            state: ["selected": selected],
            lends: [
                NodeAction("selectTab", title: "Select tab", input: SelectTab.self,
                           schema: .object(["tab": .string(oneOf: tabs.map(\.id))])) { [weak self] in self?.select($0.tab) },
            ],
            child: tabs.first { $0.id == selected }?.node.introspectionNode
        )
    }
}
