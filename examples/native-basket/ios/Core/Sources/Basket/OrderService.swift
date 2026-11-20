import NativeStepKit

public struct OrderItem: Codable, Equatable, Sendable {
    public var productId: String
    public var quantity: Int

    public init(productId: String, quantity: Int) {
        self.productId = productId
        self.quantity = quantity
    }
}

public struct PlacedOrder: Codable, Equatable, Sendable {
    public var id: String
}

/// Names and parameters match the fixtures and the Android service exactly (R5).
public protocol OrderService: Sendable {
    func place(items: [OrderItem]) async -> Result<PlacedOrder, AppError>
}
