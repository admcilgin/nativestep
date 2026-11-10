import Foundation
import os

/// Blocks real network requests while a session is running (R19, PROTOCOL.md §6). This is the second line of
/// defense: fixture services never touch the network, so a request here means code bypassed a service.
/// Outside a session (a debug app used by hand) requests go through untouched.
/// shortcut: catches URLSession.shared and sessions whose configuration lists this class; add
/// `protocolClasses` injection for custom sessions when a pilot app needs it.
final class NetworkGuard: URLProtocol, @unchecked Sendable {
    private struct State: Sendable {
        var active = false
        var blocked: [String: String]?
    }

    private static let state = OSAllocatedUnfairLock(initialState: State())

    static func install() {
        URLProtocol.registerClass(NetworkGuard.self)
    }

    /// Starts blocking (and forgets earlier attempts) or stops blocking.
    static func activate(_ active: Bool) {
        state.withLock { $0 = State(active: active) }
    }

    /// The first blocked request of the session, as `{ method, url }`.
    static var firstBlocked: [String: String]? {
        state.withLock { $0.blocked }
    }

    override class func canInit(with request: URLRequest) -> Bool { state.withLock { $0.active } }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let attempt = ["method": request.httpMethod ?? "GET", "url": request.url?.absoluteString ?? ""]
        Self.state.withLock { if $0.blocked == nil { $0.blocked = attempt } }
        client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
    }

    override func stopLoading() {}
}
