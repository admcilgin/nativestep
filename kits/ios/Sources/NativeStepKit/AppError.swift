/// The error every service returns. A fixture's `error` entry decodes into it (PROTOCOL.md §7).
public struct AppError: Error, Codable, Equatable, Sendable {
    public var code: String
    public var message: String?

    public init(code: String, message: String? = nil) {
        self.code = code
        self.message = message
    }
}
