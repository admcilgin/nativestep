package dev.nativestep.basket

import android.app.Activity
import android.app.Application
import android.os.Bundle
import dev.nativestep.kit.host.NativeStepHost
import dev.nativestep.kit.host.ProtocolError
import dev.nativestep.basket.host.fixtureCore
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.json.JsonPrimitive

/** Debug builds only (R20): serves the protocol on 127.0.0.1:7359 and swaps in fixture cores on `start`. */
object NativeStepLauncher {
    fun start(app: BasketApplication) {
        NativeStepHost(app = "Basket", dispatcher = Dispatchers.Main) { fixtures, route, scope ->
            // The conformance core has no screens; `_sample` runs headless (COMPONENTS.md §6).
            if (fixtures.flags["conformance"] == JsonPrimitive(true)) {
                throw ProtocolError("unsupported", "conformance sessions run on the headless host")
            }
            fixtureCore(fixtures, route, scope).also { app.core.value = it }
        }.listenWhileStarted(app, 7359)
    }
}

/**
 * The port belongs to the visible app: listen while one of its activities is started. A stopped app keeps
 * running, and would answer for another project's debug app on the same emulator.
 */
private fun NativeStepHost.listenWhileStarted(app: Application, port: Int) =
    app.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
        private var started = 0
        override fun onActivityStarted(activity: Activity) { if (started++ == 0) listen(port) }
        override fun onActivityStopped(activity: Activity) { if (--started == 0) close() }
        override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
        override fun onActivityResumed(activity: Activity) {}
        override fun onActivityPaused(activity: Activity) {}
        override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
        override fun onActivityDestroyed(activity: Activity) {}
    })
