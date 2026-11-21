---
name: step-test
description: Write the behavior tests and fixtures for one nativestep checkpoint, and run them on the reference (gate G0). The tests are the contract both native apps are built against. Use at the start of each checkpoint in step-feature, and in step-fix to capture a bug as a red test.
---

# step-test

Input: one checkpoint from `spec/inventory.json` and its reference: during a migration the Flutter app (driven over the protocol) and `spec/profile.md`; without one, the feature doc in `docs/features/<feature>.md`. Output: `spec/tests/<feature>/<topic>.test.ts`, the fixture documents they use under `spec/fixtures/<feature>/`, and a G0 result.

Tests are written once and run unchanged on every target. The SDK is in [COMPONENTS.md](../../COMPONENTS.md) §2, the fixture format in [PROTOCOL.md](../../PROTOCOL.md) §7, and what belongs in behavior tests (and what does not) in [ARCHITECTURE.md](../../ARCHITECTURE.md) §8. Read those first.

## 1. List the behaviors

Write down, before any code, what a user can observe in this checkpoint. Each item becomes one test.

- Start from the checkpoint's `title` and the screens of its feature.
- During a migration, a screen may still have a stateless node in the binding (step-reference's scope). Design its row in the profile's `Node tree` table, add the node to the binding, and check it with `ls` and `do` (step-reference §5) before writing its tests.
- During a migration, read the screen's code for every branch that changes what is shown or what can be done: loading, empty, error per error code, disabled actions, validation, navigation after success. The profile's service table lists the error codes; its decisions say which library behaviors are in or out.
- Without a reference, every acceptance criterion of the checkpoint gets at least one test, and the test's title starts with its id (`AC3: retry after offline shows the list`). Every state in the doc's screen table and every design is covered too.
- Leave out what belongs to another checkpoint, pure styling, and what the real services do inside (caching, retries, storage). Those are unit, visual or real-service tests.

## 2. Write the fixtures

- Fixtures are written in the target's service and method names (the profile's service table, the feature doc's Services table, or the `Services` in Core).
- Put shared data (a product list, a signed-in user) in its own file and compose files per test: `session({ fixtures: ["catalog/products", "auth/wrong-password"] })`. A later file's entries are tried first.
- Keep each document as small as the test allows. Every call the app makes during the test needs an entry, or the session stops with `fixture_missing`. That is how a test proves which calls happen.
- Use `args` when the test is about what the app sends: a trimmed field, a page number, the items of an order.
- Use `delayMs` to see loading states, `times` to make a call fail once and then succeed.
- For every error a screen shows, test the way out of it: retry, back, or opening the screen again. An error with no way out is a bug, also on the reference; write it to `spec/memory.md` for the engineer.
- During a migration the files in `spec/fixtures/reference/` are a starting point; copy what you need into the feature's folder rather than depending on them.

## 3. Write the tests

- One `test` per behavior, named for the behavior: `"a wrong password shows the error and keeps the form"`, not `"signIn test 2"`.
- Each test starts its own `session`. Reach the screen under test through the app's own actions, from the start the user has: tests are flows, not unit tests of a node.
- Wait for state with predicates (`precondition`, the third argument of `do`). Never sleep, and never assert on a state you did not wait for.
- `do` without a predicate waits until no call is in flight, including calls the next screen starts. To see a loading state after navigation, give `do` a predicate that only that screen's loading state matches.
- A loading state that G3 should see needs a test that ends while the call is in flight (a fixture with `delayMs`, shot with `nativestep shot --no-wait`).
- Give such a fixture a `delayMs` of 3000, so the call is still in flight when the slowest device takes its screenshot. Every later step of that test then needs a predicate: `do` without one waits for the call, and `precondition` gives up after 3 s. A test that waits for the slow call to finish uses its own fixture with a shorter delay (1000 ms): a 3000 ms call and a 3 s `precondition` pass only by luck.
- Check the path when navigation is the behavior (`expect(app.path).toEqual([...])`). Check `unavailable` when the behavior is that something cannot be done.
- Assert on the fields the behavior is about, not on whole states: a test of the error must not break when a new field is added.
- Use the node and action names from the profile's node tree, or from the feature doc and Core without one. A name the reference does not have is a missing node, not a test to rewrite.

## 4. Run G0

```bash
nativestep test <feature>/ --target flutter
```

During a migration every new test must pass on the reference.

- A failing test is wrong until shown otherwise: compare it with what the app does on screen (`nativestep session`, `ls`, `do`, a screenshot).
- If the reference does something the native app should not do, that is a decision for the engineer. Write it to `spec/memory.md`. The binding applies decisions that turn a library behavior off; a decision that changes app behavior means the test cannot pass on the reference, and the engineer approves it as the spec instead.
- For `read-only` screens the tests cannot run on the reference; the engineer approves them as the spec.

Without a reference, G0 is the engineer approving the tests against the feature doc: every acceptance criterion has a test, and no test asserts what the doc does not say. A behavior the doc leaves open is a question for the engineer, and the answer goes into the doc.

Do not run the tests on the native targets here; G1 is step-feature's gate. A red G1 at this point is expected: the native code does not exist yet.

## 5. Hand over

List the tests, the fixtures and the G0 result. Name any behavior from step 1 you could not test over the protocol, and where it will be checked instead.
