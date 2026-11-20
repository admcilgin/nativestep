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
