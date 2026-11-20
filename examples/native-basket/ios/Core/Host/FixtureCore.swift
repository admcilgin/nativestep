import Core
import Foundation
import NativeStepHostKit
import NativeStepKit

/// The headless host's root: the conformance core for `_sample` sessions (COMPONENTS.md §6), the app otherwise.
@MainActor
public func hostRoot(_ fixtures: FixtureStore, route: String?) throws -> any IntrospectionNodeProviding {
    guard fixtures.flags["conformance"] == .bool(true) else { return try fixtureCore(fixtures, route: route) }
    let core = SampleCore(sampleService: FixtureSampleService(fixtures: fixtures))
    if let route, !(URL(string: route).map(core.open) ?? false) {
        throw ProtocolError("bad_request", "no screen for route \(route)")
    }
    return core
}

/// Builds Core with fixture services (R3). Used by the headless host and the debug app. Basket has no deep links.
@MainActor
public func fixtureCore(_ fixtures: FixtureStore, route: String?) throws -> AppCore {
    if let route { throw ProtocolError("bad_request", "Basket has no deep links; got \(route)") }
    return AppCore(services: Services(auth: FixtureAuthService(fixtures: fixtures), products: FixtureProductService(fixtures: fixtures)))
}

struct FixtureSampleService: SampleService {
    let fixtures: FixtureStore

    func list(page: Int) async -> Result<SampleList, AppError> {
        await fixtures.call("SampleService", "list", ["page": .int(page)])
    }
}

struct FixtureAuthService: AuthService {
    let fixtures: FixtureStore

    func signIn(email: String, password: String) async -> Result<User, AppError> {
        await fixtures.call("AuthService", "signIn", ["email": .string(email), "password": .string(password)])
    }
}

struct FixtureProductService: ProductService {
    let fixtures: FixtureStore

    func list() async -> Result<[Product], AppError> {
        await fixtures.call("ProductService", "list")
    }
}
