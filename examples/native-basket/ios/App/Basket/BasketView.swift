import Core
import SwiftUI

/// Lines with add one and remove one, the order error, the total and Place order.
struct BasketView: View {
    let vm: BasketViewModel

    var body: some View {
        NavigationStack {
            Group {
                if vm.state.lines.isEmpty {
                    Text("Your basket is empty.")
                } else {
                    List(vm.state.lines, id: \.productId) { line in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(line.name)
                                Text("\(line.quantity) × \(formatPrice(line.priceCents))").foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Remove one", systemImage: "minus") { vm.send(.removeOne(productId: line.productId)) }
                            Button("Add one", systemImage: "plus") { vm.send(.addOne(productId: line.productId)) }
                        }
                        .labelStyle(.iconOnly)
                        .buttonStyle(.borderless)
                    }
                    .safeAreaInset(edge: .bottom) {
                        VStack(alignment: .leading, spacing: 8) {
                            if let error = vm.state.error {
                                Text(errorMessage(error)).foregroundStyle(.red)
                            }
                            Text("Total \(formatPrice(vm.state.totalCents))").font(.headline)
                            Button { vm.send(.placeOrder) } label: {
                                Text("Place order").frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                            .disabled(vm.state.placing)
                        }
                        .padding()
                        .background(.bar)
                    }
                }
            }
            .navigationTitle("Basket")
        }
    }
}
