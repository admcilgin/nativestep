# catalog cp3 · Product detail from the list, back, and its not-found error

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

Result: pass

`spec/tests/catalog/product-detail.test.ts`, 7 tests:
- opening a product pushes its detail with the description (also checks that `openProduct`'s ids are limited to the listed ones)
- a product without a description shows an empty one
- while the product loads, it is loading without a product (ends mid-call, for the G3 shot)
- back returns to the list, and a product opened again is not fetched again
- a product that is gone shows not_found
- back works from a product that is gone
- the products tab keeps its detail across tabs, and selecting it again returns to the list

New fixtures:
- `catalog/details`: tea and mug, each served once, so a second fetch fails with `fixture_missing`.
- `catalog/slow-detail`: 3000 ms.
- `catalog/mug-gone`: `not_found`.

`nativestep test catalog/ --target flutter`: 13 pass, 0 fail.

## Native

- **Core, both platforms:**
  - `ProductService.detail(id)`.
  - `ProductDetailViewModel`: state `id`, `product?` (with `description`, `""` when absent), `loading`, `error?`.
  - `Route.product(id)` and `Router.go`.
  - `ProductList.openProduct(id)`: its input is limited to the listed ids, and it is offered only while the list shows and is not empty.
  - AppCore keeps one detail ViewModel per id for the session, as the reference's provider family caches each product.
- **Kits, both platforms:** `TabNavigator(popsToRootOnReselect:)`, off by default so the conformance tests are unchanged. AppCore turns it on, as the reference does with `goBranch(initialLocation: i == currentIndex)`.
- **Host:** the fixture `detail` method.
- **Mobile:** the HTTP `detail` method, a detail screen (price, description, back), and list rows with a chevron that send `openProduct`.

## G1 · Behavior

Result: pass

`nativestep test --target ios,android` (headless, all tests): ios 37 pass, android 37 pass, 0 fail.
On devices, `nativestep test catalog/product-detail --device`: ios 6 pass, android 6 pass. That run predates splitting the not-found test into two.

## G2 · Lint

Result: pass

`nativestep lint`: clean. The Android debug and release builds pass; so does the iOS debug build.

## G3 · UI review

Result: pass

Shots of the detail, its loading and not_found states, and the list with chevrons are in `shots/`.

First pass:
- INVALID · the loading set: the Android shot already showed the loaded product, because the 1500 ms delay ended before the screenshot. `slow-detail` now delays 3000 ms, and the shots were taken again.
- The not_found test ended on the list after `goBack`, so its shot did not show the error. It was split in two, so that one test ends on the error.

Second pass: no blocking differences.
- note · all · the detail's "Add to basket" button comes with basket cp1.
- note · ios · the loading shot catches the push animation (rounded corners). The state is right.
- note · ios · the back button is the system's, and the title is inline. These are platform conventions.

## G4 · Architecture review

Result: pending — second isolated review missing

One review run, inline. Verdict: approve, no findings.
- R14: the list sends `openProduct`, and AppCore pushes through `Router.go(.product(id:))`. The iOS rows are Buttons, not NavigationLinks, so the push happens in Core.
- R12: the ViewModels, the node actions, the route and the detail cache are the same on both platforms.
- note: the cache keeps a failed detail too. Reopening a gone product shows `not_found` without fetching again, as the reference's family provider does.
- note · ios: whether tapping the already-selected tab calls the `TabView` selection setter is not checked on the device. The protocol path is tested. Android's `NavigationBarItem` always calls `select`.

## G5 · Engineer

Result: skipped — autonomous

Skipped (autonomous).
