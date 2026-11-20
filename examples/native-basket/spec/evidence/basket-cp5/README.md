# basket cp5 · Basket count badge on the tab bar

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

`spec/tests/basket/badge.test.ts`, 1 test: after adding from a product, the basket counts the items while the product stays on screen. It adds tea twice, checks `count: 2` on Basket, and ends back on the products tab on `ProductDetail`, where the badge shows.

`nativestep test basket/badge --target flutter`: 1 pass.

The badge is view only. The profile decided that it is not state on the `Tabs` node, because navigators have fixed state. So no test fails without this checkpoint's code: the test exists to give G3 its state, and the count it shows is tested since cp1.

## Native

Mobile only, no Core change:
- **iOS:** `.badge(count)` on the Basket tab item. SwiftUI hides a zero badge.
- **Android:** a `BadgedBox` around the tab icon, with a `Badge` only when the count is above 0.

Both read `count` from the Basket ViewModel's state (R9).

## G1 · Behavior

`nativestep test basket/badge --target flutter,ios,android`: pass on all three. `nativestep test --target ios,android` (headless): pass.

On devices, `nativestep test basket/ --device`:
- android passes.
- ios first failed 1 test in `checkout-errors`, which was a race in the iOS device host. It was fixed separately in `818ed69` (evidence `fix-ios-device-pacing`). After the fix, ios basket passes 18 out of 18.

## G2 · Lint

`nativestep lint`: clean. The Android release build passes, and so does the iOS Release build for the simulator.

## G3 · UI review

The shots are in `shots/`. The set is valid: Tea's detail on the products tab, with a basket of 2. There are no blocking differences. The badge "2" sits on the Basket tab on all three.
- note: the badge's shape and red come from each platform (SwiftUI tab badge, Material 3 `Badge`), which is a convention.

## G4 · Architecture review

One review run, inline. The second, isolated run is missing because subagents are not used in this session. Verdict: approve, no findings.
- R9: the views only read `count`.
- R14: no navigation state in the views.
- The badge stays off the `Tabs` node, as the profile decided.

## G5 · Engineer

Skipped (autonomous).
