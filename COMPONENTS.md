# Components

This document describes the parts of the toolkit, where they live and how they talk to each other. The rules are in ARCHITECTURE.md and the wire format is in PROTOCOL.md; neither is repeated here.

```
skills ───calls──────► nativestep CLI ──reads/writes──► nativestep.json, spec/
                          │
                          ├── nativestep ls · do · shot ───────────────────┐
                          └── nativestep test ──► @nativestep/test (bun) ──┤   PROTOCOL.md (NDJSON)
                                                                           ▼
            ┌──────────────────────┬──────────────────────┬──────────────────────┐
            │ flutter              │ ios                  │ android              │
            │ nativestep_adapter   │ NativeStepKit        │ nativestep-kit       │
            │ + binding            │ + Core               │ + core               │
            └──────────────────────┴──────────────────────┴──────────────────────┘
```

| # | Component | In the nativestep repo | In the target project | Language |
|---|---|---|---|---|
| 1 | nativestep CLI | `cli/` | Global install | TypeScript (Bun) |
| 2 | @nativestep/test | `kits/test-sdk/` | `kits/test-sdk/` | TypeScript (Bun) |
| 3 | NativeStepKit | `kits/ios/` | `kits/ios/` | Swift |
| 4 | nativestep-kit | `kits/android/` | `kits/android/` | Kotlin |
| 5 | nativestep_adapter | `kits/flutter/` | `kits/flutter/` + `spec/adapters/flutter/` | Dart |
| 6 | Templates | `templates/` | Expanded as `ios/`, `android/`, `spec/` | — |
| 7 | Skills | `skills/` | Installed as a plugin | Markdown |
| 8 | Project files | — | `nativestep.json`, `spec/` | JSON, Markdown |
| 9 | Gates | `skills/step-feature/` | — | — |

In v1 the kits are copied into the target project. The version of the copy is recorded in the `kits` field of `nativestep.json`.

## 1. nativestep CLI

The single command through which agents and engineers talk to the toolkit. It makes no assumptions about the source project: it knows only `nativestep.json`, the `spec/` files and the protocol. It contains no target-specific code; how to reach each target is written in `nativestep.json` (§8).

| Command | What it does |
|---|---|
| `nativestep init <dir> --app <Name> --ios-bundle-id <id> --android-package <package> [--reference <flutter-path>] [--force]` | Sets up the native repo from the templates, copies the kits into `kits/`, writes `nativestep.json`. `--reference` adds the Flutter app as the `flutter` target. A non-empty directory needs `--force`, which writes over the template's files and deletes nothing. |
| `nativestep scan [<flutter-path>]` | Writes the raw facts that look the same in every Flutter project to the `raw` section of `spec/inventory.json`: packages from `pubspec.lock`, Dart file count, assets, and the native code and MethodChannels under `ios/` and `android/`. The import graph goes to `.nativestep/scan/imports.json`. |
| `nativestep session start --target <t> [--device] [--fixtures a,b] [--route <url>]` · `nativestep session stop [--target <t>]` | Starts a background session on the target, headless or (with `--device`) on the simulator or emulator; `ls` and `do` use this session. On a running session it sends a new `start`. |
| `nativestep ls [--target <t>]` | The focused node: name, state, actions |
| `nativestep do <action> [json] [--target <t>] [--no-wait]` | Runs an action and waits until `busy` is `false`; `--no-wait` returns the state right after the action |
| `nativestep test [filter] [--target a,b] [--device]` | Runs `bun test` under `spec/` for each target and writes the results to `.nativestep/results/` |
| `nativestep lint` | Checks the rules tagged *lint* in ARCHITECTURE.md |
| `nativestep shot <test-file> [--name <test>] --target a,b [--out <dir>]` | Replays the test on device targets and takes a screenshot at the test's final state |
| `nativestep status [--screens \| --features]` | Progress from `inventory.json` and the latest test results |

Shared behavior:

