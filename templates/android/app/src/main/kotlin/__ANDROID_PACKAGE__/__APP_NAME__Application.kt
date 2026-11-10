package __ANDROID_PACKAGE__

import android.app.Application
import __ANDROID_PACKAGE__.app.AppCore
import __ANDROID_PACKAGE__.app.Services
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.MutableStateFlow

class __APP_NAME__Application : Application() {
    /** The core the UI draws. A nativestep session (debug builds) swaps in one built from fixtures. */
    val core = MutableStateFlow<AppCore?>(null)

    override fun onCreate() {
        super.onCreate()
        core.value = AppCore(Services(sample = HttpSampleService()), MainScope())
        NativeStepLauncher.start(this)
    }
}
