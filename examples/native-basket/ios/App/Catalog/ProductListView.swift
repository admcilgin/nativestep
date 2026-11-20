import Core
import SwiftUI

struct ProductListView: View {
    let vm: ProductListViewModel

    var body: some View {
        Group {
            if vm.listShown {
                Group {
                    if vm.state.products.isEmpty {
                        message("No products yet.")
                    } else if vm.state.results.isEmpty {
                        message("No products match \"\(vm.state.query.trimmingCharacters(in: .whitespacesAndNewlines))\".")
                    } else {
                        List(vm.state.results, id: \.id) { product in
                            // A button, not a NavigationLink: the push happens in Core (R14); the chevron is drawn here.
                            Button { vm.send(.openProduct(id: product.id)) } label: {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(product.name)
                                        Text(formatPrice(product.priceCents)).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .refreshable { await refresh() }
                .searchable(text: query, prompt: "Search products")
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
        .toolbar {
            Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right") { vm.send(.signOut) }
        }
    }

    private var query: Binding<String> {
        Binding(get: { vm.state.query }, set: { vm.send(.search(query: $0)) })
    }

    private func message(_ text: String) -> some View {
        ScrollView {
            Text(text)
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func refresh() async {
        vm.send(.refresh)
        // shortcut: polls the state the indicator waits on; use an async send if more screens refresh.
        while vm.state.loading { try? await Task.sleep(for: .milliseconds(100)) }
    }
}
