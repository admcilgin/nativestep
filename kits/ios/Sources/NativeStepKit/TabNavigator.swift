import Observation

/// Tabs as state in Core (R14). Each tab keeps its own node, often a `StackNavigator`; the tabs lend `selectTab` (R15).
@MainActor @Observable
public final class TabNavigator: IntrospectionNodeProviding {
    public private(set) var tabs: [(id: String, node: any IntrospectionNodeProviding)] = []
    public private(set) var selected = ""

    public init() {}

    public func reset(to tabs: [(id: String, node: any IntrospectionNodeProviding)], selected: String? = nil) {
        self.tabs = tabs
        self.selected = selected ?? tabs.first?.id ?? ""
    }

    public func select(_ id: String) {
        if tabs.contains(where: { $0.id == id }) { selected = id }
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