- Output is plain text for people by default; `--json` gives JSON for machines. No TUI, colors or spinners.
- Exit codes: `0` success, `1` a test, lint rule or gate failed, `2` usage or configuration error.
- `.nativestep/` is the runtime directory (session sockets, results, screenshots, scan output) and stays out of git.
- A session is a background process that holds one connection to the target and listens on `.nativestep/sessions/<target>.sock`; its log is next to the socket.
- `shot` runs the test with `NATIVESTEP_SHOT_CMD` and `NATIVESTEP_SHOT_OUT` set. After each test the SDK waits until `busy` is `false`, then `NATIVESTEP_SHOT_SETTLE_MS` (800 ms by default) for animations, and runs the target's `device.screenshot`. Files are named `<file>[-<test>]-<target>.png` under `.nativestep/shots/`.

## 2. @nativestep/test

The SDK behavior tests are written with. It is built on the Bun test runner and has no runtime dependencies.

```ts
import { test } from "bun:test";
import { session } from "@nativestep/test";

test("decrement does nothing when stock is zero", async () => {
  const app = await session({ fixtures: ["inventory/stock-zero"], route: "basket://stock/s1" });
  await app.precondition("StockAdjust", s => s.quantity === 0);
  await app.do("decrement", {}, s => s.quantity === 0);
  await app.unavailable("confirm");
});
```

| API | Behavior |
|---|---|
| `session({ fixtures, route? })` | Reads the fixture files under `spec/fixtures/`, merges them (PROTOCOL.md §7) and sends `start` |
| `precondition(name, pred?)` | Polls with `ls` until the focused node is `name` and `pred(state)` returns true |
| `do(action, input?, pred?)` | Sends the action. With `pred`, polls until it returns true; without it, until `busy` is `false` |
| `unavailable(action)` | Asserts that the action is not available |
| `node`, `path` | The last node and path seen |

- Polling defaults to a 3 s timeout and a 25 ms interval; `NATIVESTEP_TIMEOUT_MS` changes the timeout. No `sleep`.
- On timeout, the error message includes the last node and path.
- The target comes from the `NATIVESTEP_TARGET` environment variable, which `nativestep test` sets for each target. One host process per target stays up for the whole test run, and each `session` sends a new `start`.
- `network_blocked` and `fixture_missing` fail the test with a clear message.
- On a device target the SDK connects to `device.connect` and retries until a `hello` gets an answer, for up to `NATIVESTEP_CONNECT_TIMEOUT_MS` (20 s by default). A port forwarder such as `adb forward` accepts connections before the app listens, so only an answer counts.

## 3. NativeStepKit (iOS)

The Swift package used by Core and the host. It is platform-independent and builds on macOS.

| Product | Contents | Used by |
|---|---|---|
| `NativeStepKit` | `IntrospectionNode`, `NodeAction`, `NodeInput` and `InputSchema`, `JSONValue`, `AppError`, `Effect`, `EffectRunner` and `Effects` (the in-flight count behind `busy`), `StackNavigator`, `TabNavigator`, `ModalNavigator` | Core |
| `NativeStepHostKit` | Node tree, focus and lent-action resolution, stdio and TCP protocol server, `FixtureStore`, default `Clock` and `IdGenerator` fixtures, `NetworkGuard` (`URLProtocol`) | `nativestep-host`, the App's debug build |

In v1, input schemas are written by hand. A macro that derives the schema from the `NodeInput` type comes later. `Router` and `Route` are not in the kit: each app's Core defines them (ARCHITECTURE.md R14).

The fixture services live in a `CoreHost` library product of `ios/Core`, next to `fixtureCore(fixtures, route:)`, which builds Core with them. The headless host and the App's debug build both use it. The App starts `NativeStepHost.listen(app:makeRoot:)` (port 7358) inside `#if DEBUG`; `makeRoot` also swaps the core the views draw. The Xcode project is generated from `ios/project.yml` with XcodeGen.

## 4. nativestep-kit (Android)

The Kotlin/JVM counterpart of NativeStepKit, with the same API names.

| Module | Contents | Used by |
|---|---|---|
| `nativestep-kit-core` | `IntrospectionNode`, `NodeAction`, `InputSchema`, `NodeJson` (state encoding settings), `AppError`, `Effect`, `EffectRunner` and `Effects`, navigators | `:core` |
| `nativestep-kit-host` | Node tree, focus, stdio and TCP server, `FixtureStore`, default fixtures, `NetworkGuard` | `:host`, the debug build of `:app` |

