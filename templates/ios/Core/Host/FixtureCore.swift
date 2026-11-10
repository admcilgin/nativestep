import Core
import Foundation
import NativeStepHostKit
import NativeStepKit

/// Builds Core with fixture services (R3) and opens `route`. Used by the headless host and the debug app.
@MainActor
public func fixtureCore(_ fixtures: FixtureStore, route: String?) throws -> AppCore {
    let core = AppCore(services: Services(sample: FixtureSampleService(fixtures: fixtures)))
    if let route, !(URL(string: route).map(core.open) ?? false) {
        throw ProtocolError("bad_request", "no screen for route \(route)")
    }
    return core
}

struct FixtureSampleService: SampleService {
    let fixtures: FixtureStore

    func list(page: Int) async -> Result<SampleList, AppError> {
        await fixtures.call("SampleService", "list", ["page": .int(page)])
    }
}
