import Foundation
import NativeStepKit
import Observation

@MainActor @Observable
public final class LoginViewModel {
    public struct State: Codable, Equatable, Sendable {
        public var loading = false
        public var error: AppError?
    }

    public enum Action: Equatable, Sendable {
        case signIn(email: String, password: String)
    }

    enum Message: Sendable {
        case action(Action)
        case signedIn(Result<User, AppError>)
    }

    public private(set) var state = State()
    @ObservationIgnored let effects = EffectRunner()
    private let auth: any AuthService
    private unowned let router: any Router

    public init(auth: any AuthService, router: any Router) {
        self.auth = auth
        self.router = router
    }

    public func send(_ action: Action) { handle(.action(action)) }

    private func handle(_ message: Message) {
        for effect in update(message) {
            effects.run(effect) { [weak self] in self?.handle($0) }
        }
    }

    /// State changes only here (R8).
    private func update(_ message: Message) -> [Effect<Message>] {
        switch message {
        case .action(.signIn(let email, let password)):
            guard !state.loading else { return [] }
            state.loading = true
            state.error = nil
            let email = email.trimmingCharacters(in: .whitespacesAndNewlines)
            return [{ [auth] in .signedIn(await auth.signIn(email: email, password: password)) }]
        case .signedIn(.success(let user)):
            state.loading = false
            router.signedIn(user)
            return []
        case .signedIn(.failure(let error)):
            state.loading = false
            state.error = error
            return []
        }
    }
}
