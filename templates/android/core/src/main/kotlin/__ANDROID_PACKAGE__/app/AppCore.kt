package __ANDROID_PACKAGE__.app

import __ANDROID_PACKAGE__.sample.SampleCore
import __ANDROID_PACKAGE__.sample.SampleService
import dev.nativestep.kit.IntrospectionNode
import kotlinx.coroutines.CoroutineScope

/** Every external dependency of Core (R4). Mobile passes real implementations, Host fixture ones. */
class Services(val sample: SampleService)

/**
 * The single entry point (R3): builds everything and is the root node. Effects run in the scope.
 * Until the app's first feature gives it a shell of its own, the app is the template's Sample tree; that feature
 * replaces this class's body and keeps [SampleCore] for the conformance tests (COMPONENTS.md §6).
 */
class AppCore private constructor(val sample: SampleCore) : IntrospectionNode by sample {
    constructor(services: Services, scope: CoroutineScope) : this(SampleCore(services.sample, scope))

    /** Opens a deep link with the same stack the user would have reached by hand. Returns false for unknown links. */
    fun open(url: String): Boolean = sample.open(url)
}
