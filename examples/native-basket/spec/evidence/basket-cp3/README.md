# basket cp3 · Place an order, see the order-placed dialog, basket emptied

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

`spec/tests/basket/checkout.test.ts`, 4 tests, with the new fixture `basket/order` (`OrderService.place`, `items` in basket order, returns `{ "id": "o1" }`):
- place order is offered only while the basket has lines
- placing an order sends the basket's lines and shows the order-placed dialog (`App › Modal › OrderPlaced`, `{ orderId: "o1" }`)
- while the order-placed dialog is up, only closing it is possible
- closing the dialog shows the basket, emptied (`placeOrder` unavailable)

`nativestep test basket/checkout --target flutter`: 4 pass, 0 fail.

## Native

- **Core, both platforms:**
  - `OrderService.place(items:)` behind a protocol (R4), with `OrderItem` and `PlacedOrder`, in `Basket/`.
  - `BasketViewModel` gets its first effect. `placeOrder` sets `placing` and calls the service. Success clears the lines and calls `Router.orderPlaced(id:)`. Failure keeps the lines and sets `error`; its tests and view are cp4.
  - AppCore's `orderPlaced` presents an `OrderPlacedViewModel` (`orderId`) on the Modal, which lends `dismiss`.
  - The Basket node offers `placeOrder` while there are lines and no order is being placed.
- **Host:** `FixtureOrderService` forwards `place` with `items` to the fixtures.
- **Mobile:**
  - `HTTPOrderService`/`HttpOrderService` send `POST orders` with `{ items }`.
  - "Place order" is a full-width button under the total, disabled while placing.
  - The "Order placed" alert ("Your order o1 is on its way.", OK) is drawn from `modal.presented`: a SwiftUI `.alert` on iOS, an `AlertDialog` on Android. Closing it dismisses the modal.

## G1 · Behavior

`nativestep test --target ios,android` (headless, all tests): ios 53 pass, android 53 pass, 0 fail.
On devices, `nativestep test basket/ --device`: ios 12 pass, android 12 pass. iOS ran again after the G4 fix: 12 pass.

## G2 · Lint

`nativestep lint`: clean. The Android release build passes, and so does the iOS Release build for the simulator.

## G3 · UI review

The shots are in `shots/`: the "Order placed" dialog (`checkout-placing-an-order-…`) and the filled basket with Place order (`quantities-add-one-raises-…`). Both sets are valid. No blocking differences: the dialog title, the message with the order id, OK, "Total $33.00" and "Place order" match.
- minor · android: the dialog's surface is lavender, from Material's baseline surface colors, while the reference's is teal-tinted. The theme sets only `primary`.
- note · ios: the system alert, with OK as a full-width button, and the inset-grouped list are platform conventions.
- note · all: the count badge on the tab is cp5.
- Older, not cp3: on Android the status-bar icons are light on the light background, as in the cp2 shots too. This goes to step-fix as a separate commit.

## G4 · Architecture review

One review run, inline. The second, isolated run is missing because subagents are not used in this session.
- First pass: changes, 1 finding.
  - R8, `ios/Core/Sources/Basket/BasketViewModel.swift`: count and total were recomputed in `handle`, outside `update`.
  - Fix: a `defer` at the top of `update`.
  - After the fix, G1 on iOS ran again (53 headless, 12 on device).
- Second pass: approve. On both platforms:
  - State changes only in `update`.
  - The effect only calls the service.
  - Navigation goes through `Router.orderPlaced` (R14).
  - The State fields, the Actions and the node tree match (R12).
  - Service, method and argument names match (R5).
  - The views only read state and send (R9).

## G5 · Engineer

Skipped (autonomous).