In a fixture session the host never constructs the real services (R4), so the network guard is the second line of defense. It is a default `ProxySelector` that records the first URL and sends every connection to a closed local port. That covers `HttpURLConnection`, `java.net.http`, OkHttp and plain sockets; code that passes `Proxy.NO_PROXY` gets through.

`:host` is a library with the fixture services and `fixtureCore(fixtures, route, scope)`, plus the headless entry point. `:app` takes it as a `debugImplementation` dependency. `NativeStepLauncher` exists twice: in `src/debug` it starts `NativeStepHost.listen(7359)` on the main dispatcher and swaps the app's core on `start`; in `src/release` it does nothing.

## 5. nativestep_adapter (Flutter)

The Dart package that connects the reference Flutter app to the protocol. It has two layers:

| Layer | Where | What |
|---|---|---|
| Core (fixed) | `kits/flutter/` | A pure Dart package with no dependencies: `StepServer` (TCP protocol server), `StepNode`, `StepAction`, `InputSchema`, `FixtureStore`, and a network guard on `HttpOverrides`. `busy` is the number of fixture calls in flight. `StepRecorder` (fixture recording) comes in M5. Knows no state management or routing package. |
| Binding (per project) | `spec/adapters/flutter/nativestep_binding/` | Code the `step-reference` skill writes for that one project. It connects the project's state management and navigation to `StepNode`s and its repositories to fixtures. |

The binding's duties:

1. Register the state and actions of driven screens as `StepNode`s.
2. On `start`, rebuild the app with fixture-backed services, for example with a Riverpod provider override or a BLoC repository provider. A binding that cannot do this does not report the `start` capability in `hello`.
3. Map Flutter repository and method names to target service names. Fixtures and recordings are always written with the target names; the mapping is in `spec/profile.md`.
4. In recording mode, write real service responses to `spec/fixtures/` with `StepRecorder`, in the PROTOCOL.md §7 format.

The reference runs as a debug app on the iOS simulator (`flutter build ios --simulator --debug --dart-define=NATIVESTEP=true`), so `simctl` takes its screenshots like the iOS target's. `StepServer` listens on port 7357.

Only two places change in the Flutter repo: `pubspec.yaml` gets a path dependency on the binding, and `main.dart` gets one startup line that runs only in debug builds with `--dart-define=NATIVESTEP=true`. Both are reverted when the migration is done.

## 6. Templates

The compilable projects that `nativestep init` sets up. The template decides the architecture; the agent fills it in.

| Template | Contents |
|---|---|
| `templates/ios` | `project.yml` (XcodeGen), `Core/Package.swift` (the Core library, the `CoreHost` fixture library, the `nativestep-host` executable, a dependency on `../kits/ios`), `App/`, the `Sample` and `About` features |
| `templates/android` | `settings.gradle.kts`, version catalog (`gradle/libs.versions.toml`), Gradle wrapper, `:core` (JVM), `:host` (JVM library and application), `:app` (Compose), `includeBuild` for `../kits/android`, the `sample` and `about` features |
| `templates/spec` | `package.json`, `tests/_sample/`, `fixtures/_sample/`, empty `inventory.json` and `memory.md`. `nativestep test` links `@nativestep/test` to `kits/test-sdk`. |
| `templates/.github/workflows/parity.yml` | `nativestep test --target ios,android` on every PR; `nativestep lint` joins in M4 |
| `templates/nativestep.json`, `templates/.gitignore` | The `ios` and `android` targets (§8) |

The templates map one to one onto the project root. The placeholders are `__APP_NAME__`, `__IOS_BUNDLE_ID__` and `__ANDROID_PACKAGE__`. They are filled by plain text replacement in file names and in text files; in paths, `__ANDROID_PACKAGE__` becomes directories (`com/basket/app`). The `Sample` and `About` screens are the conformance screens; a migrated app keeps them until the migration ends.

**Sample screen and conformance tests.** The `Sample` screen implements the same behavior on every platform, and the `tests/_sample/` tests are the protocol's conformance tests. A target that does not pass them does not follow the protocol.

