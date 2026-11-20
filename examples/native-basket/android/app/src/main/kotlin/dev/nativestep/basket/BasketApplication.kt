package dev.nativestep.basket

import android.app.Application
import dev.nativestep.basket.app.AppCore
import dev.nativestep.basket.app.Services
import dev.nativestep.basket.auth.HttpAuthService
import dev.nativestep.basket.catalog.HttpProductService
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.MutableStateFlow

class BasketApplication : Application() {
    /** The core the UI draws. A nativestep session (debug builds) swaps in one built from fixtures. */
    val core = MutableStateFlow<AppCore?>(null)

    override fun onCreate() {
        super.onCreate()
        core.value = AppCore(Services(auth = HttpAuthService(), products = HttpProductService()), MainScope())
        NativeStepLauncher.start(this)
    }
}
