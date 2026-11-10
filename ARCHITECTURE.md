# Target architecture

This document defines the output of a migration. Whatever the source project looks like, the generated native projects have this structure. The rules are numbered, and `nativestep lint` and `step-arch-review` report their findings against these numbers.

Each rule says how it is checked:

- **compiler**: a violation of the project structure fails to compile
- **lint**: `nativestep lint` catches it deterministically
- **test**: behavior tests or conformance tests catch it
- **review**: the `step-arch-review` agents catch it

The compiled form of this document is the `Sample` screen in the templates (`templates/`). This document describes the shape. If the two disagree, both are fixed together.

## 1. Modules

Each platform has three parts:

| Part | Contains | iOS | Android |
|---|---|---|---|
| **Core** | ViewModels, navigation state, service protocols, domain models, deep link resolution, business rules | `ios/Core` Swift package; also builds on macOS | `android/core`, a pure Kotlin/JVM module |
| **Mobile** | Views, real service implementations (network, Keychain, push, camera…), app entry point | `ios/App` (XcodeGen) | `android/app` |
| **Host** | Builds Core with fixture services and speaks the protocol | the `nativestep-host` executable in `ios/Core` | `android/host`, a JVM application |

**R1 · Core does not depend on the platform.** *lint*
Core does not import UIKit, SwiftUI, AppKit, `android.*` or `androidx.*`. On Android, Core is a pure JVM module, so these imports do not compile anyway; on iOS, lint catches them.

**R2 · Dependencies point one way.** *compiler*
Mobile → Core and Host → Core. Core knows neither Mobile nor Host.

**R3 · Core is built from a single entry point.** *test*
`AppCore(services:)` takes every service and returns the root node. Mobile calls it with real services, Host with fixture services. There is no other difference between the two setups. On Android it also takes the `CoroutineScope` its effects run in.

## 2. Services

**R4 · Every external dependency sits behind a protocol in Core and is passed in through the constructor.** *review*
Network, storage, Keychain, feature flags, analytics, location, push, payments. No singletons and no DI framework. Real implementations live in Mobile, fixture implementations in Host.

**R5 · Services have the same shape on both platforms.** *lint · test*
Service names, method names and parameter names are identical on both platforms, and fixtures match on these names (PROTOCOL.md §7). The JSON shape of service results and domain models is the same in the fixtures and on both platforms. Lint compares the fields of `Services` and, for each service, its methods and parameter names; the tests cover the JSON shapes.

**R6 · Time, randomness and id generation are services too.** *lint*
Core does not call `Date()`, `UUID()`, `.random`, `System.currentTimeMillis()` or `Instant.now()` directly; it uses the `Clock` and `IdGenerator` services. This way the same fixtures always produce the same state.

## 3. ViewModel

**R7 · Every screen has a ViewModel, and its shape is fixed.** *review*

- `State`: everything shown on the screen; a serializable value type
- `Action`: the public surface; an enum or sealed interface
- `Message`: an internal type wrapping Actions and service results
- `send(action)`: the single entry point
- `update(message)`: the single reducer

**R8 · State changes only inside `update`.** *review*
Service calls happen in the effects that `update` returns; their results come back to `update` as a `Message`. The kit's `EffectRunner` runs the effects. The protocol's `busy` flag comes from there.

**R9 · The view only reads `state` and calls `send`.** *review*
No business decisions are made in the view. Shared transformations such as money and date formatting live in Core under `Shared/`.

### iOS

