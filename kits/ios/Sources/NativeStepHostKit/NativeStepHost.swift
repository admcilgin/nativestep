import Foundation
import Network
import NativeStepKit

/// A protocol error response (PROTOCOL.md §8). `extra` fields go next to `code` and `message`.
public struct ProtocolError: Error {
    public let code: String
    public let message: String
    public let extra: [String: JSONValue]

    public init(_ code: String, _ message: String, _ extra: [String: JSONValue] = [:]) {
        self.code = code
        self.message = message
        self.extra = extra
    }

    var json: JSONValue {
        .object(extra.merging(["code": .string(code), "message": .string(message)]) { $1 })
    }
}

/// The protocol server (PROTOCOL.md). One instance serves one connection; sessions come and go with `start`.
@MainActor
public final class NativeStepHost {
    /// Builds the app's root from fixture services and opens `route` if given (R3, R16).
    public typealias MakeRoot = @MainActor (_ fixtures: FixtureStore, _ route: String?) throws -> any IntrospectionNodeProviding

    static let protocolVersion = 1
    private let app: String
    private let target: String
    private let makeRoot: MakeRoot
    private var root: (any IntrospectionNodeProviding)?
    private var poisoned: ProtocolError?

    public init(app: String, target: String = "ios", makeRoot: @escaping MakeRoot) {
        self.app = app
        self.target = target
        self.makeRoot = makeRoot
    }

    /// Headless mode: requests on stdin, responses on stdout. Anything else the app prints goes to stderr.
    public static func runStdio(app: String, makeRoot: @escaping MakeRoot) async {
        let out = FileHandle(fileDescriptor: dup(STDOUT_FILENO), closeOnDealloc: true)
        dup2(STDERR_FILENO, STDOUT_FILENO)
        NetworkGuard.install()
        let host = NativeStepHost(app: app, makeRoot: makeRoot)
        do {
            for try await line in FileHandle.standardInput.bytes.lines {
                out.write(host.respond(to: line) + Data("\n".utf8))
            }
        } catch {
            FileHandle.standardError.write(Data("nativestep-host: stdin failed: \(error)\n".utf8))
        }
    }

