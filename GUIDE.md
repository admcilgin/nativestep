# nativestep guide

From a clean Mac to the first checkpoint of a native iOS and Android app, either migrated from Flutter (§3) or new (§4), and the daily loop after that (§5–§7). Claude Code does the work with the nativestep skills; you make the decisions they hand you.

## 1. The machine

A Mac: Xcode builds the iOS app, and a Flutter app being migrated runs on the iOS simulator.

| Tool | Why | Check |
|---|---|---|
| Xcode, with an iOS simulator runtime | the native iOS app and the reference app | `xcrun simctl list runtimes` |
| XcodeGen | the iOS project is generated from `project.yml` | `brew install xcodegen` |
| Android Studio, with an emulator image | the native Android app; its JDK builds Gradle | `emulator -list-avds` |
| Flutter (migration only) | the source app, built as the reference | `flutter doctor` |
| Bun 1.4.4 or later | `nativestep test` runs the tests with `bun test` | `bun --version` |
| Claude Code | runs the skills | `claude --version` |

Gradle needs `JAVA_HOME`. Android Studio's bundled JDK works:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

Device runs need a booted simulator and a running emulator. Keep both open while you migrate:

```bash
xcrun simctl boot "<device name from xcrun simctl list devices available>"
```

```bash
emulator -avd <avd-name> &
```

## 2. Install

```bash
curl -fsSL https://admcilgin.github.io/nativestep/install.sh | bash
```

This puts the latest release's CLI in `~/.nativestep` (macOS or Linux, arm64 or x64), adds `~/.nativestep/bin` to `PATH` in `~/.zshrc` or `~/.bashrc`, and installs the skills plugin into Claude Code. Open a new terminal afterwards. Run it again to update; it replaces `~/.nativestep` as a whole. `curl` also keeps macOS from quarantining the binary, which a browser download does.

`kits/` and `templates/` must stay beside `bin/`: `init` and `kits update` copy them.

Without the `claude` command on `PATH`, the script prints the two commands to run in Claude Code instead:

```
/plugin marketplace add admcilgin/nativestep
/plugin install nativestep@nativestep
```

Then check the machine:

```bash
nativestep doctor
```

Every line should say `ok`; a `fail` names the fix. `warn` lines (no booted simulator, no running emulator) matter only for device runs. `nativestep` with no arguments prints every command.

## 3. Start: migrate a Flutter app

Open Claude Code in the Flutter project's parent directory and call the skills in this order. You can name them (`/nativestep:step-adopt`) or ask in words ("start a nativestep migration of `./my_app`").

| Step | Skill | What you get | What you decide |
|---|---|---|---|
| 1 | `step-adopt` | The native project next to the Flutter one (`nativestep init`), the scan, `spec/profile.md`, and the screen list in `spec/inventory.json` | The app name, bundle id, package and location (asked up front); then approve the profile, the `Decision:` lines first |
| 2 | `step-reference` | The Flutter app as a test target: a binding under `spec/adapters/flutter/` and two marked lines in the Flutter repo | Nothing, unless the binding needs more than those two lines |
| 3 | `step-plan` | Features, their order and their checkpoints in `spec/inventory.json` | Approve the plan |
| 4 | `step-feature` | One feature, checkpoint by checkpoint, each through the gates below, with a commit and `spec/evidence/<feature>-<cp>/` | Approve each checkpoint (G5) |

`step-feature` calls the other skills itself: `step-test` writes the tests, `step-screen` builds each platform, `step-ui-review` compares screenshots, `step-arch-review` reviews the code. `step-fix` is for bugs: it captures one as a failing test first.

Then follow §5 for the gates, and §6 when every checkpoint is done.

## 4. Start: a new app

Open Claude Code where the app should live and call the skills in this order (`/nativestep:step-start`, or "start a new nativestep app for …").

| Step | Skill | What you get | What you decide |
|---|---|---|---|
| 1 | `step-start` | Both native projects (`nativestep init`), a feature doc per feature in `docs/features/` with screens, service calls and numbered acceptance criteria, and the screen list in `spec/inventory.json` | The app name, bundle id, package and location; what the app is for and what ships first; then approve each doc, the `Decision:` lines first |
| 2 | `step-plan` | Features, their order and their checkpoints in `spec/inventory.json`, `foundation` first | Approve the plan |
| 3 | `step-feature` | One feature, checkpoint by checkpoint, through the gates in §5 | Approve the tests against the doc (G0) and each checkpoint (G5) |

