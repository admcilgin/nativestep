---
name: step-screen
description: Build one checkpoint's screens on one native platform (iOS or Android) until its behavior tests pass (gate G1 on that platform) and lint is clean (G2). Use inside step-feature, once per platform, after step-test has written the tests; the two platforms can run in parallel.
---

# step-screen

Input: one checkpoint, one platform (`ios` or `android`), the checkpoint's tests in `spec/tests/<feature>/` and their fixtures, and the reference: during a migration the Flutter screen and `spec/profile.md`; afterwards the docs and designs. Output: services, ViewModels, nodes and views in the native project, green tests on that platform, and a clean lint.

The architecture is in [ARCHITECTURE.md](../../ARCHITECTURE.md) and the node tree format in [PROTOCOL.md](../../PROTOCOL.md) §3–§5. Read them first; this skill names the rules (R1…) instead of repeating them.

## 1. Read before writing

- The tests are the contract. List every node name, state field, action name and action argument they use. These names are fixed (R12). If the other platform is already done, its Core is the second source for names and types.
- The fixtures give the service and method names, the argument names and the result shapes (R4, R5). Every fixture method becomes a service method with exactly that name.
- During a migration read the reference screen for what the tests do not cover: texts, error messages per code, formatting. The view needs them; the tests do not.
- Read the platform's existing Core: `AppCore`, its `Router`, the navigators, and the feature folders already there.

## 2. Core

Work in Core first. It is what the tests drive.

1. **Services.** One protocol (iOS) or interface (Android) per service, in the feature's folder (R17), with the fixture's method names and `Result<_, AppError>` returns. Model types are `Codable`/`@Serializable` with the fixture's field names.
2. **ViewModel.** State, Action and a single `update` (R8), as ARCHITECTURE.md §3 shows for the platform. Effects call services and send their result back as an action. Navigation goes through the `Router` protocol in Core, never to a navigator directly.
3. **Node.** The Introspection extension (iOS) or Node class (Android) (R10): the name from the tests, the state the tests read, and the actions the user can take now. An action that cannot be taken is left out, not disabled: that is how a test sees `unavailable`. Give every action with arguments a schema.
4. **AppCore.** Add the new services to `Services` (R3), build the ViewModel where the user reaches it, and put it in the right navigator (R14). A screen the user reaches from a deep link gets a route (R16).

**The first feature of a migration** replaces the template's sample shell. Do not delete it: the conformance tests in `spec/tests/_sample/` still need it.

1. Move the template's `AppCore` to `Sample/SampleCore`, with its routes and router renamed `SampleRoute` and `SampleRouter`.
2. In the host's `FixtureCore`, `hostRoot` builds `SampleCore` when the fixtures have the `conformance` flag (COMPONENTS.md §6), and the app's `AppCore` otherwise.
3. The app itself never builds `SampleCore`: its debug launcher answers a conformance session with `unsupported`.

## 3. Host

The headless host runs Core with fixture services.

- In `FixtureCore`, add one fixture-backed implementation per new service. It forwards each call to the session's fixtures under the service and method name. It contains no logic.
- Build the host with the target's `build` command from `nativestep.json`.

## 4. G1 on this platform

```bash
nativestep test <feature>/ --target <platform>
nativestep test _sample/ --target <platform>
```

Repeat until both are green. When a test fails:

- `fixture_missing` means the app made a call the test did not expect, or used another name or argument. Fix the app, not the fixture: the fixture was proven on the reference.
- A wrong path or state means the Core differs from the reference. Run the test's steps by hand (`nativestep session start`, `ls`, `do`) and compare with the reference.
- A test that cannot pass without changing it goes back to step-test. Never edit a test here to make it pass.

## 5. Mobile

Only now write what the user sees. Mobile is not covered by G1, so keep it thin.

- **Real services** (R4): the HTTP or platform implementation of each service protocol, in the app's feature folder. Error mapping to the codes in the profile's service table.
- **Views** read the ViewModel's state and send its actions, nothing else (R9). Texts and formatting come from the reference. The Android template has no icon library: draw the few icons a screen needs as an `ImageVector` from the icon's path rather than adding `material-icons` for them.
- **Root** draws the navigators' state (R14) and keeps no navigation state of its own.
- Build the app in debug and release. Release must not contain the protocol server (R20); lint checks this.

## 6. G2

```bash
nativestep lint
```

Fix every finding on this platform. A parity finding (R5, R12) against the other platform means one of the two used a different name: the tests decide which is right.

## 7. Hand over

Report the platform, the files added per layer (Core, Host, Mobile), the G1 result for the feature and for `_sample`, the lint result, and the builds that were run. Name what the tests could not check: the view against the reference is step-ui-review's job (G3), the structure is step-arch-review's (G4).
