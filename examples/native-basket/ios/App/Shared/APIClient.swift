import Foundation
import NativeStepKit

/// The real HTTP client (R4): lives in Mobile, never runs in a behavior session. It holds the bearer token
/// after sign-in, so service methods do not take it (profile: Services).
actor APIClient {
    static let shared = APIClient()

    private let baseURL = URL(string: "https://api.basket.example/v1/")!
    private var token: String?

    func signedIn(token: String) { self.token = token }

    func send<T: Decodable & Sendable>(_ method: String, _ path: String, body: (some Encodable & Sendable)? = String?.none) async -> Result<T, AppError> {
        var request = URLRequest(url: baseURL.appending(path: path), timeoutInterval: 10)
        request.httpMethod = method
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONEncoder().encode(body)
        }
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let status = (response as? HTTPURLResponse)?.statusCode else {
            return .failure(AppError(code: "network"))
        }
        switch status {
        case 200..<300:
            guard let value = try? JSONDecoder().decode(T.self, from: data) else { return .failure(AppError(code: "network")) }
            return .success(value)
        case 401: return .failure(AppError(code: "unauthorized"))
        case 404: return .failure(AppError(code: "not_found"))
        case 409: return .failure(AppError(code: "out_of_stock"))
        default: return .failure(AppError(code: "network"))
        }
    }
}