The feature docs are the reference. Tests are written from their acceptance criteria, and each test's title starts with the criterion's id (`AC3: …`). Put design exports in `docs/design/<feature>/`, named after the state they show (`step-start` §4); G3 compares the screenshots with them, or the two platforms with each other when there is no design.

## 5. The gates

Every checkpoint passes six gates before it is committed. The pass conditions are in [COMPONENTS.md](COMPONENTS.md) §9.

| Gate | Checks |
|---|---|
| G0 | The new behavior tests pass on the Flutter reference; without one, you approve them against the feature doc |
| G1 | The same tests pass on iOS and Android |
| G2 | `nativestep lint` is clean |
| G3 | Screenshots of the same state show no blocking difference from the reference: the Flutter app, or the design in `docs/design/` |
| G4 | Two independent architecture reviews approve |
| G5 | You review the code and the running app and approve; your feedback goes to `spec/memory.md` |

Each gate's result is a `Result:` line in `spec/evidence/<feature>-<cp>/README.md`. The first checkpoint is reached when `nativestep status` shows it `done`, and `nativestep status --features` shows its gates:

```
auth  1/2 checkpoints
  cp1    done         0✓ 1✓ 2✓ 3✓ 4✓ 5✓    Sign in with email and password
  cp2    in_progress                       Sign-in errors
```

`✓` pass, `-` skipped, `…` pending (an approval you owe, a review that could not run), `✗` fail. `nativestep status` lists done checkpoints with a pending or failed gate under `attention`, and names the next checkpoint to work on.

## 6. Finish a migration

When every checkpoint is done, retire the Flutter reference:

```bash
nativestep migrate finish --dry-run
```

It lists what it will change: the two marked lines leave the Flutter repo, the `flutter` target and `spec/adapters/flutter/` leave the native project, and `spec/profile.md` moves to `spec/archive/`. Run it without `--dry-run`, then commit both repos. From then on the project works like a new app (§4): new behavior is written into `docs/features/` first, and §7 is the daily loop. Keep the Flutter app around while you still compare older screens with it; the command refuses while a checkpoint is open unless you pass `--force`.

## 7. Daily work

| You want to | Ask Claude Code for | It runs |
|---|---|---|
| Add a feature | the feature, with its doc in `docs/features/` (or "write the doc for …" first) | `step-plan` for its checkpoints, then `step-feature` |
| Change a feature | the new behavior, added to its doc as new acceptance criteria | `step-plan` adds checkpoints; `done` ones are never edited |
| Fix a bug | the bug, with the steps to reproduce it | `step-fix`: a red test first, then the fix on both platforms |
| See where things stand | — | `nativestep status`, `nativestep status --features` |

```bash
nativestep status
```

```bash
nativestep test --target ios,android --device
```

```bash
nativestep session start --target ios --device
```

`nativestep ls` then shows the focused screen's state and actions, and `nativestep do <action>` runs one: the same view the tests have. `nativestep shot <test-file> --target ios,android` (with `flutter` during a migration) takes the screenshots G3 compares.

### One app per port

Every nativestep app uses the same port: 7357 for the Flutter reference, 7358 on iOS, 7359 on Android. Only the app in front listens, so you can switch between projects on one simulator and emulator. An app built with kits older than 0.2.2 keeps the port in the background, and the tests stop with "another nativestep app … holds" or "nothing answers hello". Quit it and run again, or rebuild it after `nativestep kits update`:

```bash
xcrun simctl terminate booted <its bundle id>
```

```bash
adb shell am force-stop <its package>
```

### Keeping the kits current

The project holds a copy of the kits; `nativestep.json` records its version. After installing a newer `nativestep`:

```bash
nativestep kits update --dry-run
```

It lists the files it would add, update or remove. Run it without `--dry-run` to apply, then `nativestep test --target ios,android`. Local edits under `kits/` are overwritten: a kit fix belongs in the nativestep repo.
