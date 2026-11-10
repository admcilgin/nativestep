/// What a ViewModel or navigator shows over the protocol (ARCHITECTURE.md §4, PROTOCOL.md §4).
public struct IntrospectionNode {
    public let name: String
    public let state: JSONValue
    /// Offered only while this node is focused.
    public let actions: [NodeAction]
    /// Offered to every node below this one (navigators: `goBack`, `selectTab`, `dismiss`).
    public let lends: [NodeAction]
    private let children: [IntrospectionNode]

    public var child: IntrospectionNode? { children.first }

    public init(
        name: String,
        state: some Encodable,
        actions: [NodeAction] = [],
        lends: [NodeAction] = [],
        child: IntrospectionNode? = nil
    ) {
        self.name = name
        // A State that cannot be encoded is a programming error; fail loudly in debug builds.
        self.state = try! JSONValue(encoding: state)
        self.actions = actions
        self.lends = lends
        self.children = child.map { [$0] } ?? []
    }
}

@MainActor
public protocol IntrospectionNodeProviding: AnyObject {
    var introspectionNode: IntrospectionNode { get }
}

/// The typed input of a parameterized action (R13).
public protocol NodeInput: Decodable {
    static var schema: InputSchema { get }
}

public struct NodeAction {
    public let name: String
    public let title: String
    public let input: InputSchema?
    public let perform: @MainActor (JSONValue) throws -> Void

    public init(_ name: String, title: String, perform: @escaping @MainActor () -> Void) {
        self.name = name
        self.title = title
        self.input = nil
        self.perform = { _ in perform() }
    }

    public init<Input: NodeInput>(
        _ name: String,
        title: String,
        input: Input.Type,
        perform: @escaping @MainActor (Input) -> Void
    ) {
        self.init(name, title: title, input: input, schema: Input.schema, perform: perform)
    }

    /// For inputs whose schema is known only at run time, like the tab ids of `selectTab`.
    public init<Input: Decodable>(
        _ name: String,
        title: String,
        input: Input.Type,
        schema: InputSchema,
        perform: @escaping @MainActor (Input) -> Void
    ) {
        self.name = name
        self.title = title
        self.input = schema
        self.perform = { json in perform(try json.decode(Input.self)) }
    }
}