| Behavior | Checks |
|---|---|
| `count` starts at 0; `increment` and `decrement` (no effect at 0) | state, actions |
| `set` takes `{ value: integer ≥ 0 }` | input schema, `invalid_input` |
| `load` → `SampleService.list` | effects, `busy`, fixture matching, `delayMs` |
| Missing fixture | `fixture_missing` |
| `openDetail({ id })` → `SampleDetail`, then `goBack` | stack navigator, lent actions |
| `selectTab({ tab })` → `About`, and back to the stack the tab left | tab navigator, `enum` input |
| `openLicense` on `About` → `License` modal, then `dismiss` | modal navigator; a modal hides what the navigators under it lend |
| Nonexistent action | `action_unavailable` and the `available` list |
| `_probeNetwork` (sample only) | `network_blocked` |
| Starting with `route` (`detail/<id>`, `license`) | deep links (R16) |

Acceptance: a freshly created project passes `nativestep lint` cleanly and `nativestep test _sample --target ios,android` is green. This check runs on every PR in the nativestep repo's CI.

## 7. Skills

The agent's method. Each skill is a `skills/<name>/SKILL.md` file, plus `references/` files where needed. The toolkit ships as a Claude Code plugin.

Writing rules:

- A skill carries questions and methods, not answers. It contains no package names, architectures or library rules about the source project.
- Everything discovered is written to the project's files (§8), not into the skill.
- Skills point to ARCHITECTURE.md for the output architecture and to PROTOCOL.md for the wire format; they do not copy their content.
- Every step that can be checked is done with a `nativestep` command.

| Skill | Phase | Input | Output | Commands used |
|---|---|---|---|---|
| `step-adopt` | migration | Flutter repo | `nativestep.json`, `spec/profile.md`, `spec/inventory.json`, native skeleton | `nativestep init`, `nativestep scan`, `nativestep lint`, `nativestep test` |
| `step-reference` | migration | `profile.md` | `spec/adapters/flutter/nativestep_binding/`, two changes in the Flutter repo | `nativestep ls`, `nativestep do` (flutter) |
| `step-plan` | always | Reference: Flutter code, or docs and designs | Features, order and checkpoints in `inventory.json` | `nativestep status` |
| `step-feature` | always | One feature | A commit per checkpoint, and `spec/evidence/` | All; runs the gates |
| `step-fix` | always | Bug description | A red test, then the fix on both platforms | `nativestep test` |
| `step-test` | always | Reference | `spec/tests/`, `spec/fixtures/` | `nativestep test`, `nativestep session` |
| `step-screen` | always | Tests and reference, one platform | ViewModel, node, view | `nativestep test`, `nativestep lint` |
| `step-ui-review` | always | `nativestep shot` screenshots | List of differences: severity, location, `INVALID` when needed | `nativestep shot` |
| `step-arch-review` | always | Changed code | Findings with ARCHITECTURE.md rule numbers | — |

`step-adopt` and `step-reference` are not used after the migration. The other seven skills continue in native development.

## 8. Project files

Every piece of project-specific knowledge is in these files. The number of documents is kept small on purpose.

| File | What | Written by | Lifetime |
|---|---|---|---|
| `nativestep.json` | Targets and app identity | `nativestep init`, engineer | Permanent |
| `spec/inventory.json` | Raw scan summary, screens, features, checkpoints and their status | `nativestep scan`, `step-plan`, `step-feature` | Permanent |
| `spec/profile.md` | How the source code works; mappings and decisions specific to this project | `step-adopt`; the engineer approves | Moved to `spec/archive/` after migration |
| `spec/memory.md` | Engineer feedback and project decisions | `step-feature`, `step-plan` | Permanent |
| `spec/tests/`, `spec/fixtures/` | The behavior contract | `step-test` | Permanent |
| `spec/evidence/<feature>-<cp>/` | UI reviews, test results, reviewer verdicts | `step-feature` | Permanent |
| `kits/` | Kit copies | `nativestep init` | Permanent |
| `.nativestep/` | Sessions, results, screenshots, scan output | `nativestep` | Outside git |

### `nativestep.json`

