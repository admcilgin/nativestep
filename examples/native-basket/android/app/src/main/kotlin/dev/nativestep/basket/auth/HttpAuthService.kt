package dev.nativestep.basket.auth

import dev.nativestep.basket.shared.ApiClient
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class HttpAuthService : AuthService {
    @Serializable
    private data class Credentials(val email: String, val password: String)

    override suspend fun signIn(email: String, password: String): Result<User> =
        ApiClient.send("POST", "auth/login", User.serializer(), Json.encodeToString(Credentials.serializer(), Credentials(email, password)))
            .onSuccess { ApiClient.signedIn(it.token) }
}
