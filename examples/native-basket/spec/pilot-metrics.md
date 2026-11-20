# Pilot metrics · Basket (flutter-riverpod → iOS and Android)

Measured on 2026-11-20 over the whole migration and the first feature after it. Autonomous mode: no engineer took part, so G5 and engineer comments have no data.

## Scope

- 5 features and 13 checkpoints: foundation 1, auth 2, catalog 4, basket 5 (all migrated), and search 1 (from docs, after the migration).
- 3 fixes through step-fix.
- 68 app tests and 15 conformance tests.
- 5 screens, all migrated.

## Checkpoint duration

From one closing commit to the next. This is agent wall-clock time, including both platforms, every gate and the evidence. It has no engineer time.

| Checkpoint | Minutes | Note |
|---|---|---|
| foundation cp1 | 21 | also wrote step-feature and the review skills |
| auth cp1–cp2 | 3 | Core and views existed from step-screen's first run |
| catalog cp1 | 7 | the same |
| catalog cp2 | 5 | |
| catalog cp3 | 9 | INVALID shot set and a split test |
| catalog cp4 | 5 | |
| basket cp1 | 5 | |
| basket cp2 | 4 | |
| basket cp3 | 9 | first effect, new service, modal |
| basket cp4 | 5 | |
| basket cp5 | 12 | includes the investigation of the iOS device race |
| search cp1 | 7 | no reference |

Median: 5–6 minutes.

## How often a gate failed on the first pass

| Gate | Failed first | Where | What fixed it |
|---|---|---|---|
| G0 (the test, on the reference) | 3 of 12 | catalog cp1, basket cp1, basket cp4 | The test was wrong every time: a missing predicate, a timeout at the 3000 ms precondition limit, and an assumption the reference did not share. |
| G1 (behavior) | 1 of 13 | basket cp5, on the iOS device | A race in the device host, not the app (`fix-ios-device-pacing`). Headless G1 never failed after step-screen. |
| G2 (lint and builds) | 2 | auth (a missing serialization plugin), basket cp2 (an icon missing from icons-core) | Both were Android build errors. Lint itself had no findings. |
| G3 (UI review) | 6 of 12 view checkpoints | foundation, auth, catalog cp1, catalog cp3 (INVALID), basket cp3 (an older status-bar bug), basket cp3 (minor) | Theme, insets and empty-state layout, mostly on Android. One INVALID set: a fixture delay shorter than the slowest device. |
| G4 (architecture) | 1 of 13 | basket cp3 | R8: a derived field was recomputed outside `update`. |
| G5 (engineer) | n/a | all | skipped (autonomous) |

G3 found the most problems, and most of them were in the first checkpoints. They were app-wide styling fixed once: the theme, the insets, the surface. From catalog cp2 on, G3 found almost only minor differences.

## Test duration

- **Headless, all 83 tests:** about 10 s on iOS and about 10 s on Android.
- **Devices, per feature:**
  - catalog: 25 s on iOS, 26–32 s on Android;
  - basket: 39 s on iOS, 43–47 s on Android.
  - Since `818ed69` the iOS device host waits for navigation animations. That made catalog about 2.5 times slower, and it removed the flaky failures.
- **Shots:** 2–7 s per target and per state. The Android build and install dominates.

## Bugs found and where

| Bug | Found by | Platforms | Reference too? |
|---|---|---|---|
| The Android status-bar icons could not be read | G3, one checkpoint after it appeared | Android | no |
| The iOS device host answered before navigation settled | G1 on device, after it had passed once | iOS (tooling) | no |
| A failed product load could not be loaded again | audit of older code | both | yes |

The headless G1 runs caught none of the three bugs. Two were found on screens or devices, and one by reading the code.

## Changes made from these numbers

- step-ui-review reads the status bar first (status-bar bug).
- PROTOCOL.md §1: a device target answers once navigation has settled (device race).
- step-test: loading fixtures use a 3000 ms delay, and later steps pass predicates (the INVALID set and the basket cp1 timeout).
- step-test: every error the screen shows gets a test of its way out (the failed-load bug).
- step-feature: G1 also runs the feature's tests on devices (the race was invisible headless).
