import NativeStepKit

/// Answers service calls from the session's fixture document (PROTOCOL.md §7).
/// Host-side fixture services call `call(_:_:_:)` instead of doing real work.
@MainActor
public final class FixtureStore {
    private struct Entry {
        var args: [String: JSONValue]?
        var result: JSONValue?
        var error: AppError?
        var delayMs: Int
        var remaining: Int?
    }

    private var services: [String: [String: [Entry]]] = [:]
    public let flags: [String: JSONValue]
    private let poison: (ProtocolError) -> Void

    init(_ document: JSONValue, poison: @escaping (ProtocolError) -> Void) throws {
        self.poison = poison
        guard case .object(let flags)? = document["flags"] ?? .object([:]) else {
            throw ProtocolError("bad_request", "fixtures.flags must be an object")
        }
        self.flags = flags
        guard case .object(let services)? = document["services"] ?? .object([:]) else {
            throw ProtocolError("bad_request", "fixtures.services must be an object")
        }
        for (service, methods) in services {
            guard case .object(let methods) = methods else { throw ProtocolError("bad_request", "fixtures.services.\(service) must be an object") }
            for (method, entries) in methods {
                guard case .array(let entries) = entries else { throw ProtocolError("bad_request", "fixtures for \(service).\(method) must be a list") }
                self.services[service, default: [:]][method] = try entries.map { e in
                    var args: [String: JSONValue]?
                    if case .object(let a)? = e["args"] { args = a }
                    let error: AppError? = try e["error"].map { try $0.decode() }
                    guard (e["result"] == nil) != (error == nil) else {
                        throw ProtocolError("bad_request", "a fixture for \(service).\(method) needs exactly one of result and error")
                    }
                    var delay = 0, times: Int?
                    if case .int(let d)? = e["delayMs"] { delay = d }
                    if case .int(let t)? = e["times"] { times = t }
                    return Entry(args: args, result: e["result"], error: error, delayMs: delay, remaining: times)
                }
            }
        }
    }

    public func call<T: Decodable & Sendable>(
        _ service: String,
        _ method: String,
        _ args: [String: JSONValue] = [:]
    ) async -> Result<T, AppError> {
        let entries = services[service]?[method] ?? []
        guard let index = entries.firstIndex(where: { e in
            e.remaining != 0 && (e.args ?? [:]).allSatisfy { args[$0.key] == $0.value }
        }) else {
            poison(ProtocolError("fixture_missing", "no fixture for \(service).\(method)",
                                 ["service": .string(service), "method": .string(method), "args": .object(args)]))
            return .failure(AppError(code: "fixture_missing"))
        }
        let entry = entries[index]
        if let remaining = entry.remaining { services[service]![method]![index].remaining = remaining - 1 }
        if entry.delayMs > 0 { try? await Task.sleep(for: .milliseconds(entry.delayMs)) }
        if let error = entry.error { return .failure(error) }
        do {
            return .success(try entry.result!.decode(T.self))
        } catch {
            poison(ProtocolError("internal", "fixture result for \(service).\(method) does not decode as \(T.self)",
                                 ["detail": .string("\(error)")]))
            return .failure(AppError(code: "internal"))
        }
    }
}
