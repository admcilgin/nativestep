import NativeStepKit

public struct SampleItem: Codable, Equatable, Sendable {
    public var id: String
    public var title: String
}

public struct SampleList: Codable, Equatable, Sendable {
    public var items: [SampleItem]
}

/// Names and parameters match the fixtures and the Android service exactly (R5).
public protocol SampleService: Sendable {
    func list(page: Int) async -> Result<SampleList, AppError>
}
