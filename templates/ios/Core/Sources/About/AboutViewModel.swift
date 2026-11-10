import NativeStepKit
import Observation

/// The second tab. Opens the license as a modal.
@MainActor @Observable
public final class AboutViewModel {
    public struct State: Codable, Equatable, Sendable {}

    public enum Action: Equatable, Sendable {
        case openLicense
    }

    public private(set) var state = State()
    private unowned let router: any Router

    public init(router: any Router) {
        self.router = router
    }

    public func send(_ action: Action) {
        switch action {
        case .openLicense: router.go(.license)
        }
    }
}
