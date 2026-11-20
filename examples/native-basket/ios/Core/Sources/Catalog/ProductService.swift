import NativeStepKit

public struct Product: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var priceCents: Int
    public var description: String?
}

/// Names and parameters match the fixtures and the Android service exactly (R5).
public protocol ProductService: Sendable {
    func list() async -> Result<[Product], AppError>
    func detail(id: String) async -> Result<Product, AppError>
}
