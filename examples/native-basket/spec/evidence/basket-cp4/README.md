# basket cp4 · Order errors (out of stock, network) and the placing state

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

`spec/tests/basket/checkout-errors.test.ts`, 5 tests.

New fixtures in `basket/`:
- `slow-order`: 3000 ms.
- `out-of-stock`.
- `offline-once`: network, then `o2`.
- `out-of-stock-then-slow`.

Tests:
- while the order is being placed, it cannot be placed again (`placing: true`, `placeOrder` unavailable)
- an out-of-stock order keeps the basket and shows the error
- after a network error the order can be placed again
- while the order is placed again, the old error stays until the answer
- the error is not shown on an empty basket, and shows again when a product is added (provisional, memory.md)

The first G0 run had 4 pass and 1 fail. The failing test expected placing again to hide the old error; the reference keeps it until the answer. The test now asserts the reference's behavior. Second run: 5 pass, 0 fail.

## Native

- **Core, both platforms:** `BasketViewModel` keeps the last order error as `orderError`, beside the lines.
  - `update` derives `error` from it, and only while there are lines (R8).
  - Success clears `orderError`. Failure sets it and keeps the lines.
- **Mobile:** the error text from `errorMessage` ("Some items are out of stock.", "Could not reach the server. Try again.") shows above the total.
  - iOS: in red.
  - Android: in `colorScheme.error`.

## G1 · Behavior

`nativestep test --target ios,android` (headless, all tests): 0 fail on ios and on android.
On devices, `nativestep test basket/ --device`: ios and android pass, 0 fail.

## G2 · Lint

`nativestep lint`: clean. The Android release build passes, and so does the iOS Release build for the simulator.

## G3 · UI review

The shots are in `shots/`:
- out of stock: `checkout-errors-an-out-of-stock-…`;
- placing, taken with `--no-wait`: `checkout-errors-while-the-order-is-being-placed-…`.

Both sets are valid. There are no blocking differences: on all three, the error text, its place above the total, "Total $21.00" and the disabled "Place order" while placing match.
- note · ios: the disabled prominent button is drawn faintly, as iOS draws disabled buttons.
- note · all: the count badge on the tab is cp5.

## G4 · Architecture review

One review run, inline. The second, isolated run is missing because subagents are not used in this session. Verdict: approve, no findings.
- R8: `orderError` and `error` change only in `update`. On Android they change through `setLines`, which only `update` calls.
- R12: on both platforms the error is derived in the same way, and the State fields and node actions are the same.
- R9: the views only read `error`.

## G5 · Engineer

Skipped (autonomous). There is one new provisional decision for the engineer in `memory.md`: "Order error after the lines change".
