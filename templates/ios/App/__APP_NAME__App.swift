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
struct __APP_NAME__App: App {
    @State private var holder: CoreHolder

    init() {
        let holder = CoreHolder(AppCore(services: Services(sample: HTTPSampleService())))
        _holder = State(initialValue: holder)
        #if DEBUG
        // Debug builds only (R20): serves the protocol on 127.0.0.1:7358.
        NativeStepHost.listen(app: "__APP_NAME__") { fixtures, route in
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
