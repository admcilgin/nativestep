---
name: step-arch-review
description: Review a checkpoint's native changes against ARCHITECTURE.md and give a verdict, approve or changes, with findings by rule number (gate G4). Run twice per checkpoint in isolated contexts, so neither run sees the other's verdict.
---

# step-arch-review

Input: the diff of one checkpoint (`git diff` against the commit before it, both platforms) and [ARCHITECTURE.md](../../ARCHITECTURE.md). Output: `approve` or `changes`, and findings.

Read ARCHITECTURE.md in full first. A finding cites the rule it breaks (R1…). Something no rule covers is not a finding; if it matters, write it as a note.

## 1. What lint already checks

`nativestep lint` (G2) has passed before this review. Do not repeat its findings. Look for what a pattern match cannot see.

## 2. Read the diff by layer

Go through Core, then Host, then Mobile, on each platform. For each changed file ask:

- **Core.**
  - Does every state change happen in `update` (R8)?
  - Do effects only call services and send results back as actions?
  - Does navigation go through the `Router` (R14)?
  - Does the node show only the actions the user can take now?
  - Does Core import any UI framework or real service?
- **Services.**
  - Is every external call behind a service protocol (R4)?
  - Are service, method and argument names the same on both platforms (R5)?
  - Does a real implementation leak into Core or into a behavior session?
- **Host.** Are the fixture services free of logic: a call in, a fixture out?
- **Mobile.**
  - Do views only read state and send actions (R9)?
  - Is there navigation or business state in a view that belongs in Core?
  - Does anything reach a release build that must not (R20)?
- **Structure.**
  - Are the files in the feature's folder (R17)?
  - Do names match across platforms (R12)?
  - Is there code no test or screen reaches?

## 3. Compare the platforms

Put the two Core diffs side by side. The same feature must have:

- the same State fields;
- the same Actions;
- the same node tree.

A difference that changes behavior is a finding even when the tests pass: it means a test is missing. Say which.

## 4. Verdict

Each finding gives:

- the rule;
- the file and line;
- what is wrong;
- the smallest fix.

The verdict is `changes` if there is any finding. Otherwise it is `approve`. Notes do not block. Keep the review to what is in the diff: findings in older code go to the notes, as candidates for step-fix.
