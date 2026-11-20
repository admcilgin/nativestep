import Core
import NativeStepKit

struct HTTPProductService: ProductService {
    func list() async -> Result<[Product], AppError> {
        await APIClient.shared.send("GET", "products")
    }
}
