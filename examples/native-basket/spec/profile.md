# Basket profile

Approved:
Source: `../flutter-riverpod` (examples/flutter-riverpod), at reflex `c69b816` plus the uncommitted example

How the source app works and how it maps to the target. Written by step-adopt, completed by step-reference, read by every later skill. Facts carry file paths; proposals are marked `Decision:`.

## Entry and configuration

- One entry point, no flavors: `lib/main.dart` runs `ProviderScope(child: BasketApp())`.
- The only configuration is the API base URL `https://api.basket.example/v1` and a 10 s connect timeout, both hard-coded in `dioProvider` (`lib/api.dart`). No dart-defines, environment files or feature flags.
- Nothing runs before the first frame besides `runApp`.
- Identity: the store id is `dev.nativestep.examples.basket` (`ios/Runner.xcodeproj`); the app has no Android project. The native app uses `dev.nativestep.basket` on both platforms (`nativestep.json`), so both can sit on one simulator. Decision: the native app ships beside the example, not in its place, so the id stays.

## State

- State lives in Riverpod 3 providers (`flutter_riverpod` 3.5.0):
  - `authControllerProvider`: `AsyncNotifier<User?>`, the signed-in user (`lib/auth/auth_controller.dart`).
  - `productsProvider`: `FutureProvider<List<Product>>`; `productProvider`: `FutureProvider.family<Product, String>` (`lib/products/product_repository.dart`).
  - `basketControllerProvider`: `Notifier<List<BasketLine>>`; `checkoutControllerProvider`: `AsyncNotifier<String?>`, the id of the order just placed (`lib/basket/basket_controller.dart`).
  - `routerProvider`: the `GoRouter` (`lib/app.dart`).
- Widgets call `ref.read(<provider>.notifier).<method>()` (login, add, remove, placeOrder, logout), `ref.refresh`/`ref.invalidate` (product list), or `context.go` (open a product). Screens rebuild through `ref.watch`.
- Outside the widget tree: a `ProviderContainer` passed in with `UncontrolledProviderScope` gives `read`, `refresh` and `invalidate` on every provider, the same calls the widgets make.
- Widget-only state:
  - Login's email and password are `TextEditingController`s in `_LoginScreenState` (`lib/auth/login_screen.dart`). The submit action takes them as input, so Login stays `driven`.
  - Product detail's "added to basket" snackbar (`lib/products/product_detail_screen.dart`). Decision: transient feedback, not state; the basket count shows the effect.
  - The basket badge on the tab bar (`HomeShell`, `lib/app.dart`) is computed from the basket. Decision: not on the `Tabs` node (navigators have fixed state, PROTOCOL.md §4); tests read `count` on Basket, the badge goes to UI review.
- Library behavior (Riverpod 3.5.0):
  - **Automatic retry.** A provider whose build throws is rebuilt up to 10 times, 200 ms doubling to 6.4 s (`ProviderContainer.defaultRetry`); `ApiException` is an `Exception`, so it is retried. Meanwhile the state is `AsyncLoading` and the screen shows a spinner for about 30 s before the error. Applies to `productsProvider` and `productProvider`; not to login or checkout, which catch with `AsyncValue.guard`. Decision: the native app does not reproduce it; the binding turns it off (`ProviderContainer(retry: …)`), so an error fixture shows the error at once.
  - **Caching.** No provider is `autoDispose`: the product list and each product's details are fetched once per app run and kept, also across sign-out. Opening a product a second time does not refetch. Decision: the native app keeps the list and details for the session the same way.
  - **Refresh keeps data.** Pull to refresh (`ref.refresh(productsProvider.future)`) keeps the list on screen while reloading (`when` skips loading on refresh); Retry after an error (`ref.invalidate`) shows the spinner. Decision: reproduce both.
  - **Paused listeners.** Subscriptions in hidden routes are paused (`TickerMode`); nothing visible depends on it. Not reproduced.

