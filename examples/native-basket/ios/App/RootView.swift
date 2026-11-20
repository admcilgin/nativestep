import Core
import NativeStepKit
import SwiftUI

/// Draws the navigator state from Core (R14); keeps no navigation state of its own.
struct RootView: View {
    let core: AppCore

    private var selectedTab: Binding<String> {
        Binding(get: { core.tabs.selected }, set: { core.tabs.select($0) })
    }

    var body: some View {
        if core.user == nil, let login = core.login {
            LoginView(vm: login)
        } else {
            TabView(selection: selectedTab) {
                ForEach(core.tabs.tabs.indices, id: \.self) { i in
                    let tab = core.tabs.tabs[i]
                    tabContent(tab.node)
                        .tabItem {
                            tab.id == "basket" ? Label("Basket", systemImage: "basket") : Label("Products", systemImage: "storefront")
                        }
                        .tag(tab.id)
                }
            }
        }
    }

    @ViewBuilder
    private func tabContent(_ node: any IntrospectionNodeProviding) -> some View {
        if let stack = node as? StackNavigator {
            StackView(stack: stack)
        } else if let vm = node as? BasketViewModel {
            BasketView(vm: vm)
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
        if let vm = screen as? ProductListViewModel {
            ProductListView(vm: vm)
        }
    }
}
