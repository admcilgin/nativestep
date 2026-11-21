---
name: step-reference
description: Make the Flutter app a nativestep reference target. Writes the project's binding in spec/adapters/flutter/nativestep_binding/, makes the two allowed changes to the Flutter repo, and checks each screen it binds with nativestep ls and do on the iOS simulator. Use after step-adopt, once spec/profile.md is approved.
---

# step-reference

Input: an approved `spec/profile.md`. Output: the binding package, two changes in the Flutter repo, the node tree in `spec/profile.md`, and corrected `reference` values in `spec/inventory.json`.

The binding is the only code that knows both sides: the Flutter app's state, wiring and routes, and the target's node, service and field names. Everything it needs to know about the Flutter app is in the profile; if it is not, add it to the profile first. The binding's duties are in [COMPONENTS.md](../../COMPONENTS.md) §5, the node and focus rules in [PROTOCOL.md](../../PROTOCOL.md) §4, the navigator tree in [ARCHITECTURE.md](../../ARCHITECTURE.md) §5. [references/binding.md](references/binding.md) shows the package's shape.

## Scope

Bind the app shell and the screens the first features need, not every screen: the navigators, the screens reachable from launch by switching tabs, and the screens of the app's core flow that step-plan will start with. Every other screen gets a stateless node (its name, no state, no actions), so the path is right wherever a test lands. step-test completes a screen's node when its first checkpoint needs it (step-test §1). An app with 25 screens and as many services takes days to bind in full, all before the first checkpoint.

## 1. Design the node tree

The binding publishes the Flutter app under the target's names, so this is where the behavior contract gets its names. Fill the profile's `Node tree` table before writing code.

- Start from the profile's navigator tree decision. Each navigator is a node (`Modal`, `Tabs`, `Stack`); each screen is a node below the navigator that shows it. A navigator's child is what is on screen.
- `state` is everything the screen shows that a test could check: values, lists with their ids, loading flags, errors as `{ code, message? }`, enabled or disabled buttons when the app computes them. Leave out what is pure styling. Use the target's JSON shapes, not the Dart field names, and leave out `null` values.
- `actions` are what the user can do on that screen. Name them for intent (`addToBasket`, not `tapButton`). Navigation the user starts is an action on the screen; `goBack`, `selectTab` and `dismiss` are lent by navigators and are not repeated on screens.
- Text the user types is an action's input. A form's submit takes the field values (`{ email, password }`), and the action does what the button does with them.
- Each action gets an input schema when it takes input (PROTOCOL.md §5). Use the constraints the app enforces, no tighter.

Show the table to the engineer before step 3. Renaming a node after tests exist means editing every test that uses it.

## 2. Write the fixture services

For every service in the profile's service table, write a class the app accepts in place of the real one, usually by implementing the same interface or extending the same class.

- Each method calls `fixtures.call('<TargetService>', '<targetMethod>', {<target args>})`, with the target names from the profile.
- It turns the JSON result into the app's own models, and a `FixtureError` into the error the real class throws for that code. The screens must see exactly what the real service would give them.
- The session must never construct a real service. If the app builds one before the injection point can replace it, find another point or tell the engineer; the network guard (PROTOCOL.md §6) is only the second line.

## 3. Write the binding

Create `spec/adapters/flutter/nativestep_binding/` as in [references/binding.md](references/binding.md). It depends on `nativestep_adapter` (the project's `kits/flutter`), on the Flutter app by path, and on any package of the app's that it imports, with the same constraint as the app.

- `startNativeStep()` shows a placeholder and starts `StepServer` with the app name from `nativestep.json`.
- `start(fixtures, route)` builds the app from scratch with the fixture services at the injection point, with a new key so no widget state survives. It applies the profile's decisions on library behaviors (a behavior the native app will not reproduce is turned off here, so the reference shows what the target must do). Then it lets the first frame settle and opens `route` with the app's own navigation. An unknown route is a `bad_request` `ProtocolError`.
- Nodes read state and perform actions through the access the profile found: the state holders, the router, navigator keys. An action does what the widget callback does, through the same calls. Never set state the app would not set itself.
- `busy` is counted for you while fixture calls are in flight. If a screen also waits on timers (debounce, animations that gate state), write it in the profile; tests will need to wait for it.
- What runs in `main` before the app starts and is still needed without real services is repeated in `start`.

## 4. Change the Flutter repo

Only two changes, both marked so they are easy to revert when the migration ends (COMPONENTS.md §5):

```yaml
# pubspec.yaml, under dependencies:
  # nativestep: reference-app binding (remove after the migration)
  nativestep_binding:
    path: <relative path to spec/adapters/flutter/nativestep_binding>
```

```dart
// main.dart imports. kDebugMode is not exported by package:flutter/material.dart since Flutter 3.50.
import 'package:flutter/foundation.dart' show kDebugMode; // nativestep (remove after the migration)
import 'package:nativestep_binding/nativestep_binding.dart'; // nativestep (remove after the migration)

// The first line of main():
if (kDebugMode && const bool.fromEnvironment('NATIVESTEP')) return startNativeStep(); // nativestep
```

Leave out the `foundation` import when `main.dart` already has `kDebugMode`. `nativestep migrate finish` removes the binding's import and the `main()` line, and `dart fix` then drops the `foundation` import if nothing else uses it.

Run `flutter pub get` and `flutter analyze` in the Flutter project. If anything else in the Flutter repo seems to need a change, the binding is reaching for something it should get another way; find it, or ask the engineer.

## 5. Check it

Write the smallest fixture documents that reach every driven screen and every error state the profile lists, in `spec/fixtures/reference/` (PROTOCOL.md §7, target names). step-test reuses them.

Boot an iOS simulator, then:

```bash
nativestep session start --target flutter --fixtures reference/<name>
nativestep ls
nativestep do <action> '<json input>'
nativestep session stop
```

For each driven screen:

- `ls` shows the expected path, the state fields filled from the fixtures, and the actions in the table.
- Each action changes the state or the path as the app does on screen. Compare with a screenshot (the `screenshot` command in `nativestep.json`) when a field's meaning is unclear.
- An error fixture shows the error state. Leaving a fixture out gives `fixture_missing`, which proves the real service is not called.
- Each deep link in `inventory.json` opens its screen with `session start --route <url>`.

When no session is running, `session start` builds, installs and launches the app; while one is running, it only starts over with new fixtures. After a binding change, `session stop` and `session start` again.

## 6. Record

- Set each bound screen's `reference` in `spec/inventory.json` to what the check showed: `driven` when it passed, `read-only` when the binding cannot reach the screen's state, with the reason in the profile. Screens with a stateless node stay `driven` until step-test binds them.
- Complete the profile's `Node tree` table and move anything new you learned about the app into the profile's other sections.