## Dependency wiring

- Each repository is a `Provider` that builds it from `dioProvider`: `authRepositoryProvider`, `productRepositoryProvider`, `orderRepositoryProvider`. Controllers read them with `ref.read`/`ref.watch`.
- Injection point: provider overrides on a fresh `ProviderContainer` (`authRepositoryProvider.overrideWithValue(…)` and the other two). With all three overridden, `dioProvider` is never read, so no real HTTP client is built.
- The app can be built twice in one process: all state is in the container; there are no globals, singletons or static caches. A new container and a new key give a fresh app.

## Services

| Source class and method | Parameters | Returns | Errors | Target service and method | Target parameters |
|---|---|---|---|---|---|
| `AuthRepository.login` (`lib/auth/auth_repository.dart`) | `email` (trimmed by `AuthController.login`), `password` | `User {id, name, token}` | `unauthorized`, `network` | `AuthService.signIn` | `email`, `password` |
| `ProductRepository.fetchProducts` (`lib/products/product_repository.dart`) | — | `List<Product>` | `unauthorized`, `network` | `ProductService.list` | — |
| `ProductRepository.fetchProduct` | `id` | `Product` | `not_found`, `network` | `ProductService.detail` | `id` |
| `OrderRepository.placeOrder` (`lib/basket/order_repository.dart`) | `List<BasketLine>` | order id `String` | `out_of_stock`, `unauthorized`, `network` | `OrderService.place` | `items` |

- Decision: the target names above. `signIn` matches the button; `place` reads as `orders.place(items:)`.
- JSON shapes on the target, which the fixtures use:
  - `AuthService.signIn` → `{ "id": "u1", "name": "Ada", "token": "t1" }`
  - `ProductService.list` → `[ { "id": "tea", "name": "Tea", "priceCents": 450, "description": "…" } ]`; `detail` → one such object. `description` may be absent (the source reads it as `''`).
  - `OrderService.place` takes `items: [ { "productId": "tea", "quantity": 2 } ]` in basket order and returns `{ "id": "o1" }`.
  - Decision: prices stay integer cents (`priceCents`), as in the source.
- Errors: repositories turn every `DioException` into `ApiException(code)` (`lib/api.dart`): HTTP 401 → `unauthorized`, 404 → `not_found`, 409 → `out_of_stock`, anything else → `network`. Screens show `errorMessage(code)`. Fixture `error.code` uses these four codes; any other code behaves as `network`. Decision: node state carries `error: { code }` only; the message text is a mapping in Core's `Shared/` and goes to UI review.
- The bearer token (`lib/api.dart` interceptor) is attached to every request after sign-in. Decision: on the target, the real HTTP client in Mobile holds the token; service methods do not take it, so it is not in the fixtures.
- No clock, random or id generation anywhere in `lib/`. No `Clock` or `IdGenerator` services.

## Navigation

- Routes, all in `routerProvider` (`lib/app.dart`):

  | Route | Parameters | Screen |
  |---|---|---|
  | `/login` | — | `LoginScreen` |
  | `/products` | — | `ProductListScreen`, products branch of the shell |
  | `/products/:id` | `id` | `ProductDetailScreen`, pushed on the products branch |
  | `/basket` | — | `BasketScreen`, basket branch of the shell |

