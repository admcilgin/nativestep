import NativeStepKit

/// The texts the reference shows for each error code (lib/api.dart `errorMessage`).
func errorMessage(_ error: AppError) -> String {
    switch error.code {
    case "unauthorized": "Wrong email or password."
    case "not_found": "This product is no longer available."
    case "out_of_stock": "Some items are out of stock."
    default: "Could not reach the server. Try again."
    }
}

/// `$4.50` for 450 (lib/api.dart `formatPrice`).
func formatPrice(_ cents: Int) -> String {
    "$\(cents / 100).\(String(format: "%02d", cents % 100))"
}
