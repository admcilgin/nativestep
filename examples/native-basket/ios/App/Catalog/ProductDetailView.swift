import Core
import SwiftUI

struct ProductDetailView: View {
    let vm: ProductDetailViewModel

    var body: some View {
        Group {
            if let product = vm.state.product {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(formatPrice(product.priceCents)).font(.title2)
                        Text(product.description)
                        Button { vm.send(.addToBasket) } label: {
                            Label("Add to basket", systemImage: "cart.badge.plus").frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .padding(.top, 12)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else if let error = vm.state.error {
                Text(errorMessage(error))
            } else {
                ProgressView()
            }
        }
        .navigationTitle(vm.state.product?.name ?? "")
        .navigationBarTitleDisplayMode(.inline)
    }
}
