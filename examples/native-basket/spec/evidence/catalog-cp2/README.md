# catalog cp2 · Product list error with retry, and pull to refresh

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

`spec/tests/catalog/product-list-errors.test.ts`, 3 tests:
- a failed load shows the error and offers retry, not refresh
- retry loads the list again
- refresh keeps the list while it reloads, then shows the new list

New fixtures: `catalog/offline-once` (network, once) and `catalog/restocked` (two products, then three after 1500 ms).

`nativestep test catalog/ --target flutter`: 6 pass, 0 fail. This covers cp1 and cp2.

Action availability was read from the binding's ProductList node:
- `refresh` while the data branch shows, including an empty list and a refresh in progress;
- `retry` on the error branch only;
- nothing while the first load or a retry runs.

## Native

Both platforms:
- `Action` gains `refresh` and `retry`. Like `load`, they reload, and they are ignored while a load is in flight.
- A new `listShown` flag, set only in `update`, tells a shown list (even an empty one) from the first load. The node offers `refresh` on it and `retry` on a settled error.
- A failed refresh clears the list, as the reference's `when` shows the error alone.

Views:
- iOS: `.refreshable` on the list and on the empty state; an error view with a Retry button.
- Android: a `PullToRefreshBox` around the list and the empty state; an error view with an `OutlinedButton` Retry.

## G1 · Behavior

`nativestep test --target ios,android` (headless, all tests): ios 30 pass, android 30 pass, 0 fail.
On devices, `nativestep test catalog/ --device`: ios 6 pass, android 6 pass.

## G2 · Lint

`nativestep lint`: clean. The Android debug and release builds pass.

## G3 · UI review

The error state is in `shots/` and the set is valid. There are no blocking differences: all three show "Could not reach the server. Try again." with a Retry button under it.
- note · ios: Retry is a `.bordered` button. The reference uses an outlined Material button. This is a platform convention.

Not shot: a refresh in progress. On the reference the indicator shows only while the user pulls. A refresh sent over the protocol shows no indicator there. On Android, `PullToRefreshBox` shows the indicator for every refresh. The screens therefore differ on purpose, and a set would be `INVALID`.

## G4 · Architecture review

One review run, inline. Verdict: approve, no findings.
- R8: `listShown` changes only in `update`, on both platforms.
- R12: the node actions match on both platforms (`refresh` and `retry`), as do the rules for when each is offered.
- note · R9: the iOS view waits for `state.loading` with a 100 ms poll inside `.refreshable`. The view sends nothing but `refresh`. The shortcut is commented in the code; replace it if more screens refresh.
- note · android: the view reads `vm.listShown`, a plain property. It changes only in the same `update` call as `state`, so the view recomposes on the state emission.

## G5 · Engineer

Skipped (autonomous).
