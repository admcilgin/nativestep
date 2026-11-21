---
name: step-start
description: Start a new native iOS and Android app with nativestep, without a Flutter app to migrate. Creates both projects, turns the engineer's idea into feature docs in docs/features/ with acceptance criteria and service contracts, and lists the screens in spec/inventory.json. Use when a team starts an app from scratch, before step-plan; for a Flutter app, use step-adopt instead.
---

# step-start

Input: the engineer's description of the app (in words, a brief, designs, or an API spec). Output: a nativestep project with `nativestep.json`, a native skeleton that builds and passes the conformance tests, `docs/features/<feature>.md` for the first release, the `screens` in `spec/inventory.json`, and the project decisions in `spec/memory.md`.

There is no reference app. The feature docs are the reference: step-test writes the tests from their acceptance criteria, step-screen builds the screens from them, and step-ui-review compares the screens with `docs/design/` when it exists ([COMPONENTS.md](../../COMPONENTS.md) §8, §9). A gap in a doc becomes a gap in the app, so this skill's work is getting the docs right. The output architecture is fixed: read [ARCHITECTURE.md](../../ARCHITECTURE.md) first.

## 1. Create the native project

The identity is the engineer's decision. Propose it, do not pick it:

- **App name**: a type name (PascalCase).
- **iOS bundle id** and **Android package**: usually the same reverse domain (`com.acme.notes`). No Java or Kotlin keyword as a segment (`native`, `new`, `package`); `init` refuses them.
- **Location**: a new directory, or a folder in an existing repository. Ask.

```bash
nativestep init <dir> --app <Name> --ios-bundle-id <id> --android-package <package>
cd <dir>
nativestep lint
nativestep test _sample --target ios,android
```

Both must pass before you go on. They prove the toolchain, not the app: if they fail, the problem is the machine or the kits.

## 2. Understand the app

Ask until you can answer these, and write the answers into the docs, not into the chat:

- **Users and jobs**: who uses the app and the three to five things they come to do. Each job is a candidate feature.
- **Data**: what the app shows and stores, and where it comes from: an HTTP API (get its spec or the endpoints), local storage, the device (camera, location, notifications). Everything that leaves the process is a service (ARCHITECTURE.md R4, R6).
- **Shell**: tabs or a single stack, what the first screen is, whether there is sign-in, and which screens a deep link opens.
- **First release**: which jobs ship first. Plan only those; the rest goes in a `## Later` list in `docs/features/README.md`.

Ask the engineer for designs. A design export per screen state goes in `docs/design/` (step 4); without designs, the docs' words are the visual spec and G3 compares the two platforms with each other.

## 3. Write the feature docs

One file per feature, `docs/features/<feature>.md`, from [references/feature-doc.md](references/feature-doc.md). The first is always `foundation`: the shell (tabs, stacks, the first screen), shared formatting (dates, prices), and the services every feature uses (`Clock`, `IdGenerator`, an HTTP client's base URL and error mapping).

- **Screens**: every screen with its states: loading, empty, content, and one error state per error code. Name each screen's node the way the tests will (PascalCase, no `Screen` suffix, ARCHITECTURE.md R12).
- **Services**: every call a screen makes, with its input, result and error codes. These are the names the fixtures and the native protocols use, so pick them once here.
- **Acceptance criteria**: numbered (`AC1`, `AC2`, …), one observable behavior each, written as what the user does and what the screen then shows. Every state and every error needs one, and so does the way out of each error (retry, back). step-test turns each one into at least one test and names it in the test's title.
- Mark what you assumed rather than heard with `Decision:`, so the engineer sees it.

Keep docs about behavior. Layout and look are the design's job, the code structure ARCHITECTURE.md's.

## 4. Designs

Name each design export after the state it shows: `docs/design/<feature>/<topic>-<state>.png`, where `<topic>-<state>` is the stem `nativestep shot` will give the shot of the test that ends in that state (`spec/tests/<feature>/<topic>.test.ts` with `--name "<state>"`). step-ui-review then finds the pair without guessing. The screen list in the doc says which states have a design.

## 5. List the screens

Write `screens` in `spec/inventory.json`, one entry per screen in the docs (COMPONENTS.md §8):

- `name`: the node name from the doc.
- `feature`: the doc it is in.
- `reference`: `none`.
- `doc`: `docs/features/<feature>.md`.
- `deepLinks`: the URL patterns that open it, if any.
- `status`: `pending`.

Check it with `nativestep status --screens`.

## 6. Hand over

Write the shell, data and first-release decisions to `spec/memory.md`. Ask the engineer to review the docs, the `Decision:` lines first. A doc is approved when the engineer says so; write `Status: approved <date>` at its top. step-plan reads the approved docs next. A feature doc can change later: a change is new acceptance criteria and new checkpoints, never an edit to a `done` checkpoint's tests without the engineer's say.
