import Core
import NativeStepKit

struct HTTPOrderService: OrderService {
    func place(items: [OrderItem]) async -> Result<PlacedOrder, AppError> {
        await APIClient.shared.send("POST", "orders", body: ["items": items])
    }
}
