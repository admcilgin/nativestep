package dev.nativestep.basket.host

import dev.nativestep.kit.host.NativeStepHost

/** The headless host: speaks the protocol on stdio. */
fun main() {
    NativeStepHost(app = "Basket", makeRoot = ::hostRoot).runStdio()
}
