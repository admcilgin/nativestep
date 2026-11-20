# foundation cp1 · App shell: signed-out start, the tabs and the products stack, switching tabs

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

`spec/tests/foundation/shell.test.ts`, 3 tests:
- the app starts signed out, on sign-in, without the tabs;
- signed in, the products tab shows the product list inside its stack;
- selectTab switches between products and the basket.

`nativestep test foundation/ --target flutter`: 3 pass, 0 fail.

## G1 · Behavior

`nativestep test --target ios,android` (headless, all tests): ios 23 pass, 0 fail; android 23 pass, 0 fail.
On devices, `nativestep test foundation/ --device`: ios 3 pass (iPhone 18 Pro simulator), android 3 pass (Pixel 10 Pro emulator).

## G2 · Lint

`nativestep lint`: clean.

## G3 · UI review

Shots in `shots/`, one set per test, taken with `nativestep shot` at the end of each test.

First pass:
- blocking · android · Login: the title is under the status bar (no insets).
- blocking · android · ProductList: the "Products" title is missing.
- blocking · android · tab bar: the tabs have no icons.
- minor · ios, android · brand color: the system default (blue, purple) instead of the reference's teal.

Fixed:
- Android: `safeDrawingPadding` on Login, a `TopAppBar` on ProductList, tab icons from `material-icons-core`.
- Both platforms: a teal color scheme (Android) and tint (iOS).
The shots were then taken again.

Second pass: no blocking differences.
- minor · android · tab icons: Home and ShoppingCart instead of storefront and basket. `material-icons-core` has no storefront; the extended set is too large for two icons.
- note · ios · Login and ProductList use the inset grouped list and the large title. These are platform conventions.
- note · all · the chevrons on product rows and the sign-out button belong to catalog cp3 and cp4.
- note · flutter · the DEBUG banner covers no content.

## G4 · Architecture review

One review run, inline, not in an isolated context. The second, isolated run was not done; isolated runs need subagents, which this session runs only when the engineer asks.

Verdict: approve, no findings.
- note · R12: iOS drops the Login ViewModel after sign-in (`login = nil`); Android keeps `login` for the life of `AppCore`. This does not show today. At catalog cp4 (sign-out), Android would show the old form state. The cp4 tests must check that the form is empty after sign-out. Recorded in `spec/memory.md`.
- note · R14: the views call `tabs.select` and `goBack`, the navigators' lent actions, as the template does.

## G5 · Engineer

Skipped (autonomous).
