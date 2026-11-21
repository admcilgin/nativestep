# catalog cp1 · Product list loads and shows names and prices

Run on 2026-11-20 with step-feature, autonomous mode. The Core and views existed from the first step-screen run; this run added the tests and checked them against the gates.

## G0 · Reference

Result: pass

`spec/tests/catalog/product-list.test.ts`, 3 tests:
- the list shows each product's name and price, without the description
- while the list loads, it is loading and empty (ends mid-call, for the G3 shot)
- an empty catalog shows an empty list, not loading

New fixtures: `catalog/slow-products` (1500 ms) and `catalog/empty`.

`nativestep test catalog/ --target flutter`: 3 pass, 0 fail.

The first run of the loading test failed on the reference, but the test was at fault, not the app. `do("signIn")` without a predicate also waited for the list call. The test now passes a predicate that only ProductList's loading state matches. Recorded in step-test §3.

## G1 · Behavior

Result: pass

`nativestep test --target ios,android` (headless, all tests): ios 27 pass, android 27 pass, 0 fail.
On devices, `nativestep test catalog/ --device`: ios 3 pass, android 3 pass.

## G2 · Lint

Result: pass

`nativestep lint`: clean.

## G3 · UI review

Result: pass

Shots of the three states are in `shots/`. The loading state was shot with `--no-wait`. All sets are valid.

First pass:
- minor · ios · empty: "No products yet." was centered; the reference puts it top-left with 24 pt padding.
- minor · android · empty: the same text had no padding.

Both are fixed and the shots were taken again.

Second pass: no blocking differences.
- note · all · the list rows lack the chevron and the app bar lacks sign-out. They come with catalog cp3 and cp4.
- note · android · the tab icons, as in foundation cp1.

## G4 · Architecture review

Result: pending — second isolated review missing

One review run, inline. Verdict: approve, no findings.

Both platforms match:
- State: `products` (`id`, `name`, `priceCents`; the description is left out), `loading`, `error`.
- Load: starts when the ViewModel is built, is ignored while one is in flight, and clears the error before it starts.
- Failure: mapped to `AppError`.

The ViewModels' `load` action is not yet on the node. The node gains `refresh` and `retry` in cp2.

## G5 · Engineer

Result: skipped — autonomous

Skipped (autonomous).
