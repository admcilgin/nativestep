package dev.nativestep.basket.shared

import dev.nativestep.kit.AppError

/** The texts the reference shows for each error code (lib/api.dart `errorMessage`). */
fun errorMessage(error: AppError): String = when (error.code) {
    "unauthorized" -> "Wrong email or password."
    "not_found" -> "This product is no longer available."
    "out_of_stock" -> "Some items are out of stock."
    else -> "Could not reach the server. Try again."
}

/** `$4.50` for 450 (lib/api.dart `formatPrice`). */
fun formatPrice(cents: Int): String = "$" + "${cents / 100}." + "%02d".format(cents % 100)
