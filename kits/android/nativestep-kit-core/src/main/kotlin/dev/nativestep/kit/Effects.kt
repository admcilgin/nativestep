package dev.nativestep.kit

import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** Work that `update` returns instead of doing itself (R8). Its result goes back to `update` as a message. */
typealias Effect<M> = suspend () -> M

/** Runs a ViewModel's effects in [scope] and reports them to [Effects], which the protocol's `busy` comes from. */
class EffectRunner(private val scope: CoroutineScope) {
    fun <M> run(effect: Effect<M>, deliver: (M) -> Unit) {
        val counter = Effects.counter
        counter.incrementAndGet()
        scope.launch {
            try {
                deliver(effect())
            } finally {
                counter.decrementAndGet()
            }
        }
    }
}

/** Every in-flight effect of the current session. The host starts a fresh count with each session. */
object Effects {
    @Volatile
    internal var counter = AtomicInteger()
        private set

    val inFlight: Int get() = counter.get()

    /** Effects of the previous session finish counting on their own counter. */
    fun reset() {
        counter = AtomicInteger()
    }
}
