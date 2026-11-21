# auth cp1 and cp2 · Sign in, landing on the products tab; loading, wrong password and network errors

Run on 2026-11-20 with step-feature, autonomous mode. Both checkpoints share one test file and one Login screen, so they share this evidence.

## G0 · Reference

Result: pass

`spec/tests/auth/sign-in.test.ts`, 6 tests. cp1 is the first two; cp2 is the last four.
- signing in lands on the product list
- the email is sent without surrounding spaces
- while signing in, the form shows loading and cannot be sent again
- while signing in, the app stays on the sign-in screen (added for the G3 shot of the loading state)
- a wrong password shows unauthorized and keeps the form
- a network error shows network, and signing in again works

`nativestep test auth/ --target flutter`: 6 pass, 0 fail. `auth/slow` now delays 1500 ms, up from 800, so the shot lands inside the call.

## G1 · Behavior

Result: pass

`nativestep test --target ios,android` (headless, all tests): ios 24 pass, 0 fail; android 24 pass, 0 fail.
On devices, `nativestep test auth/ --device`: ios 6 pass, android 6 pass.

## G2 · Lint

Result: pass

`nativestep lint`: clean.

## G3 · UI review

Result: pass

Shots of the wrong-password state are in `shots/`. The set is valid: all three show "Wrong email or password." under the fields.

First pass:
- minor · android: the background is the window's gray, not the theme's surface. Fixed with a full-size `Surface` around `Root`. The shot was taken again; this also changed `foundation-cp1/shots/shell-the-app-starts-signed-out-android.png`.

Second pass: no blocking differences.
- note · ios: the error text is the system red, darker on the reference. The fields are an inset grouped form, a platform convention.

Loading state: shot with the new `nativestep shot --no-wait`, which does not wait for in-flight calls.
- minor · android: the spinner in the button was larger than the reference's. It is now 20 dp with a 2 dp stroke, and the shot was taken again.
- note · ios: a `ProgressView` in the form row instead of a filled button. This is a platform convention.

Not covered: the network error. It uses the same view path as unauthorized, with another text.

## G4 · Architecture review

Result: pending — second isolated review missing

One review run, inline (see foundation-cp1). Verdict: approve, no findings.

Both platforms match:
- State: `loading` and `error`.
- Action: one `signIn(email, password)`, with the email trimmed in `update`.
- Guard: a second sign-in is ignored while one is in flight.
- Node: no actions while loading.
- Error: mapped to `AppError` and shown through `errorMessage`.

`router.signedIn` is called from `update` on both platforms, through the `Router` protocol (R14).

## G5 · Engineer

Result: skipped — autonomous

Skipped (autonomous).
