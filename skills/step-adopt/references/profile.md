# <App> profile

Approved: <date, by whom; empty until the engineer approves>
Source: <path to the Flutter project>, at <commit or version>

How the source app works and how it maps to the target. Written by step-adopt, completed by step-reference, read by every later skill. Facts carry file paths; proposals are marked `Decision:`.

## Entry and configuration

- Which `main` functions or flavors exist, and which one is the reference?
- What is configured at build time or start-up (dart-defines, environment files, base URLs, feature flags), and where does each value come from?
- What runs before the first frame?

## State

- Where does a screen's state live, and what type holds it?
- How does a user action reach the state: which call does the widget make, and what does that call do?
- How can code outside the widget tree read the current state and call those operations? This is what the binding will use.
- Is any visible state kept only inside widgets (text fields, toggles, scroll position, local flags)? Which screens? Those screens are `read-only` unless the binding can reach it.
- What does the state library do on its own: retry failed loads, cache, dispose unused state, deduplicate, debounce? `Decision:` for each one, whether the native app reproduces it.

## Dependency wiring

- How are repositories and other services constructed and handed to the code that uses them?
- How can they be replaced with other implementations at start-up without editing app code? (The binding's injection point; COMPONENTS.md §5, duty 2.)
- Can the whole app be built twice in one process with fresh state each time? If not, what keeps state between runs (globals, singletons, static caches)?

## Services

One row per class that talks to anything outside the process (network, storage, secure storage, platform channels, plugins, clock, random, ids).

| Source class and method | Parameters | Returns | Errors | Target service and method | Target parameters |
|---|---|---|---|---|---|

- Target names follow ARCHITECTURE.md R5 and R12: `<Domain>Service`, methods named for what they do, parameters named for what they mean. `Decision:` for each name.
- What JSON shape do results take on the target? Fixtures are written in it (PROTOCOL.md §7); the source's own DTOs are only a starting point.
- How does the source represent failure (exception types, error codes, result types, HTTP status)? List the cases a screen distinguishes; each becomes a fixture `error.code`.
- Which values come from the clock, random numbers or id generation inside business logic? They become `Clock` and `IdGenerator` (R6).

## Navigation

- Where are routes declared? List each route, its parameters and the screen it shows.
- How are they nested: tabs, nested navigators, dialogs, sheets, full-screen modals?
- Which guards or redirects exist (signed out, onboarding, feature flags)?
- Which deep links does the app accept? Look at the router and at the platform files (URL schemes, associated domains, intent filters).
- How can code outside the widget tree read the current location, the stack of each navigator and the selected tab, and navigate?
- `Decision:` the target navigator tree (ARCHITECTURE.md §5), from App down to each screen.

## Native code and assets

- For each file in `raw.nativeCode` and each platform channel: what it does and what replaces it on the target.
- Plugins that wrap platform features (camera, notifications, payments, biometrics): which target API replaces each.
- Fonts and images: where they are and whether the target copies them.

## Node tree

Written by step-reference. The target names the binding publishes, which the tests and both native apps use.

| Node | Path | State fields | Actions (input) | Source |
|---|---|---|---|---|

## Open questions

Questions for the engineer that block a later skill.
