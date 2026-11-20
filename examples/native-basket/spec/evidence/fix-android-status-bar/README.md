# Fix · Android status-bar icons were light on the light background

Run on 2026-11-20 with step-fix, autonomous mode. Found in the basket cp3 UI review (G3). It was already visible in the basket cp2 shots.

## Report

- **What the user saw:** on Android, every screen's status-bar icons (time, signal, battery) were white on the app's near-white background, so they could hardly be read.
- **Expected:** dark icons on the light theme, as on iOS and on the reference.

## Kind

View only. The node tree is right, and no behavior test can see the status bar. The cause:
- The activity's platform theme, `Theme.Material.Light.NoActionBar`, does not ask for light status-bar appearance.
- The app never called `enableEdgeToEdge()`, which sets the system bars' icon color from the system's light or dark mode.

## Fix

Android only: `MainActivity.onCreate` calls `enableEdgeToEdge()` before `super.onCreate`. iOS has no such setting and shows dark icons already.

## Check

- The shots in `shots/` are taken with the Android app after the fix:
  - `quantities-add-one-raises-…`
  - `product-list-the-list-shows-…`
- The status-bar icons are dark, and the layout under them is unchanged, because the insets were already applied.
- **Tests on the Android device:** foundation, auth, catalog and basket pass, 38 tests. The 15 `_sample` conformance tests fail by design: a device answers `unsupported`, and they run on the headless host.
- `nativestep lint`: clean. The Android release build passes.
- The skill gap is closed: step-ui-review now reads the status bar first, from the top of the screen down.
