---
name: step-adopt
description: Start a nativestep migration of a Flutter app. Creates the native iOS and Android projects next to it, scans the Flutter project, and writes spec/profile.md (how the source works and how it maps to the target) and the screen list in spec/inventory.json. Use when a team begins moving a Flutter app to native, before step-reference and step-plan.
---

# step-adopt

Input: a Flutter project. Output: a nativestep project with `nativestep.json`, a native skeleton that builds and passes the conformance tests, `spec/profile.md`, and the `raw` and `screens` sections of `spec/inventory.json`.

The source project is unknown. Do not assume its packages, folder layout or architecture; find them in its code and write what you find into `spec/profile.md`. The output is fixed: [ARCHITECTURE.md](../../ARCHITECTURE.md) defines it, [PROTOCOL.md](../../PROTOCOL.md) the wire format, [COMPONENTS.md](../../COMPONENTS.md) §8 the project files. Read those first; this skill does not repeat them.

## 1. Check the source builds

1. `flutter pub get` in the Flutter project. `nativestep scan` needs `pubspec.lock`.
2. `flutter build ios --simulator --debug`, with the same `--dart-define` / `--dart-define-from-file` flags the project's own run configuration uses. The reference app runs on the iOS simulator; if it does not build there, stop and tell the engineer. Nothing later works without it. Check the build's own exit code: piped through `tail` or `tee`, a failed build looks green.

When it fails, these causes are common. Each fix is the engineer's to approve, and is not one of the binding's lines:

| Symptom | Cause | Fix |
|---|---|---|
| SPM cannot resolve packages (e.g. `firebase-ios-sdk` against `GoogleSignIn`) | Flutter 3.50+ builds plugins with Swift Package Manager by default; some plugin sets have no common version | `enable-swift-package-manager: false` under `flutter: config:` in `pubspec.yaml`, for this project only |
| `GoogleService-Info.plist` not found | `flutterfire configure` writes it and the repo ignores it | Copy it from a machine that has it, or write it from the iOS values in `lib/firebase_options.dart` |
| `flutterfire: command not found` in a build phase | The Crashlytics symbol upload runs on every build | Install the FlutterFire CLI, or put a no-op `flutterfire` script on `PATH` for the reference build only (in `device.build`) |
| The app starts with a missing config error | It reads `--dart-define-from-file` | Put the same flag in the `flutter` target's `device.build` in `nativestep.json` |

Do not change the Flutter project in this skill. step-reference makes the only two changes it ever gets.

## 2. Create the native project

The identity is the engineer's decision. Propose it, do not pick it:

- **App name**: a type name (PascalCase). Look at the Flutter app's display name.
- **iOS bundle id** and **Android package**: read the ids the store apps ship with today (the iOS target's `PRODUCT_BUNDLE_IDENTIFIER`, Android's `applicationId`). A native app that replaces a published one usually keeps them; one that ships beside it needs new ones. Ask which. During the migration the reference app and the native iOS app are installed on the same simulator, so their bundle ids must differ; a native app that will take over the store id gets a temporary one until release. Write the choice to the profile as a `Decision:`.
- **Location**: a sibling directory or a folder in the same repository. Ask.

Then:

```bash
nativestep init <dir> --app <Name> --ios-bundle-id <id> --android-package <package> --reference <flutter-path>
cd <dir>
nativestep lint
nativestep test _sample --target ios,android
```

Both must pass before you go on. They prove the toolchain, not the app: if they fail, the problem is the machine or the kits, and later failures would be indistinguishable from migration bugs.

## 3. Scan

```bash
nativestep scan
```

This fills `raw` in `spec/inventory.json` (packages, Dart file count, assets, native code and platform channels) and writes the import graph to `.nativestep/scan/imports.json`. Use both as the map for step 4: the direct packages tell you which questions below have interesting answers, and the import graph tells you which files belong together.

## 4. Write spec/profile.md

Start from [references/profile.md](references/profile.md). Answer every question in it from the code, with file paths. Where the code does not answer a question, say so; do not guess. Where an answer needs a decision (a name, whether the native app keeps a behavior), write your proposal and mark it `Decision:` so the engineer sees it.

How to read an unknown codebase:

- Start at `main` and follow what it constructs. Every object built before the first frame is a candidate for the dependency wiring and the service boundary.
- For state, pick one screen with a list and one with a form. Trace a user action from the widget callback to the state change and back to the rebuild. The two traces usually show the whole pattern; confirm it on a third screen.
- For the service boundary, search for everything that leaves the process: HTTP clients, sockets, storage, secure storage, platform channels, plugins, and reads of the clock or random numbers. Each one is a service on the target (ARCHITECTURE.md R4, R6).
- For navigation, find where routes are declared and every place that navigates. Dialogs, sheets and nested navigators count; they become modals and stacks in the target tree.
- Libraries add behavior the app code never states: retries, caching, deduplication, auto-dispose, debouncing, error wrapping. Read the library's documentation for the version in `pubspec.lock` and list what applies. Each one is a decision: the native app reproduces it, or the migration drops it.

## 5. List the screens

Write `screens` in `spec/inventory.json`, one entry per screen the user can reach (COMPONENTS.md §8):

- `name`: the target node name, PascalCase, without `Screen` or `Page` (ARCHITECTURE.md R12).
- `feature`: leave it out; step-plan sets it.
- `reference`: `driven` when step-reference can reach the screen's state and actions from outside the widget tree, `read-only` when the state lives only inside widgets and the tests will be written from the code. Use what step 4 found; step-reference may correct it.
- `source`: the Dart files that make up the screen.
- `deepLinks`: the URL patterns that open it, if any.
- `status`: `pending`.

Dialogs and sheets that show content of their own are screens. A confirmation with two buttons is not; it is state on the screen that shows it.

Check the file with `nativestep status --screens`.

## 6. Hand over

Ask the engineer to review `spec/profile.md`, the `Decision:` lines first. The profile is approved when the engineer says so; record the approval date at its top. step-reference and step-plan read it; a wrong mapping here costs a rewrite of every test that uses it.
