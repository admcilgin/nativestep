# catalog cp4 · Sign out from the product list returns to sign-in

Run on 2026-11-20 with step-feature, autonomous mode. This is the last catalog checkpoint.

## G0 · Reference

Result: pass

`spec/tests/catalog/sign-out.test.ts`, 4 tests:
- signing out returns to sign-in, without the tabs
- after a failed sign-in, signing out shows a clean sign-in (the `memory.md` note from foundation cp1)
- sign out is offered while the list shows its error
- signing in again shows the list from before, without fetching it (`catalog/products-once` serves the list once)

`nativestep test catalog/sign-out --target flutter`: 4 pass, 0 fail.

On the reference, `logout()` sets the auth state to signed-out with no error. No provider is reset, so the list survives sign-out.

## Native

- **Core, both platforms:**
  - `Router.signOut()`.
  - `ProductList.signOut`, offered in every state.
  - On sign-out, AppCore builds a fresh Login ViewModel. On Android, `login` is now a StateFlow, so Root sees the new one.
  - The list and basket ViewModels are built once and reused on the next sign-in, like the details. This is the profile's Caching decision.
- **Mobile:** a sign-out button in the list's app bar (an iOS toolbar button; Android `TopAppBar` actions with `ExitToApp`).

## G1 · Behavior

Result: pass

`nativestep test --target ios,android` (headless, all tests): ios 41 pass, android 41 pass, 0 fail.
On devices, `nativestep test catalog/ --device`: ios 17 pass, android 17 pass. This includes the cp3 not-found tests after the split.

## G2 · Lint

Result: pass

`nativestep lint`: clean. The Android debug and release builds pass.

## G3 · UI review

Result: pass

The list's app bar and Login after a failed sign-in and sign-out are in `shots/`. The sets are valid. There are no blocking differences: the form is empty with no error on all three.
- minor · android: `ExitToApp` (an arrow into a box) instead of the reference's logout icon (an arrow out of a box). `material-icons-core` has no logout icon.
- note · ios: sign-out is a toolbar button over the large title. This is a platform convention.

## G4 · Architecture review

Result: pending — second isolated review missing

One review run, inline. Verdict: approve, no findings.
- R14: sign-out is a Router call, like `signedIn`, because it changes the session rather than a route.
- R12: both platforms build a fresh Login and reuse the list, basket and details.
- The `memory.md` note is now resolved.
- note: the basket also survives sign-out, as on the reference. The profile's open question (keep or clear the basket for the next user) is still the engineer's. basket cp1 inherits it.

## G5 · Engineer

Result: skipped — autonomous

Skipped (autonomous).
