import Core
import SwiftUI

/// Lines and the total. Add one and remove one come with basket cp2, placing the order with cp3.
struct BasketView: View {
    let vm: BasketViewModel

    var body: some View {
        NavigationStack {
            Group {
                if vm.state.lines.isEmpty {
                    Text("Your basket is empty.")
                } else {
                    List(vm.state.lines, id: \.productId) { line in
                        VStack(alignment: .leading) {
                            Text(line.name)
                            Text("\(line.quantity) × \(formatPrice(line.priceCents))").foregroundStyle(.secondary)
                        }
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
