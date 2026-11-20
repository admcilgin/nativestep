# auth cp1 and cp2 · Sign in, landing on the products tab; loading, wrong password and network errors

Run on 2026-11-20 with step-feature, autonomous mode. Both checkpoints share one test file and one Login screen, so they share this evidence.

## G0 · Reference

`spec/tests/auth/sign-in.test.ts`, 5 tests. cp1 is the first two; cp2 is the last three.
- signing in lands on the product list
- the email is sent without surrounding spaces
- while signing in, the form shows loading and cannot be sent again
- a wrong password shows unauthorized and keeps the form
- a network error shows network, and signing in again works

`nativestep test auth/ --target flutter`: 5 pass, 0 fail.

## G1 · Behavior

`nativestep test --target ios,android` (headless, all tests): ios 23 pass, 0 fail; android 23 pass, 0 fail.
On devices, `nativestep test auth/ --device`: ios 5 pass, android 5 pass.

## G2 · Lint

`nativestep lint`: clean.

## G3 · UI review

Shots of the wrong-password state are in `shots/`. The set is valid: all three show "Wrong email or password." under the fields.

First pass:
- minor · android: the background is the window's gray, not the theme's surface. Fixed with a full-size `Surface` around `Root`. The shot was taken again; this also changed `foundation-cp1/shots/shell-the-app-starts-signed-out-android.png`.

Second pass: no blocking differences.
- note · ios: the error text is the system red, darker on the reference. The fields are an inset grouped form, a platform convention.

Not covered:
- The loading state (spinner in the button). `nativestep shot` waits for in-flight calls before it takes the shot, so no shot can show a call in flight. The test checks loading through the protocol. The view was checked only by reading `LoginView` and `LoginScreen`.
- The network error. It uses the same view path as unauthorized, with another text.

## G4 · Architecture review

One review run, inline (see foundation-cp1). Verdict: approve, no findings.

Both platforms match:
- State: `loading` and `error`.
- Action: one `signIn(email, password)`, with the email trimmed in `update`.
- Guard: a second sign-in is ignored while one is in flight.
- Node: no actions while loading.
- Error: mapped to `AppError` and shown through `errorMessage`.

`router.signedIn` is called from `update` on both platforms, through the `Router` protocol (R14).

## G5 · Engineer

Skipped (autonomous).
