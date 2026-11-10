import Foundation
import NativeStepKit
import Observation

/// Every external dependency of Core (R4). Mobile passes real implementations, Host fixture ones.
public struct Services {
    public var sample: any SampleService

    public init(sample: any SampleService) {
        self.sample = sample
    }
}

public enum Route: Equatable, Sendable {
    case sample
    case sampleDetail(id: String)
    case license

    /// Deep links resolve in Core (R16). The scheme is ignored so every app can keep its own.
    public init?(url: URL) {
        let parts = (url.host().map { [$0] } ?? []) + url.pathComponents.filter { $0 != "/" }
        if parts.isEmpty { self = .sample }
        else if parts.count == 2, parts[0] == "detail" { self = .sampleDetail(id: parts[1]) }
        else if parts == ["license"] { self = .license }
        else { return nil }
    }
}

@MainActor
public protocol Router: AnyObject {
    func go(_ route: Route)
}

/// The single entry point (R3): `AppCore(services:)` builds everything and is the root node.
@MainActor @Observable
public final class AppCore: Router, IntrospectionNodeProviding {
    /// App → Modal → Tabs → { sample: Stack → Sample…, about: About }
    public let modal: ModalNavigator
    public let tabs: TabNavigator
    public let stack = StackNavigator()
    private let services: Services

    public init(services: Services) {
        let tabs = TabNavigator()
        self.tabs = tabs
        modal = ModalNavigator(base: tabs)
        self.services = services
        stack.reset(to: [sample()])
        tabs.reset(to: [("sample", stack), ("about", AboutViewModel(router: self))])
    }

    public func go(_ route: Route) {
        switch route {
        case .sample: stack.reset(to: [sample()])
        case .sampleDetail(let id): stack.push(SampleDetailViewModel(id: id))
        case .license: modal.present(LicenseViewModel())
        }
    }

    /// Opens a deep link with the same stack the user would have reached by hand. Returns false for unknown links.
    public func open(_ url: URL) -> Bool {
        guard let route = Route(url: url) else { return false }
        switch route {
        case .sample: stack.reset(to: [sample()])
        case .sampleDetail(let id): stack.reset(to: [sample(), SampleDetailViewModel(id: id)])
        case .license:
            tabs.select("about")
            modal.present(LicenseViewModel())
        }
        return true
    }

    private func sample() -> SampleViewModel {
        SampleViewModel(sample: services.sample, router: self)
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "App", state: [String: Int](), child: modal.introspectionNode)
    }
}
