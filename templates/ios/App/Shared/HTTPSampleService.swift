import Core
import Foundation
import NativeStepKit

/// The real service (R4): lives in Mobile, never runs in a behavior session.
struct HTTPSampleService: SampleService {
    var baseURL = URL(string: "https://api.example.com/")!

    func list(page: Int) async -> Result<SampleList, AppError> {
        let url = baseURL.appending(path: "items").appending(queryItems: [URLQueryItem(name: "page", value: "\(page)")])
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                return .failure(AppError(code: "http_\((response as? HTTPURLResponse)?.statusCode ?? 0)"))
            }
            return .success(try JSONDecoder().decode(SampleList.self, from: data))
        } catch {
            return .failure(AppError(code: "offline", message: error.localizedDescription))
        }
    }
}
