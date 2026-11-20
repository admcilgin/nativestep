import Core
import SwiftUI

struct ProductListView: View {
    let vm: ProductListViewModel

    var body: some View {
        Group {
            if vm.state.loading && vm.state.products.isEmpty {
                ProgressView()
            } else if let error = vm.state.error {
                Text(errorMessage(error))
            } else if vm.state.products.isEmpty {
                Text("No products yet.")
            } else {
                List(vm.state.products, id: \.id) { product in
                    VStack(alignment: .leading) {
                        Text(product.name)
                        Text(formatPrice(product.priceCents)).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Products")
    }
}
