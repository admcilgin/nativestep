import Core
import NativeStepKit
import SwiftUI

/// Draws the navigator state from Core (R14); keeps no navigation state of its own.
struct RootView: View {
    let core: AppCore

    private var selectedTab: Binding<String> {
        Binding(get: { core.tabs.selected }, set: { core.tabs.select($0) })
    }

    private var presented: Binding<Bool> {
        Binding(get: { core.modal.presented != nil }, set: { if !$0 { core.modal.dismiss() } })
    }

    var body: some View {
        TabView(selection: selectedTab) {
            ForEach(core.tabs.tabs.indices, id: \.self) { i in
                let tab = core.tabs.tabs[i]
                tabContent(tab.node)
                    .tabItem { tab.id == "about" ? Label("About", systemImage: "info.circle") : Label("Sample", systemImage: "list.bullet") }
                    .tag(tab.id)
            }
        }
        .sheet(isPresented: presented) {
            if let vm = core.modal.presented as? LicenseViewModel {
                NavigationStack { LicenseView(vm: vm) }
            }
        }
    }

    @ViewBuilder
    private func tabContent(_ node: any IntrospectionNodeProviding) -> some View {
        if let stack = node as? StackNavigator {
            StackView(stack: stack)
        } else if let vm = node as? AboutViewModel {
            NavigationStack { AboutView(vm: vm) }
        }
    }
}

struct StackView: View {
    let stack: StackNavigator

    /// The pushed screens, as indices into `stack.screens`. Popping in the UI pops the stack.
    private var path: Binding<[Int]> {
        Binding(
            get: { Array(stack.screens.indices.dropFirst()) },
            set: { newPath in
                while stack.screens.count - 1 > newPath.count { stack.goBack() }
            }
        )
    }

    var body: some View {
        NavigationStack(path: path) {
            screen(at: 0)
                .navigationDestination(for: Int.self) { screen(at: $0) }
        }
    }

    @ViewBuilder
    private func screen(at index: Int) -> some View {
        let screen = stack.screens.indices.contains(index) ? stack.screens[index] : nil
        if let vm = screen as? SampleViewModel {
            SampleView(vm: vm)
        } else if let vm = screen as? SampleDetailViewModel {
            SampleDetailView(vm: vm)
        }
    }
}

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

struct AboutView: View {
    let vm: AboutViewModel

    var body: some View {
        List {
            Button("Show license") { vm.send(.openLicense) }
        }
        .navigationTitle("About")
    }
}

struct LicenseView: View {
    let vm: LicenseViewModel

    var body: some View {
        Text("MIT License")
            .padding()
            .navigationTitle("License")
    }
}
