# basket cp1 · Add a product to the basket from its detail; lines, count and total

Run on 2026-11-20 with step-feature, autonomous mode.

## G0 · Reference

Result: pass

`spec/tests/basket/add.test.ts`, 4 tests:
- the basket starts empty
- adding a product stays on its detail and puts one in the basket
- adding the same product again raises its quantity; another product gets its own line
- addToBasket is not offered while the product loads or when it is gone

`nativestep test basket/ --target flutter`: 4 pass, 0 fail.

The last test needed two changes:
- **Going back while tea loads:** `slow-detail` (3000 ms) is as long as a precondition waits, so the test goes back during the load instead of waiting for it to end.
- **Opening mug with a predicate:** `busy` counts every in-flight call in the session, so a `do` without a predicate would have waited for tea's load.

## Native

- **Core, both platforms:**
  - `BasketViewModel.add`: a new line, or quantity + 1. `count` and `totalCents` are recomputed in `update`.
  - `ProductDetail.addToBasket`, offered only while the product shows.
  - `Router.addToBasket(product)`: AppCore passes the product to the basket, so catalog does not depend on basket (inventory: basket depends on catalog).
  - AppCore keeps one BasketViewModel for its lifetime.
- **Mobile:** an "Add to basket" button on the detail, and Basket lines (`quantity × price`) with the total.

## G1 · Behavior

Result: pass

`nativestep test --target ios,android` (headless, all tests): ios 45 pass, android 45 pass, 0 fail.
On devices, `nativestep test basket/ --device`: ios 4 pass, android 4 pass.

## G2 · Lint

Result: pass

`nativestep lint`: clean. The Android debug and release builds pass.

## G3 · UI review

Result: pass

The detail with its button and the Basket with two lines are in `shots/`. The sets are valid. There are no blocking differences: the lines, quantities and "Total $21.00" match.
- note · all · the −/+ buttons are basket cp2, Place order is cp3, and the count badge on the tab is cp5.
- note · android: the cart icon on the button is `ShoppingCart`, without the reference's plus sign (small icon set).

## G4 · Architecture review

Result: pending — second isolated review missing

One review run, inline. Verdict: approve, no findings.
- R8: the basket changes only in `update`. It has no effects yet.
- R12: the actions and the state shape are the same on both platforms. So is the route through `Router.addToBasket`.
- R17: catalog does not import basket; AppCore connects them.
- note: the basket survives sign-out, as on the reference. This is provisional until the engineer answers the profile's open question (memory.md).

## G5 · Engineer

Result: skipped — autonomous

Skipped (autonomous).
