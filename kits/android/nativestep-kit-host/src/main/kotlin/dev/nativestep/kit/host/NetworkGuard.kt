package dev.nativestep.kit.host

import java.io.IOException
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.ProxySelector
import java.net.SocketAddress
import java.net.URI
import java.util.concurrent.atomic.AtomicReference

/**
 * Blocks real network requests while a session is running (R19, PROTOCOL.md §6). This is the second line of
 * defense: fixture services never touch the network, so a request here means code bypassed a service.
 * During a session every connection goes to a closed local port, so nothing leaves the machine.
 * Outside a session (a debug app used by hand) the previous selector answers.
 * shortcut: catches HttpURLConnection, java.net.http, OkHttp and plain sockets that honor the default
 * ProxySelector; code that passes Proxy.NO_PROXY gets through. Tighten when a pilot app needs it.
 */
internal object NetworkGuard : ProxySelector() {
    @Volatile private var active = false
    private val blocked = AtomicReference<String?>(null)
    private val nowhere = InetSocketAddress("127.0.0.1", 9)
    private var previous: ProxySelector? = null

    fun install() {
        if (getDefault() === this) return
        previous = getDefault()
        setDefault(this)
    }

    /** Starts blocking (and forgets earlier attempts) or stops blocking. */
    fun activate(on: Boolean) {
        blocked.set(null)
        active = on
    }

    /** The URL of the first blocked request of the session. */
    val firstBlocked: String? get() = blocked.get()

    override fun select(uri: URI): List<Proxy> {
        if (!active) return previous?.select(uri) ?: listOf(Proxy.NO_PROXY)
        blocked.compareAndSet(null, uri.toString())
        val type = if (uri.scheme == "socket") Proxy.Type.SOCKS else Proxy.Type.HTTP
        return listOf(Proxy(type, nowhere))
    }

    override fun connectFailed(uri: URI, sa: SocketAddress, ioe: IOException) {
        if (!active) previous?.connectFailed(uri, sa, ioe)
    }
}
