# Fix · On the iOS device, a push right after going back and switching tabs was undone

Run on 2026-11-20 with step-fix, autonomous mode. Found in the basket cp5 G1 device run. `basket/checkout-errors` "…shows again when a product is added" failed 2 times in 4 runs, with `action_unavailable: addToBasket`.

## Reproduce

`spec/tests/catalog/tab-switch.test.ts` repeats these steps 6 times:
- open a product, add it, go back;
- switch to the basket, remove one;
- switch to products, open the product;
- after 300 ms, the path must end in `ProductDetail`.

Before the fix:
- **iOS device:** red 3 runs out of 3. `openProduct` answered `ProductDetail`; 300 ms later the path was `ProductList`.
- **Headless iOS and Android, the Android device and the reference:** green.

## Kind

Not a Core bug and not a user-facing one. The device host answered each request at once, before the UI finished the change the request made.
- A `goBack` followed at once by `selectTab` interrupted SwiftUI's pop animation.
- When the products tab showed again, UIKit finished that pop. It wrote `[]` to the `NavigationStack` path (`NavigationColumnState.pop`), which popped the product just pushed.
- A user cannot tap a product that soon after a tab appears.
- The stale write and a real back tap carry the same transaction, so the view cannot tell them apart.

Logs: the path setter, with call stacks, on the simulator. A programmatic `goBack` normally writes nothing back.

## Fix

`kits/ios/Sources/NativeStepHostKit/NativeStepHost.swift`: in device mode, each answer waits until no view controller in the app's windows has a transition coordinator or is being presented or dismissed. The first check comes after one frame; the wait is at most 1 s. Headless hosts are unchanged. PROTOCOL.md §1 now says this.

## Check

- **`catalog/tab-switch` on the iOS device:** green 3 runs out of 3, and green on the Android device and headless on both platforms.
- **All tests on the iOS device:** foundation 3, auth 6, catalog 18 and basket 18 pass.
- **Cost:** device runs now wait for push and pop animations. The catalog run takes 25 s instead of about 10 s, and basket takes 39 s.
- **Headless `--target ios,android`:** pass.
- `nativestep lint`: clean.
