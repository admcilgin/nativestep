# Fix · A product whose load failed could never be loaded again

Run on 2026-11-20 with step-fix, autonomous mode. Found in an audit of older Core code for behavior bugs.

## Report

- **Steps:** open a product while the network fails; the page shows "Could not reach the server. Try again." Go back and open the same product again.
- **Expected:** the product loads.
- **Actual:** the same error, for the rest of the session.
- **Cause:** AppCore caches one detail page per id (profile: Caching) and reused it with its error. The page offers no retry.

## Kind

A behavior bug, on both platforms, and the reference has it too: its `productProvider` family keeps the error. Following step-fix §2, the expected behavior is the engineer's decision. Provisional: reopening tries again (memory.md, "Reopening a product that failed to load").

## Red test

`spec/tests/catalog/product-detail-retry.test.ts`, with fixture `catalog/detail-offline-once` (network once, then Tea): "reopening a product that failed to load loads it again".

Before the fix it was red on flutter, ios and android. Each failed on `error` being `{ "code": "network" }` after reopening, which is the bug, not a setup error.

## Fix

The same change on both platforms, in `AppCore.go(.product)`: the cached page is reused only when its load has not failed; otherwise a new page is built, and it loads.
- iOS: `ios/Core/Sources/App/AppCore.swift`
- Android: `android/core/src/main/kotlin/dev/nativestep/basket/app/AppCore.kt`

Pages that loaded are still cached, so a product is fetched once, as before. No test or fixture changed.

## Gates

- `nativestep test --target ios,android` (headless, all tests): pass on both.
- `nativestep test catalog/ --device`: ios 19 pass, android 19 pass.
- `nativestep lint`: clean.
- **G4, inline:** approve. The change is in AppCore's routing, where the cache lives (R14), and it is the same on both platforms (R12). No view changed, so G3 does not apply.
- **Not covered:** the reference keeps the bug, so this test fails there by design.
