package __ANDROID_PACKAGE__.host

import dev.nativestep.kit.host.NativeStepHost

/** The headless host: speaks the protocol on stdio. */
fun main() {
    NativeStepHost(app = "__APP_NAME__", makeRoot = ::fixtureCore).runStdio()
}