- Nesting: `/login` stands alone. The rest sit in a `StatefulShellRoute.indexedStack` (`HomeShell`) with two branches, each with its own navigator; the selected branch keeps its stack when the other tab is selected. Tapping the selected tab again returns that branch to its first route (`goBranch(i, initialLocation: i == currentIndex)`).
- The "Order placed" dialog (`lib/basket/basket_screen.dart`) is a `showDialog` on the root navigator, shown when `checkoutControllerProvider` gets a new order id; closing it calls `acknowledge()`, which clears the id.
- Guard: `redirect` sends every location to `/login` while signed out and `/login` to `/products` while signed in, re-evaluated when the auth state changes. Signing out therefore leaves the shell at once. The basket and the product cache survive sign-out (no provider is reset).
- Deep links: none. `Info.plist` has no URL types or associated domains and the app has no Android project. After sign-in the redirect always lands on `/products`, so a start route would be lost anyway.
- Outside the widget tree: `routerProvider` gives the router; `router.routerDelegate.currentConfiguration.uri` is the current location, `router.go` and `router.pop` navigate, `router.routerDelegate.navigatorKey` is the root navigator. The selected tab and `goBranch` are on the `StatefulNavigationShell` that `HomeShell` receives as `shell`.
- Decision: the target navigator tree is

  ```
  App ─┬─ Login                                  (signed out)
       └─ Modal ─┬─ Tabs ─┬─ products: Stack → ProductList → ProductDetail
                 │        └─ basket: Basket
                 └─ OrderPlaced                  (presented)
  ```

  `App` switches its child on the auth state, as the redirect does. Tab ids are `products` and `basket`.

## Native code and assets

- `ios/Runner/AppDelegate.swift`, `SceneDelegate.swift` and `Runner-Bridging-Header.h` are the Flutter template; no platform channels (`raw.nativeCode`). Nothing to replace.
- No plugins beyond `dio`, `flutter_riverpod` and `go_router`.
- No fonts or images (`raw.assets` is 0); icons are Material icons. The theme is Material 3 seeded from teal.

## Node tree

Written by step-reference. The target names the binding publishes, which the tests and both native apps use.

| Node | Path | State fields | Actions (input) | Source |
|---|---|---|---|---|
| Login | App › Login | `loading`, `error?` | `signIn` (`{ email, password }`, strings) | `lib/auth/login_screen.dart` |
| ProductList | App › Modal › Tabs › Stack › ProductList | `products` (`[{id, name, priceCents}]`), `loading`, `error?` | `openProduct` (`{ id }`, one of the listed ids), `refresh` (while the list shows), `retry` (while the error shows), `signOut` | `lib/products/product_list_screen.dart` |
| ProductDetail | App › Modal › Tabs › Stack › ProductDetail | `id`, `product?` (`{id, name, priceCents, description}`), `loading`, `error?` | `addToBasket` (while the product shows) | `lib/products/product_detail_screen.dart` |
| Basket | App › Modal › Tabs › Basket | `lines` (`[{productId, name, priceCents, quantity}]`), `count`, `totalCents`, `placing`, `error?` | `addOne` (`{ productId }`), `removeOne` (`{ productId }`), both one of the lines' ids, `placeOrder` (while lines exist and not placing) | `lib/basket/basket_screen.dart` |
| OrderPlaced | App › Modal › OrderPlaced | `orderId` | — (Modal lends `dismiss`, the OK button) | `lib/basket/basket_screen.dart` |

Navigators: `Modal` lends `dismiss` while OrderPlaced is up; `Tabs` lends `selectTab` (`products`, `basket`); `Stack` lends `goBack` on ProductDetail.

- `error` shows only where the screen shows it: on Basket only while there are lines.
- `loading` on ProductList is also true during a pull-to-refresh, while the old list stays in `products`.
- Ids in input schemas are limited to what is on screen, because the app offers a tile or a button only for those.
- `addToBasket` does not show the snackbar (a decision above), so reference screenshots of ProductDetail lack it.

Checked on the iOS simulator (2026-11-20) with `spec/fixtures/reference/shop.json` and `errors.json`: every screen reached, every action in the table performed, the four error codes shown where the profile says, `fixture_missing` on a missing fixture, `bad_request` for a start route, tab memory and re-tap reset on the products tab. All five screens are `driven`.

## Open questions

- The basket survives sign-out and is shown to the next user who signs in on the device. Reproduce it, or clear the basket on sign-out in the native app?
- A failed checkout's error stays on the basket after the lines change, until the next attempt. Reproduce it?
