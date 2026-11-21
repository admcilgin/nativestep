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

/// The single entry point (R3): `AppCore(services:)` builds everything and is the root node.
/// Until the app's first feature gives it a shell of its own, the app is the template's Sample tree; that feature
/// replaces this class's body and keeps `SampleCore` for the conformance tests (COMPONENTS.md §6).
@MainActor @Observable
public final class AppCore: IntrospectionNodeProviding {
    public let sample: SampleCore

    public init(services: Services) {
        sample = SampleCore(sampleService: services.sample)
    }

    /// Opens a deep link with the same stack the user would have reached by hand. Returns false for unknown links.
    public func open(_ url: URL) -> Bool {
        sample.open(url)
    }

    public var introspectionNode: IntrospectionNode {
        sample.introspectionNode
    }
}
