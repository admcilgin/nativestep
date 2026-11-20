import Core
import SwiftUI

struct ProductListView: View {
    let vm: ProductListViewModel

    var body: some View {
        Group {
            if vm.listShown && vm.state.products.isEmpty {
                ScrollView {
                    Text("No products yet.")
                        .padding(24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .refreshable { await refresh() }
            } else if vm.listShown {
                List(vm.state.products, id: \.id) { product in
                    VStack(alignment: .leading) {
                        Text(product.name)
                        Text(formatPrice(product.priceCents)).foregroundStyle(.secondary)
                    }
                }
                .refreshable { await refresh() }
            } else if let error = vm.state.error, !vm.state.loading {
                VStack(spacing: 12) {
                    Text(errorMessage(error))
                    Button("Retry") { vm.send(.retry) }.buttonStyle(.bordered)
                }
            } else {
                ProgressView()
            }
        }
        .navigationTitle("Products")
    }

    private func refresh() async {
        vm.send(.refresh)
        // shortcut: polls the state the indicator waits on; use an async send if more screens refresh.
        while vm.state.loading { try? await Task.sleep(for: .milliseconds(100)) }
    }
}
