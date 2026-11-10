package __ANDROID_PACKAGE__

import dev.nativestep.kit.host.NativeStepHost
import __ANDROID_PACKAGE__.host.fixtureCore
import kotlinx.coroutines.Dispatchers

/** Debug builds only (R20): serves the protocol on 127.0.0.1:7359 and swaps in fixture cores on `start`. */
object NativeStepLauncher {
    fun start(app: __APP_NAME__Application) {
        NativeStepHost(app = "__APP_NAME__", dispatcher = Dispatchers.Main) { fixtures, route, scope ->
            fixtureCore(fixtures, route, scope).also { app.core.value = it }
        }.listen(7359)
    }
}
