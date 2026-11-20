# Memory

Engineer feedback and project decisions that depart from the defaults (ARCHITECTURE.md §9). One entry per decision, newest last.

## 2026-11-20 · Feature cut (step-plan, draft)

- `foundation` holds the shell and the signed-in session (`App` switches between Login and the tabs on it), so `catalog`'s sign-out needs only `foundation`, not `auth`.
- `basket` owns the basket store, Basket and OrderPlaced. It depends on `catalog` because the only way into the basket is ProductDetail's `addToBasket`, which its first checkpoint adds.
- `auth` and `catalog` depend only on `foundation` and can be built in parallel.
- Not yet reviewed by the engineer.

## 2026-11-20 · Login after sign-in (step-feature, foundation cp1, G4 note)

- iOS sets `AppCore.login` to nil after sign-in. Android keeps one `LoginNode` for the life of `AppCore`.
- Sign-out (catalog cp4) must give both platforms a fresh `LoginViewModel`. Its tests check that the form is empty and shows no error after sign-out.
- Resolved in catalog cp4 (2026-11-20): `signOut` builds a fresh `LoginViewModel` on both platforms; tested in `catalog/sign-out.test.ts`.
- ProductDetail stays `in_progress` after catalog is done: its `addToBasket` comes with basket cp1.

## 2026-11-20 · Basket across sign-out (step-feature, basket cp1, provisional)

- The basket survives sign-out on both platforms, as on the reference: AppCore keeps one `BasketViewModel` for its lifetime.
- Provisional until the engineer answers the profile's open question (keep it for the next user, or clear it on sign-out). Clearing would be one line in `AppCore.signOut` plus a test in `catalog/sign-out.test.ts`.

## 2026-11-20 · Order error after the lines change (step-feature, basket cp4, provisional)

- A failed order's error stays on the Basket after the lines change, as on the reference.
  - Emptying the basket hides it.
  - Adding a product shows it again.
  - Placing again keeps it until the answer.
- Both platforms keep it as `orderError` beside the lines and derive `error` in `update`.
- Tested in `basket/checkout-errors.test.ts`.
- Provisional until the engineer answers the profile's open question (reproduce it, or clear the error when the lines change). Clearing it would be one line in each platform's `update`, and the last test would change.

## 2026-11-20 · Features after the migration (step-feature, search cp1)

- Product documents for new features live in `docs/features/<feature>.md`. Their acceptance criteria are the reference, and tests run on `ios,android` only.
- `docs/features/search.md` was written in autonomous mode. The engineer still has to approve the doc, and the tests against it (G0 after the migration).
- The `flutter` target is still in `nativestep.json`. COMPONENTS.md says to remove it when the migration is done. That is the engineer's call, because the reference app is still useful for comparing older screens.
