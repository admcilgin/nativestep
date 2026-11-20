import Core
import NativeStepKit

struct HTTPAuthService: AuthService {
    private struct Credentials: Encodable, Sendable {
        var email: String
        var password: String
    }

    func signIn(email: String, password: String) async -> Result<User, AppError> {
        let result: Result<User, AppError> = await APIClient.shared.send("POST", "auth/login", body: Credentials(email: email, password: password))
        if case .success(let user) = result { await APIClient.shared.signedIn(token: user.token) }
        return result
    }
}
