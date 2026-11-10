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

extension AboutViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "About", state: state, actions: [
            NodeAction("openLicense", title: "Show license") { [weak self] in self?.send(.openLicense) },
        ])
    }
}

/// Presented by the modal navigator; `dismiss` is lent by it.
@MainActor @Observable
public final class LicenseViewModel {
    public struct State: Codable, Equatable, Sendable {}

    public enum Action: Equatable, Sendable {}

    public private(set) var state = State()

    public init() {}

    public func send(_ action: Action) {}
}

extension LicenseViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "License", state: state)
    }
}
