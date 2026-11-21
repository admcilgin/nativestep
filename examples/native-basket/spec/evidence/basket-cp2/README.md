# basket cp2 · Add one and remove one in the basket, down to an empty basket

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

Result: pass

`spec/tests/basket/quantities.test.ts`, 4 tests:
- add one and remove one are offered for the basket's lines only (input `productId` limited to the line ids)
- add one raises the line's quantity, the count and the total
- remove one lowers the quantity, and a line at one goes away
- removing the last item empties the basket, with nothing left to do

`nativestep test basket/quantities --target flutter`: 4 pass, 0 fail.

## Native

- **Core, both platforms:**
  - `BasketViewModel.addOne` and `removeOne`; a line at zero is removed.
  - The node offers both, with `productId` limited to the line ids, and nothing on an empty basket.
- **Mobile:** −/+ buttons on each line.
  - iOS: borderless icon buttons.
  - Android: `IconButton`s. `Add` is from `material-icons-core`. The minus is defined in `shared/Icons.kt` from Material's path, because the core set has no `Remove` and the extended set is too large for one icon.

## G1 · Behavior

Result: pass

`nativestep test --target ios,android` (headless, all tests): ios 49 pass, android 49 pass, 0 fail.
On devices, `nativestep test basket/ --device`: ios 8 pass, android 8 pass.

## G2 · Lint

Result: pass

`nativestep lint`: clean. The Android debug and release builds pass. The first Android build failed on the missing `Remove` icon; the fix is described above.

## G3 · UI review

Result: pass

The basket after "add one" and the emptied basket are in `shots/`. The sets are valid. There are no blocking differences: the lines, "2 × $12.00", "Total $33.00" and "Your basket is empty." match.
- note · ios: the −/+ buttons take the teal tint, as borderless buttons do on iOS.
- note · all: Place order is cp3, and the count badge on the tab is cp5.

## G4 · Architecture review

Result: pending — second isolated review missing

One review run, inline. Verdict: approve, no findings.
- R8: the quantities change only in `update`; count and total are recomputed there.
- R12: the actions, the input schema and the removal at zero are the same on both platforms.

## G5 · Engineer

Result: skipped — autonomous

Skipped (autonomous).
