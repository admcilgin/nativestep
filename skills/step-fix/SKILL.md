---
name: step-fix
description: Fix a reported bug in a nativestep app by first capturing it as a red behavior test, then fixing it on both platforms until the test is green everywhere. Use when the engineer reports a bug, when a review finds one in older code, or when a gate fails on a test that passed before.
---

# step-fix

Input: a bug report — what the user did, what they saw, what they expected, and on which platform. Output: one new or corrected test that was red and is now green on every target, the fix on both platforms, and one commit.

A bug fixed without a test comes back. A bug fixed on one platform is a parity bug waiting to happen. This skill exists to prevent both.

## 1. Reproduce over the protocol

- Find the screen and the steps. Start a session with the fixtures the report implies and drive it by hand: `nativestep session start --target <platform>`, `nativestep ls`, `nativestep do`.
- Compare the state and the actions with what the report says the user saw. Run the same steps on the other platform and, during a migration, on the reference.

Decide which kind of bug it is:

- **Behavior** — the node tree is wrong (state, path, available actions). It can be tested; go on.
- **View only** — the node tree is right but the screen is wrong (a text, a formatter, a hidden button that the node offers). Behavior tests cannot see it. Fix the view, and check it with `nativestep shot` on a test that ends in that state (step-ui-review); the commit names the shot instead of a test.
- **Real service** — the fixture path is right and the bug is in the HTTP or platform implementation (R4). Fix it there with a unit test on that platform, and say that behavior tests do not cover it.
- **Not a bug** — the app does what the reference or the docs say. Report that, with the evidence, and stop.

## 2. Write the red test

- Run step-test's rules on this one behavior: name it for what the user expects, start from the user's start, reach the bug through the app's own actions.
- Put it with its feature's tests (`spec/tests/<feature>/`), next to the checkpoint it belongs to. If an existing test asserts the wrong thing, correct that test instead of adding one, and say so.
- During a migration, run it on the reference first (G0). It must pass there; if the reference has the same bug, the expected behavior is the engineer's decision (`spec/memory.md`) and the test is approved as the spec.

```bash
nativestep test <feature>/<topic> --target ios,android
```

It must be red on every platform that has the bug, and the failure message must show the bug, not a setup error. A test that is green before the fix does not capture the bug: change it until it is red.

## 3. Fix

- Fix the root cause in Core, in the smallest change, on the platform that has the bug. Then read the other platform's same code: if the bug is there too, fix it the same way; if it is not, check why the two differ, because one of them is not following the other (R12).
- Never change a fixture or a test to make the fix pass. The red test is the contract.

## 4. Gates

```bash
nativestep test --target ios,android
nativestep lint
```

All tests, not only the new one. Then step-arch-review on the diff. If the fix changed a view, take the shots of the affected states again and run step-ui-review.

## 5. Close

- Commit the test and the fix together. The message names the bug and the test, for example `Fix: retry after a refresh error showed the old list (catalog/product-list-errors)`.
- If the bug shows a gap in a skill (a behavior step-test should have listed, a rule step-screen should have followed), add one line to that skill or to `spec/memory.md`.

Report the bug's kind, the test and its red and green results per target, the fix per platform, and the gates.