    /// Device mode: the debug app listens on 127.0.0.1:`port` (PROTOCOL.md §1). Call it once, in `#if DEBUG` (R20).
    /// `makeRoot` also swaps the core the app's views draw.
    public static func listen(app: String, port: UInt16 = 7358, makeRoot: @escaping MakeRoot) {
        NetworkGuard.install()
        let host = NativeStepHost(app: app, makeRoot: makeRoot)
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: NWEndpoint.Port(rawValue: port)!)
        parameters.allowLocalEndpointReuse = true
        do {
            let listener = try NWListener(using: parameters)
            listener.newConnectionHandler = { connection in
                connection.start(queue: .main)
                MainActor.assumeIsolated { host.receive(on: connection, buffer: Data()) }
            }
            listener.stateUpdateHandler = { state in
                if case .failed(let error) = state { print("nativestep: listener failed: \(error)") }
            }
            listener.start(queue: .main)
            host.listener = listener
            print("nativestep: listening on 127.0.0.1:\(port)")
        } catch {
            print("nativestep: cannot listen on port \(port): \(error)")
        }
    }

    private var listener: NWListener?

    private func receive(on connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 1 << 16) { data, _, isComplete, error in
            MainActor.assumeIsolated {
                var buffer = buffer + (data ?? Data())
                while let newline = buffer.firstIndex(of: 0x0A) {
                    let line = String(decoding: buffer[buffer.startIndex..<newline], as: UTF8.self)
                    buffer = Data(buffer[buffer.index(after: newline)...])
                    connection.send(content: self.respond(to: line) + Data("\n".utf8), completion: .contentProcessed { _ in })
                }
                if isComplete || error != nil {
                    connection.cancel()
                } else {
                    self.receive(on: connection, buffer: buffer)
                }
            }
        }
    }

    /// Handles one request line and returns one response line (without the newline).
    public func respond(to line: String) -> Data {
        var id: JSONValue = .null
        let response: JSONValue
        do {
            guard let request = try? JSONDecoder().decode(JSONValue.self, from: Data(line.utf8)),
                  case .object(let fields) = request
            else { throw ProtocolError("bad_request", "the line is not a JSON object") }
            id = fields["id"] ?? .null
            guard case .string(let cmd)? = fields["cmd"] else { throw ProtocolError("bad_request", "missing cmd") }
            response = .object(try handle(cmd, request).merging(["id": id, "ok": true]) { $1 })
        } catch let error as ProtocolError {
            response = ["id": id, "ok": false, "error": error.json]
        } catch {
            response = ["id": id, "ok": false, "error": ProtocolError("internal", "unexpected error", ["detail": .string("\(error)")]).json]
        }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return (try? encoder.encode(response)) ?? Data(#"{"ok":false,"error":{"code":"internal","message":"encoding failed"}}"#.utf8)
    }

    private func handle(_ cmd: String, _ request: JSONValue) throws -> [String: JSONValue] {
        switch cmd {
        case "hello":
            guard request["protocol"] == .int(Self.protocolVersion) else {
                throw ProtocolError("protocol_mismatch", "this host speaks protocol \(Self.protocolVersion)", ["supported": [.int(Self.protocolVersion)]])
            }
            return ["protocol": .int(Self.protocolVersion), "target": .string(target), "app": .string(app), "capabilities": ["start"]]

        case "start":
            stop()
            NetworkGuard.activate(true)
            let fixtures = try FixtureStore(request["fixtures"] ?? [:]) { [weak self] error in
                if self?.poisoned == nil { self?.poisoned = error }
            }
            var route: String?
            if case .string(let r)? = request["route"] { route = r }
            root = try makeRoot(fixtures, route)
            return try snapshot()

        case "ls":
            return try snapshot()

        case "do":
            try checkSession()
            guard case .string(let name)? = request["action"] else { throw ProtocolError("bad_request", "missing action") }
            let actions = focus().actions
            guard let (action, _) = actions.first(where: { $0.0.name == name }) else {
                throw ProtocolError("action_unavailable", "\(name) is not available here", ["available": .array(actions.map { .string($0.0.name) })])
            }
            let input = request["input"] ?? [:]
            if let schema = action.input {
                let violations = schema.validate(input)
                if !violations.isEmpty {
                    throw ProtocolError("invalid_input", "input for \(name) does not match its schema", [
                        "errors": .array(violations.map { ["path": .string($0.path), "message": .string($0.message)] }),
                    ])
                }
            }
            do { try action.perform(input) } catch {
                throw ProtocolError("invalid_input", "input for \(name) could not be decoded", [
                    "errors": [["path": "", "message": .string("\(error)")]],
                ])
            }
            return try snapshot()

        case "stop":
            stop()
            return [:]

        default:
            throw ProtocolError("unknown_command", "unknown command \(cmd)", ["commands": ["hello", "start", "ls", "do", "stop"]])
        }
    }

    private func stop() {
        Effects.cancelAll()
        NetworkGuard.activate(false)
        poisoned = nil
        root = nil
    }

    private func checkSession() throws {
        guard root != nil else { throw ProtocolError("no_session", "send start first") }
        if poisoned == nil, let request = NetworkGuard.firstBlocked {
            poisoned = ProtocolError("network_blocked", "a network request was attempted during the session",
                                     ["request": .object(request.mapValues(JSONValue.string))])
        }
        if let poisoned { throw poisoned }
    }

    /// The chain from the root to the focused node, and the focused node's actions:
    /// its own first, then those lent by the nodes above it, nearest first (PROTOCOL.md §4).
    private func focus() -> (path: [IntrospectionNode], actions: [(NodeAction, lentBy: String?)]) {
        var path = [root!.introspectionNode]
        while let child = path.last!.child { path.append(child) }
        var actions = path.last!.actions.map { ($0, lentBy: String?.none) }
        for ancestor in path.dropLast().reversed() {
            for action in ancestor.lends where !actions.contains(where: { $0.0.name == action.name }) {
                actions.append((action, lentBy: ancestor.name))
            }
        }
        return (path, actions)
    }

    private func snapshot() throws -> [String: JSONValue] {
        try checkSession()
        let (path, actions) = focus()
        let node = path.last!
        return [
            "node": [
                "name": .string(node.name),
                "state": node.state,
                "actions": .array(actions.map { action, lentBy in
                    var o: [String: JSONValue] = ["name": .string(action.name), "title": .string(action.title)]
                    if let input = action.input { o["input"] = input.json }
                    if let lentBy { o["lentBy"] = .string(lentBy) }
                    return .object(o)
                }),
            ],
            "path": .array(path.map { .string($0.name) }),
            "busy": .bool(Effects.inFlight > 0),
        ]
    }
}
