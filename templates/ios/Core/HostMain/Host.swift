import CoreHost
import NativeStepHostKit

/// The headless host: speaks the protocol on stdio.
@main
struct Host {
    @MainActor
    static func main() async {
        await NativeStepHost.runStdio(app: "__APP_NAME__", makeRoot: fixtureCore)
    }
}
