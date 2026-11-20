# nativestep guide: install and a first migration

From a clean Mac to the first checkpoint of a Flutter app running natively on iOS and Android. Claude Code does the migration with the nativestep skills; you make the decisions they hand you.

## 1. The machine

A Mac: the reference Flutter app runs on the iOS simulator.

| Tool | Why | Check |
|---|---|---|
| Xcode, with an iOS simulator runtime | the native iOS app and the reference app | `xcrun simctl list runtimes` |
| XcodeGen | the iOS project is generated from `project.yml` | `brew install xcodegen` |
| Android Studio, with an emulator image | the native Android app; its JDK builds Gradle | `emulator -list-avds` |
| Flutter | the source app, built as the reference | `flutter doctor` |
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

### The skills

In Claude Code:

```
/plugin marketplace add admcilgin/nativestep
/plugin install nativestep@nativestep
```

### The CLI

Once a release is published, download `nativestep-darwin-arm64.tar.gz` (`darwin-x64` on an Intel Mac) from its GitHub releases page. Until then, build it from a checkout:

```bash
git clone https://github.com/admcilgin/nativestep && cd nativestep && bun cli/release.ts darwin-arm64
```

Unpack it somewhere permanent and put its `bin/` on `PATH`. `kits/` and `templates/` must stay beside `bin/`: `init` and `kits update` copy them.

```bash
mkdir -p ~/.nativestep && tar -xzf dist/nativestep-darwin-arm64.tar.gz -C ~/.nativestep
```

```bash
export PATH="$HOME/.nativestep/nativestep-darwin-arm64/bin:$PATH"
```

`nativestep` with no arguments prints every command.

## 3. The migration

Open Claude Code in the Flutter project's parent directory and call the skills in this order. You can name them (`/nativestep:step-adopt`) or ask in words ("start a nativestep migration of `./my_app`").

| Step | Skill | What you get | What you decide |
|---|---|---|---|
| 1 | `step-adopt` | The native project next to the Flutter one (`nativestep init`), the scan, `spec/profile.md`, and the screen list in `spec/inventory.json` | The app name, bundle id, package and location (asked up front); then approve the profile, the `Decision:` lines first |
| 2 | `step-reference` | The Flutter app as a test target: a binding under `spec/adapters/flutter/` and two marked lines in the Flutter repo | Nothing, unless the binding needs more than those two lines |
| 3 | `step-plan` | Features, their order and their checkpoints in `spec/inventory.json` | Approve the plan |
| 4 | `step-feature` | One feature, checkpoint by checkpoint, each through the gates below, with a commit and `spec/evidence/<feature>-<cp>/` | Approve each checkpoint (G5) |

`step-feature` calls the other skills itself: `step-test` writes the tests, `step-screen` builds each platform, `step-ui-review` compares screenshots, `step-arch-review` reviews the code. `step-fix` is for bugs: it captures one as a failing test first.

### The gates

Every checkpoint passes six gates before it is committed. The pass conditions are in [COMPONENTS.md](COMPONENTS.md) §9.

| Gate | Checks |
|---|---|
| G0 | The new behavior tests pass on the Flutter reference |
| G1 | The same tests pass on iOS and Android |
| G2 | `nativestep lint` is clean |
| G3 | Screenshots of the same state on all three apps show no blocking difference |
| G4 | Two independent architecture reviews approve |
| G5 | You review the code and the running app and approve; your feedback goes to `spec/memory.md` |

The first checkpoint is reached when `nativestep status` shows it `done` and its evidence folder holds the G0–G4 results.

## 4. While you work

```bash
nativestep status --features
```

```bash
nativestep test --target flutter,ios,android --device
```

```bash
nativestep session start --target ios --device
```

`nativestep ls` then shows the focused screen's state and actions, and `nativestep do <action>` runs one: the same view the tests have. `nativestep shot <test-file> --target flutter,ios,android` takes the screenshots G3 compares.

### One app per port

Every nativestep app uses the same port: 7357 for the Flutter reference, 7358 on iOS, 7359 on Android. Only the app in front listens, so you can switch between projects on one simulator and emulator. An app built with kits older than 0.2.2 keeps the port in the background, and the tests stop with "another nativestep app … holds" or "nothing answers hello". Quit it and run again, or rebuild it after `nativestep kits update`:

```bash
xcrun simctl terminate booted <its bundle id>
```

```bash
adb shell am force-stop <its package>
```

## 5. Keeping the kits current

The project holds a copy of the kits; `nativestep.json` records its version. After installing a newer `nativestep`:

```bash
nativestep kits update --dry-run
```

It lists the files it would add, update or remove. Run it without `--dry-run` to apply, then `nativestep test --target ios,android`. Local edits under `kits/` are overwritten: a kit fix belongs in the nativestep repo.
