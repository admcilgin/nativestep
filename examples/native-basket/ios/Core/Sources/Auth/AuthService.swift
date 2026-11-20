import NativeStepKit

public struct User: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var token: String

    public init(id: String, name: String, token: String) {
        self.id = id
        self.name = name
        self.token = token
    }
}

/// Names and parameters match the fixtures and the Android service exactly (R5).
public protocol AuthService: Sendable {
    func signIn(email: String, password: String) async -> Result<User, AppError>
}
