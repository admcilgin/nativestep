import Core
import NativeStepKit
import Observation
import SwiftUI
#if DEBUG
import CoreHost
import NativeStepHostKit
#endif

/// The core the UI draws. A nativestep session (debug builds) swaps in one built from fixtures.
@MainActor @Observable
final class CoreHolder {
    var core: AppCore

    init(_ core: AppCore) {
        self.core = core
    }
}

@main
struct BasketApp: App {
    @State private var holder: CoreHolder

    init() {
        let holder = CoreHolder(AppCore(services: Services(auth: HTTPAuthService(), products: HTTPProductService())))
        _holder = State(initialValue: holder)
        #if DEBUG
        // Debug builds only (R20): serves the protocol on 127.0.0.1:7358.
        NativeStepHost.listen(app: "Basket") { fixtures, route in
            // The conformance core has no views; `_sample` runs headless (COMPONENTS.md §6).
            if fixtures.flags["conformance"] == .bool(true) {
                throw ProtocolError("unsupported", "conformance sessions run on the headless host")
            }
            let core = try fixtureCore(fixtures, route: route)
            holder.core = core
            return core
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView(core: holder.core)
                .id(ObjectIdentifier(holder.core))
        }
    }
}
