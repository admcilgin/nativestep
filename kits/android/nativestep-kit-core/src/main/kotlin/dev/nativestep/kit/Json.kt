package dev.nativestep.kit

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * The JSON settings every node's state is encoded with, so both platforms publish the same shape:
 * default values are written, `null` values are left out (PROTOCOL.md §4).
 */
val NodeJson = Json {
    encodeDefaults = true
    explicitNulls = false
}

/** The error every service returns. A fixture's `error` entry decodes into it (PROTOCOL.md §7). */
@Serializable
data class AppError(val code: String, val message: String? = null) {
    companion object {
        fun from(e: Throwable): AppError = (e as? AppException)?.error ?: AppError("internal", e.message)
    }
}

/** Carries an [AppError] through Kotlin's `Result`. */
class AppException(val error: AppError) : Exception(error.message ?: error.code)
