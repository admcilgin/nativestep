package dev.nativestep.basket.auth

import kotlinx.serialization.Serializable

@Serializable
data class User(val id: String, val name: String, val token: String)

/** Names and parameters match the fixtures and the iOS service exactly (R5). */
interface AuthService {
    suspend fun signIn(email: String, password: String): Result<User>
}
