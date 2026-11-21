---
name: step-plan
description: Plan nativestep work as features, their order and their checkpoints in spec/inventory.json. During a migration the reference is the Flutter app; without one (after a migration, or in an app started with step-start) it is the feature docs in docs/features/. Use after step-reference or step-start, and again whenever new work is added to a native project.
---

# step-plan

Input: the reference (the Flutter code and `spec/profile.md` during a migration; the approved feature docs in `docs/features/` and the designs in `docs/design/` without one) and the `screens` in `spec/inventory.json`. Output: `features` with `dependsOn` and `checkpoints` in `spec/inventory.json`, and each screen's `feature`. The format is in [COMPONENTS.md](../../COMPONENTS.md) §8.

A feature is a folder on both platforms (ARCHITECTURE.md R17) and the unit parallel agents take. A checkpoint is the unit that passes the gates (COMPONENTS.md §9) and becomes one commit. The plan decides how much can run in parallel and how big each review is.

## 1. Features

- Group screens by what they are about, not by how the source is organized. The source's folders are evidence, not the answer: a source folder per layer (all screens in one place, all repositories in another) says nothing about features.
- Two screens belong together when they share state, a service, or a flow the user goes through without leaving. A screen used by several flows belongs to the feature that owns its data.
- Feature names are lowercase words (`catalog`, `checkout`); the iOS folder is the same name capitalized.
- Put the app shell in a first feature, `foundation`: `AppCore`, the navigator tree from the profile (or from `docs/features/foundation.md`), the `Services` wiring, `Shared/` formatting, and the `Clock` and `IdGenerator` services if the profile found clock or id use. Other features depend on it.
- Set each screen's `feature`. Every screen has exactly one.

## 2. Order

- `dependsOn` lists the features whose code or services a feature needs. Moving between features through `Route` is not a dependency (R18); sharing a service protocol is.
- The graph has no cycles. When two features seem to need each other, the shared part is a service or `Shared/` code that belongs to one of them or to `foundation`.
- Prefer a wide graph: features that depend only on `foundation` can be built at the same time by different agents.
- The order of `features` in the file is the build order for a single agent.

## 3. Checkpoints

For each feature, split the work into checkpoints:

- A checkpoint adds behavior a test can see over the protocol: a screen showing its loaded state, an error state, a flow from one screen to the next, a validation rule. Something with no visible behavior (a model, a service protocol) goes in with the first checkpoint that uses it.
- Each checkpoint is small enough that its tests, both platforms' code and the reviews fit in one sitting. A screen with a list, its loading and its errors is usually one; a form with several validation rules is usually two.
- The first checkpoint of a feature makes its first screen reachable and showing its main state. Later ones add the rest.
- Visual-only work (layout, theming) is its own checkpoint, so logic checkpoints skip G3.
- `id` is `cp1`, `cp2`, … per feature; `title` says what the user can see or do when it is done; `status` is `planned`.

Use the reference to find the behaviors: during a migration, the profile's service errors and navigation guards, and each screen's branches in the Flutter code; without one, the acceptance criteria in the feature docs (each criterion lands in exactly one checkpoint; name them in its title or in `memory.md`) and the states in the designs.

## 4. Check and hand over

```bash
nativestep status
nativestep status --features
```

Every screen has a feature, every feature has checkpoints, and the counts match what you planned. Ask the engineer to review the plan, then write why the features are cut as they are, and anything the engineer changed, to `spec/memory.md`.

Planning again later: add features and checkpoints; never renumber or remove a checkpoint that is `in_progress` or `done`.
