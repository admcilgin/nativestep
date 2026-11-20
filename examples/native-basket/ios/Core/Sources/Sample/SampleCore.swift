import Foundation
import NativeStepKit
import Observation

public enum SampleRoute: Equatable, Sendable {
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
public protocol SampleRouter: AnyObject {
    func go(_ route: SampleRoute)
}

/// The template's app shell, kept for the conformance tests (`_sample`) until the migration ends (COMPONENTS.md §6).
/// The host builds it for sessions with the `conformance` flag; the app itself never does.
@MainActor @Observable
public final class SampleCore: SampleRouter, IntrospectionNodeProviding {
    /// App → Modal → Tabs → { sample: Stack → Sample…, about: About }
    public let modal: ModalNavigator
    public let tabs: TabNavigator
    public let stack = StackNavigator()
    private let sampleService: any SampleService

    public init(sampleService: any SampleService) {
        let tabs = TabNavigator()
        self.tabs = tabs
        modal = ModalNavigator(base: tabs)
        self.sampleService = sampleService
        stack.reset(to: [sample()])
        tabs.reset(to: [("sample", stack), ("about", AboutViewModel(router: self))])
    }

    public func go(_ route: SampleRoute) {
        switch route {
        case .sample: stack.reset(to: [sample()])
        case .sampleDetail(let id): stack.push(SampleDetailViewModel(id: id))
        case .license: modal.present(LicenseViewModel())
        }
    }

    /// Opens a deep link with the same stack the user would have reached by hand. Returns false for unknown links.
    public func open(_ url: URL) -> Bool {
        guard let route = SampleRoute(url: url) else { return false }
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
        SampleViewModel(sample: sampleService, router: self)
    }

    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "App", state: [String: Int](), child: modal.introspectionNode)
    }
}
