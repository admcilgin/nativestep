import Core
import SwiftUI

/// Lines with add one and remove one, and the total. Placing the order comes with basket cp3.
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
                        Text("Total \(formatPrice(vm.state.totalCents))")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(.bar)
                    }
                }
            }
            .navigationTitle("Basket")
        }
    }
}
