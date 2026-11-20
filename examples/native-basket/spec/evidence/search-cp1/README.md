# search cp1 · Search the product list by name, with a message when nothing matches

Run on 2026-11-20 with step-feature, autonomous mode. This is the first feature after the migration. There is no `flutter` target: `docs/features/search.md` is the reference.

## G0 · Tests against the doc

`spec/tests/search/search.test.ts`, 7 tests, one per acceptance criterion (1–7). Criterion 8, no server call, is covered by every test: the fixtures have no search method, so a call would fail as `fixture_missing`. New fixture: `search/catalog` (Tea, Green tea, Mug, Teapot); the tests also reuse `catalog/restocked` and `catalog/slow-products`.

After the migration, G0 is the engineer approving the tests against the doc (step-test §4). In autonomous mode that approval is **pending**.

Before any native code, `nativestep test search/ --target ios`: 1 pass, 6 fail. The passing test is "not offered during the first load", which holds trivially before `search` exists.

## Native

The two platforms were built one after the other in this session. Parallel step-screen runs need subagents, which this session does not use.
- **Core, both platforms:** `ProductList` State gets `query` (as typed) and `results`. Action `search(query:)`.
  - `update` derives `results` after every message: the name contains the trimmed text, case-insensitively, in catalog order.
  - iOS uses `.caseInsensitive` without locale rules, to match Kotlin's `ignoreCase` (R12).
  - The node offers `search` while the list is shown, and `openProduct` with the ids of `results`.
- **Mobile:**
  - iOS: `.searchable(prompt: "Search products")` on the shown list.
  - Android: an `OutlinedTextField` with a search icon at the top of the list.
  - Both show `No products match "<text>".` when nothing matches, and "No products yet." for an empty catalog.

## G1 · Behavior

- `nativestep test --target ios,android` (headless, all tests): pass on both.
- On devices: `search/` passes on ios and on android, and so does `catalog/`.

## G2 · Lint

`nativestep lint`: clean. The Android debug and release builds pass, and so does the iOS Release build for the simulator.

## G3 · UI review (against the doc)

The shots in `shots/` are for ios and android only:
- results for "  TEA ": Tea, Green tea, Teapot;
- no match for "coffee".

The sets are valid. There are no blocking differences from the doc: the placeholder, the results in catalog order, and the message with the trimmed text are as the doc describes.
- note: each platform draws the field in its own style, iOS in the navigation bar and Android as an outlined field at the top of the list. The doc has no design.

## G4 · Architecture review

One review run, inline. The second, isolated run is missing because subagents are not used in this session. Verdict: approve, no findings.
- R8: `query` and `results` change only in `update`. On Android, the derived `results` are applied in `update` after `step`.
- R12: the State fields, the action and its input schema, and the matching rule are the same on both platforms.
- R9: the views read `query` and `results` and send `search`; the trimming in the message is formatting.
- R4: no service was added; search is local.

## G5 · Engineer

Skipped (autonomous). Pending for the engineer:
- approve the tests against the doc (G0);
- the doc itself, which was written in this session to stand in for a product document.