```swift
// ios/Core/Sources/Catalog/CatalogViewModel.swift
import Foundation
import NativeStepKit

@MainActor @Observable
public final class CatalogViewModel {
    public struct State: Codable, Equatable, Sendable {
        public var items: [Product] = []
        public var page = 0
        public var loading = false
        public var error: AppError?
    }

    public enum Action: Equatable, Sendable {
        case load
        case loadNextPage
        case openProduct(id: String)
    }

    enum Message: Sendable {
        case action(Action)
        case loaded(Result<ProductPage, AppError>)
    }

    public private(set) var state = State()
    @ObservationIgnored let effects = EffectRunner()   // counts in-flight effects → protocol "busy"
    private let products: any ProductService
    private unowned let router: any Router              // AppCore owns the screens

    public init(products: any ProductService, router: any Router) {
        self.products = products
        self.router = router
    }

    public func send(_ action: Action) { handle(.action(action)) }

    private func handle(_ message: Message) {
        for effect in update(message) {
            effects.run(effect) { [weak self] in self?.handle($0) }
        }
    }

    /// State changes only here (R8).
    private func update(_ message: Message) -> [Effect<Message>] {
        switch message {
        case .action(.load), .action(.loadNextPage):
            guard !state.loading else { return [] }
            state.loading = true
            let page = state.page + 1
            return [{ [products] in .loaded(await products.list(page: page)) }]
        case .action(.openProduct(let id)):
            router.go(.product(id: id))
            return []
        case .loaded(.success(let result)):
            state.loading = false
            state.page = result.page
            state.items += result.items
            return []
        case .loaded(.failure(let error)):
            state.loading = false
            state.error = error
            return []
        }
    }
}
```

### Android

```kotlin
// android/core/src/main/kotlin/<package>/catalog/CatalogViewModel.kt  (imports omitted)
class CatalogViewModel(
    private val products: ProductService,
    private val router: Router,
    internal val effects: EffectRunner,          // counts in-flight effects → protocol "busy"
) {
    @Serializable
    data class State(
        val items: List<Product> = emptyList(),
        val page: Int = 0,
        val loading: Boolean = false,
        val error: AppError? = null,
    )

    sealed interface Action {
        data object Load : Action
        data object LoadNextPage : Action
        data class OpenProduct(val id: String) : Action
    }

    private sealed interface Message {
        data class Act(val action: Action) : Message
        data class Loaded(val result: Result<ProductPage>) : Message
    }

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    fun send(action: Action) = handle(Message.Act(action))

    private fun handle(message: Message) {
        update(message).forEach { effect -> effects.run(effect) { handle(it) } }
    }

    /** State changes only here (R8). */
    private fun update(message: Message): List<Effect<Message>> = when (message) {
        is Message.Act -> when (val action = message.action) {
            Action.Load, Action.LoadNextPage ->
                if (_state.value.loading) emptyList() else {
                    _state.update { it.copy(loading = true) }
                    val page = _state.value.page + 1
                    listOf(suspend { Message.Loaded(products.list(page = page)) })
                }
            is Action.OpenProduct -> {
                router.go(Route.Product(action.id))
                emptyList()
            }
        }
        is Message.Loaded -> {
            message.result
                .onSuccess { r -> _state.update { it.copy(loading = false, page = r.page, items = it.items + r.items) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = AppError.from(e)) } }
            emptyList()
        }
    }
}
```

## 4. Introspection

**R10 · Every ViewModel has a node.** *lint*
On iOS this is an extension in a separate file, `XViewModel+Introspection.swift`; on Android it is a separate `XNode` class. Kotlin extensions cannot implement interfaces, so the two platforms differ here.

**R11 · Everything visible is in `state`; everything the user can do is in `actions`.** *review*
A node holds no UI logic. It never changes the ViewModel directly; it only calls `send`.

**R12 · Names are identical on both platforms.** *lint*
Node names are PascalCase (`ProductDetail`), action names are lowerCamelCase (`toggleFavorite`), and state fields are JSON keys. Kotlin's `Action.ToggleFavorite` is published on the protocol as `toggleFavorite`. Lint compares the node and action sets of the two platforms.

**R13 · A parameterized action defines its input with a schema.** *test*
Input is validated against the schema before it reaches the ViewModel; input that does not match gets an `invalid_input` error (PROTOCOL.md §5).

```swift
// ios/Core/Sources/Catalog/CatalogViewModel+Introspection.swift
import NativeStepKit

extension CatalogViewModel: IntrospectionNodeProviding {
    public var introspectionNode: IntrospectionNode {
        IntrospectionNode(name: "Catalog", state: state, actions: [
            NodeAction("load", title: "Load") { [weak self] in self?.send(.load) },
            NodeAction("loadNextPage", title: "Next page") { [weak self] in self?.send(.loadNextPage) },
            NodeAction("openProduct", title: "Open product", input: OpenProductInput.self) { [weak self] input in
                self?.send(.openProduct(id: input.id))
            },
        ])
    }
}

struct OpenProductInput: NodeInput {
    var id: String
    static let schema: InputSchema = .object(["id": .string(minLength: 1)])
}
```

