---
name: step-feature
description: Take one nativestep feature through its checkpoints, one at a time, each through the six gates (G0–G5), with a commit and evidence per checkpoint. The main loop of a migration and of native development afterwards. Use when the engineer names a feature, or for the next feature in `spec/inventory.json` whose dependencies are done.
---

# step-feature

Input: one feature from `spec/inventory.json`. Output, per checkpoint: tests, native code on iOS and Android, `spec/evidence/<feature>-<cp>/`, the checkpoint marked `done`, and one commit.

The gates and their pass conditions are in [COMPONENTS.md](../../COMPONENTS.md) §9. This skill runs them; it does not redefine them. A failed gate is fixed and run again. A gate is never skipped, except G3 for a logic-only checkpoint and G5 in autonomous mode.

## 0. Before the first checkpoint

- Read `spec/memory.md`. Every entry is a decision the engineer already made; follow it.
- Check that every feature in `dependsOn` is done (`nativestep status --features`). If one is not, stop and say which.
- `nativestep test --target ios,android` must be green before you start. Red tests from earlier work are fixed first (step-fix), not carried into this feature.

Then, for each checkpoint of the feature in order, set its `status` to `in_progress` in `inventory.json` and run steps 1–7.

## 1. Tests (G0)

Run step-test for the checkpoint. Its tests go to `spec/tests/<feature>/`, and they pass on the reference before any native code is written. During a migration, a test that cannot pass on the reference is an engineer decision (step-test §4); wait for it.

A checkpoint whose behavior is already covered by an earlier checkpoint's tests still gets at least one test of its own: the test that would fail if this checkpoint's code were removed.

## 2. Native code (G1)

Run step-screen once for `ios` and once for `android`. The two runs need nothing from each other, so they can run in parallel. Then the gate runs on both together:

```bash
nativestep test --target ios,android
```

All tests, not only the feature's: a new checkpoint must not break an old one.

## 3. Lint (G2)

```bash
nativestep lint
```

## 4. UI review (G3)

Skip this step only when the checkpoint changes no view; write `G3: skipped, logic only` in the evidence.

Take screenshots of the states the checkpoint adds, on the reference and on both platforms, with the checkpoint's own tests:

```bash
nativestep shot spec/tests/<feature>/<topic>.test.ts --name "<test>" --target flutter,ios,android --out spec/evidence/<feature>-<cp>/shots
```

A shot shows the state where the test ends. Pick the tests that end in the states this checkpoint adds; a state that no test ends in needs a test of its own, not a shot taken by hand.

Then run step-ui-review on each set. Blocking differences are fixed in the view (step-screen §5) and the shots are taken again. `INVALID` means the shots do not show the same state; fix the test or the fixture timing and take them again. Do not judge an `INVALID` set.

## 5. Architecture review (G4)

Run step-arch-review twice, each in an isolated context (a subagent with only the skill, the diff and ARCHITECTURE.md), so that the second run does not see the first one's verdict. If subagents are not available, run it once and write in the evidence that the second run is missing. Both must approve. After a fix, run G1 again, and G3 too if the fix changed a view; then review again.

## 6. Evidence and engineer (G5)

Write `spec/evidence/<feature>-<cp>/README.md`:

- the checkpoint id and title;
- the tests added and the G0 result;
- the G1 and G2 results;
- the G3 shots and differences, or why G3 was skipped;
- both G4 verdicts.

Copy results; do not summarize them into a pass. Then show the engineer the diff, the evidence and how to run the app. Every piece of feedback that is a decision goes into `spec/memory.md`, and the gates it touches run again.

In autonomous mode G5 is skipped. Write `G5: skipped (autonomous)` in the evidence and go on.

## 7. Close the checkpoint

1. Set the checkpoint's `status` to `done`. When the feature's last checkpoint is done, set its screens' `status` to `migrated`.
2. `nativestep status` must show the change.
3. Commit the checkpoint alone: tests, fixtures, native code, evidence and `inventory.json`. The message names the feature and checkpoint, for example `catalog cp1: product list loads and shows names and prices`.

Then start the next checkpoint at step 1.

## 8. Hand over

When the feature is done, report its checkpoints with their commits, the gates each passed or skipped, the decisions added to `memory.md`, and the next feature whose dependencies are now done.