```json
{
  "protocol": 1,
  "kits": "0.1.0",
  "app": { "name": "Basket", "iosBundleId": "com.basket.app", "androidPackage": "com.basket.app" },
  "paths": { "tests": "spec/tests", "fixtures": "spec/fixtures" },
  "targets": {
    "flutter": {
      "role": "reference",
      "device": {
        "build": "cd ../basket-flutter && flutter build ios --simulator --debug --dart-define=NATIVESTEP=true && xcrun simctl install booted build/ios/iphonesimulator/Runner.app",
        "setup": "xcrun simctl launch --terminate-running-process booted com.basket.flutter",
        "connect": "tcp://127.0.0.1:7357",
        "screenshot": "xcrun simctl io booted screenshot {out}"
      }
    },
    "ios": {
      "build": "swift build --package-path ios/Core --product nativestep-host",
      "headless": "ios/Core/.build/debug/nativestep-host",
      "device": {
        "build": "cd ios && xcodegen generate --quiet && xcodebuild -project Basket.xcodeproj -scheme Basket -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath build -quiet build && xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/Basket.app",
        "setup": "xcrun simctl launch --terminate-running-process booted com.basket.app",
        "connect": "tcp://127.0.0.1:7358",
        "screenshot": "xcrun simctl io booted screenshot {out}"
      }
    },
    "android": {
      "build": "android/gradlew -p android -q :host:installDist",
      "headless": "android/host/build/install/host/bin/host",
      "device": {
        "build": "android/gradlew -p android -q :app:installDebug",
        "setup": "adb forward tcp:7359 tcp:7359 && adb shell am start -S -W -n com.basket.app/.MainActivity",
        "connect": "tcp://127.0.0.1:7359",
        "screenshot": "adb exec-out screencap -p > {out}"
      }
    }
  }
}
```

| Field | Meaning |
|---|---|
| `role` | `reference` makes the target the source of behavior (G0). The target is removed when the migration is done. |
| `build` | Build command that runs once before the tests |
| `headless` | Command that starts the host speaking the protocol over stdio. It calls the compiled binary so that build tools do not pollute stdout. |
| `device.build` | Builds and installs the debug app; runs once before device tests, in place of `build` |
| `device.setup` | Starts the app (and forwards the port where needed); runs after `device.build` |
| `device.connect` / `screenshot` | Connection address and screenshot command for the device target (`{out}` is the file path) |

Commands run from the directory that contains `nativestep.json`.

### `spec/inventory.json`

```json
{
  "raw": {
    "packages": [{ "name": "dio", "version": "5.7.0", "direct": true }],
    "dartFiles": 212,
    "assets": 38,
    "nativeCode": [{ "path": "ios/Runner/AppDelegate.swift", "channels": ["basket/biometrics"] }]
  },
  "screens": [
    { "name": "Catalog", "feature": "catalog", "reference": "driven",
      "source": ["lib/features/catalog/catalog_screen.dart"],
      "deepLinks": ["basket://category/:id"], "status": "migrated" }
  ],
  "features": [
    { "name": "catalog", "dependsOn": ["foundation"],
      "checkpoints": [{ "id": "cp1", "title": "Product list", "status": "done", "commit": "a1b2c3d" }] }
  ]
}
```

- A screen's `reference` value: `driven` (can be driven over the protocol in Flutter), `read-only` (tests are written by reading the code only) or `none` (added after the migration).
- A screen's `status` value: `pending`, `in_progress` or `migrated`.
- A checkpoint's `status` value: `planned`, `in_progress` or `done`.

## 9. Gates

Gates run in order at every checkpoint. When a gate fails, the agent fixes the problem and runs the gate again; it cannot skip a failed gate.

| Gate | What | Pass condition | After migration |
|---|---|---|---|
| G0 Reference | New tests run on the Flutter target | All pass. For `read-only` screens, the engineer approves the tests as the spec. | The engineer approves the tests as the spec |
| G1 Behavior | `nativestep test --target ios,android` | All pass | Same |
| G2 Lint | `nativestep lint` | 0 violations | Same |
| G3 UI review | `nativestep shot` and `step-ui-review` | No blocking differences. On `INVALID`, the screenshots are taken again. | Compared against the design |
| G4 Architecture review | Two isolated `step-arch-review` runs | Both approve. After a fix, G1 runs again, and G3 too if the change is visible. | Same |
| G5 Engineer | The code and the running app | Approval. Feedback is written to `memory.md`. | Same |

G3 is skipped for checkpoints that change only logic. In autonomous mode G5 can be skipped; the other gates always run.