```kotlin
// android/core/src/main/kotlin/<package>/catalog/CatalogNode.kt
class CatalogNode(val vm: CatalogViewModel) : IntrospectionNode {   // views draw vm.state
    override val name = "Catalog"
    override fun state(): JsonElement = NodeJson.encodeToJsonElement(vm.state.value)   // defaults written, nulls left out
    override val actions = listOf(
        NodeAction("load", "Load") { vm.send(CatalogViewModel.Action.Load) },
        NodeAction("loadNextPage", "Next page") { vm.send(CatalogViewModel.Action.LoadNextPage) },
        NodeAction("openProduct", "Open product", OpenProductInput.serializer(), OpenProductInput.schema) {
            vm.send(CatalogViewModel.Action.OpenProduct(it.id))
        },
    )
}
```

## 5. Navigation

**R14 · Navigation is state, and it lives in Core.** *review*
Use the kit's `StackNavigator`, `TabNavigator` and `ModalNavigator`; each one is a node. Views draw the navigator state and keep no navigation state of their own. Screens navigate with `Router.go(route)`; `Router` and `Route` are defined in each app's Core, because routes are app-specific.

A navigator's child is the branch on screen: the top of a stack, the selected tab, or the presented modal (its base when nothing is presented). A typical tree is App → Modal → Tabs → Stack → screen. While a modal is up, the tabs and stacks under it are off the path, so their lent actions are unavailable.

**R15 · Navigators lend actions.** *test*
Stack lends `goBack`, Tab lends `selectTab(tab)`, Modal lends `dismiss`. The actions of the navigators above the focused node can be used too (PROTOCOL.md §4).

**R16 · Deep links are resolved in Core.** *test*
URL → `Route` → navigator state. The protocol's `start` command can begin with a deep link.

## 6. Features

**R17 · Every feature has its own folder.** *lint*
`ios/Core/Sources/<Feature>/`, `ios/App/<Feature>/`, `android/core/src/main/kotlin/<package>/<feature>/`, `android/app/src/main/kotlin/<package>/<feature>/`. Shared code lives under `Shared/`. Lint checks that every Core file is in a feature folder, that both platforms have the same feature folders, and that every App folder is a Core feature or `Shared`. The app's entry point and root view stay at the top of the App module.

**R18 · Features do not construct each other's ViewModels.** *review*
Moving between features goes through `Route`; shared use goes through `Shared/` and service protocols. Parallel agents not touching the same files depends on this rule.

## 7. Network and release

**R19 · There is no network in a behavior session.** *test*
The host turns on the network guard. Any request attempted in a session poisons the session (PROTOCOL.md §6).

**R20 · The protocol server does not ship in release builds.** *lint*
On iOS, the code that starts the server is inside `#if DEBUG`. On Android, the server is a `debugImplementation` dependency.

## 8. Test layers

- **Behavior tests** (most tests): run over the protocol, one file for both platforms. Business rules, validation, navigation, error states and user flows are tested here.
- **Unit tests** (few): pure helpers such as formatters, parsers and pagination. Written with each platform's own test tooling.
- **Visual checks**: `nativestep shot` and the UI review gate. No pixel comparison.
- **Real service tests** (thin): fixtures sit at the service boundary, so real implementations such as network and Keychain do not run in behavior tests. They are exercised in Mobile with their own small integration tests.

## 9. Platform defaults

| | iOS | Android |
|---|---|---|
| Language | Swift 6 | Kotlin 2.x |
| UI | SwiftUI | Jetpack Compose |
| Minimum version | iOS 17 | minSdk 26 |
| State observation | Observation (`@Observable`) | `StateFlow` |
| Concurrency | async/await, `@MainActor` ViewModels | coroutines, the kit's `EffectRunner` |
| Serialization | Codable | kotlinx.serialization |
| Project generation | XcodeGen (`project.yml`) | Gradle Kotlin DSL and version catalog |

A project decision that departs from these defaults is written to that project's `spec/memory.md`.
