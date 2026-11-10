import Core
import SwiftUI

/// Reads state and calls send, nothing else (R9).
struct SampleView: View {
    let vm: SampleViewModel

    var body: some View {
        List {
            Section {
                HStack(spacing: 24) {
                    Button("−") { vm.send(.decrement) }
                    Text("\(vm.state.count)").font(.largeTitle).monospacedDigit()
                    Button("+") { vm.send(.increment) }
                }
                .buttonStyle(.bordered)
            }
            Section {
                Button(vm.state.loading ? "Loading…" : "Load items") { vm.send(.load) }
                    .disabled(vm.state.loading)
                if let error = vm.state.error {
                    Text("Error: \(error.message ?? error.code)").foregroundStyle(.red)
                }
            }
            Section {
                ForEach(vm.state.items, id: \.id) { item in
                    Button(item.title) { vm.send(.openDetail(id: item.id)) }
                }
            }
        }
        .navigationTitle("Sample")
    }
}

struct SampleDetailView: View {
    let vm: SampleDetailViewModel

    var body: some View {
        Text("Item \(vm.state.id)")
            .font(.title)
            .navigationTitle("Item \(vm.state.id)")
    }
}
