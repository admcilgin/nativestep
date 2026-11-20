import Core
import SwiftUI

struct BasketView: View {
    let vm: BasketViewModel

    var body: some View {
        NavigationStack {
            Text("Your basket is empty.")
                .navigationTitle("Basket")
        }
    }
}
