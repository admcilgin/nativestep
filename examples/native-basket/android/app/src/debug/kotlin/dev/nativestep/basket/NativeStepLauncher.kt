package dev.nativestep.basket

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
        }.listen(7359)
    }
}
