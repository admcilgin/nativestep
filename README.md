# nativestep

A toolkit for moving a cross-platform mobile app to native iOS and Android projects, and for continuing development on those projects with agents working in parallel once the move is done. Flutter is the first supported source.

The approach is adapted from Shopify's [Reflex](https://shopify.engineering/reflex) and [Helix](https://shopify.engineering/helix) posts. Native code is written twice; behavior tests are written once. Agents work in small checkpoints, and every checkpoint passes the same gates.

## Principles

1. **Unknown input, fixed output.** Every source project has its own architecture, packages and networking. The toolkit makes no assumptions about them. It discovers them in each project and writes what it finds into that project's own files. The target native architecture is the same in every project.
2. **Tests once, code twice.** iOS and Android are written separately and share no code. What they share is the behavior contract: the protocol, the tests and the fixtures.
3. **The CLI does the mechanical work; agents do the work that needs judgment.** Rules that can be checked go to the linter. Discovery and writing go to skills.
4. **Few documents, many templates and tests.** Templates that compile and tests that must pass describe the architecture. The documents in this repo are the contract itself. Each project gets at most three generated documents.

## Documents

| File | Contents |
|---|---|
| [GUIDE.md](GUIDE.md) | Install, and a first migration: the machine, the plugin and CLI, the skills in order, the gates. Start here. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | The target native architecture and its numbered rules (R1–R20). `nativestep lint` and the reviewer agents report against these numbers. |
| [PROTOCOL.md](PROTOCOL.md) | The JSON protocol spoken with every target, and the fixture format. The only interface the three platforms share. |
| [COMPONENTS.md](COMPONENTS.md) | The components: CLI, test SDK, kits, Flutter adapter, templates, skills, project files and gates. |
| [PLAN.md](PLAN.md) | Build plan, decisions, open questions and risks (in Turkish). |

## Repository layout (target)

```
nativestep/
├── ARCHITECTURE.md · PROTOCOL.md · COMPONENTS.md · PLAN.md
├── cli/            the nativestep command-line tool (TypeScript, Bun)
├── kits/
│   ├── test-sdk/   @nativestep/test: the behavior test SDK
│   ├── ios/        NativeStepKit: nodes, navigators, effects, protocol server, fixtures, network guard
│   ├── android/    nativestep-kit: the Kotlin/JVM counterpart of NativeStepKit
│   └── flutter/    nativestep_adapter: protocol server and fixture recording for the Flutter reference app
├── templates/      the project `nativestep init` creates: ios/, android/, spec/, nativestep.json, CI
├── skills/         step-adopt, step-reference, step-plan, step-feature, step-fix,
│                   step-test, step-screen, step-ui-review, step-arch-review
└── examples/       Sample apps for development and pilots
```

## Status

Two apps were migrated autonomously with the skills: Basket (12/12 checkpoints) and a movie tracker (13/13), each passing the same tests on Flutter, iOS and Android. M6 and M7 still wait for a run with an engineer (approvals, and a second independent architecture review). M8, packaging, is done but for its check: v0.1.0 ships the CLI as a release, the skills install as a Claude Code plugin, and `nativestep kits update` keeps a project's kits current; [GUIDE.md](GUIDE.md) still has to be followed on a clean Mac ([PLAN.md](PLAN.md)).

## Install

```bash
curl -fsSL https://admcilgin.github.io/nativestep/install.sh | bash
```

[install.sh](install.sh) puts the `nativestep` CLI from the latest [release](https://github.com/admcilgin/nativestep/releases) in `~/.nativestep`, adds it to `PATH`, and installs the skills: the repo is a Claude Code plugin and its own marketplace ([GUIDE.md](GUIDE.md) §2). `bun cli/release.ts <target>` builds the same archive from a checkout. From a checkout, `bun cli/src/main.ts` does the same. Tests still need Bun.

```bash
NS=$PWD
bun cli/src/main.ts init ../demo --app Demo --ios-bundle-id com.demo.app --android-package com.demo.app
cd ../demo && bun "$NS/cli/src/main.ts" test _sample --target ios,android
```

`examples/native-sample` is generated from the templates too; only its Flutter binding (`spec/adapters/`) is written by hand. Edit `templates/`, then regenerate it:

```bash
bun cli/src/main.ts init examples/native-sample --app Sample --ios-bundle-id dev.nativestep.sample --android-package dev.nativestep.sample --reference examples/flutter-sample --force
```

The Android target needs `JAVA_HOME` (Android Studio's bundled JDK works). Device runs (`--device`, and always for the Flutter reference) need a booted iOS simulator, a running Android emulator and XcodeGen; each target's `device.build` builds and installs the debug app.

```bash
cd examples/native-sample
bun ../../cli/src/main.ts test _sample --target flutter,ios,android --device
bun ../../cli/src/main.ts session start --target ios --device
bun ../../cli/src/main.ts do load
```
