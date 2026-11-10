# nativestep protocol · version 1

The CLI and the test SDK talk to every target with the same protocol: the Flutter reference app, iOS and Android. This is the only interface the three platforms share. If a target follows this document, the rest of the toolkit works with it.

The conformance tests live in `templates/spec/tests/_sample/`, and every target must pass them (COMPONENTS.md §6).

## 1. Transport

- Messages are UTF-8 JSON, one message per line (NDJSON).
- **Headless target**: the CLI starts the host process, writes requests to its stdin and reads responses from its stdout. The host writes nothing but protocol messages to stdout; logs go to stderr. One host process can run several sessions in a row.
- **Device target**: the running debug app listens on a TCP port. Default ports: flutter 7357, ios 7358, android 7359. On Android the port is opened with `adb forward`.
- Every request gets exactly one response. Responses arrive in request order; the client does not send a new request before it has received the previous response.

## 2. Envelope

```json
{ "id": 7, "cmd": "ls" }
```

```json
{ "id": 7, "ok": true, "node": { … }, "path": [ … ], "busy": false }
```

```json
{ "id": 7, "ok": false, "error": { "code": "action_unavailable", "message": "…", "available": ["load", "goBack"] } }
```

`id` is an integer chosen by the client and returned unchanged in the response. Error codes are in §8.

## 3. Commands

### `hello`

The first request after connecting.

```json
→ { "id": 1, "cmd": "hello", "protocol": 1 }
← { "id": 1, "ok": true, "protocol": 1, "target": "ios", "app": "Basket", "capabilities": ["start"] }
```

If `capabilities` does not include `start`, the target cannot start a session with fixtures. On such a target only `ls` and `do` are possible, against the running app's current state. If the versions do not match, the response is a `protocol_mismatch` error.

### `start`

Starts a new session: rebuilds Core from scratch with the given fixtures. The previous session is discarded.

```json
→ { "id": 2, "cmd": "start", "fixtures": { "services": { … }, "flags": { … } }, "route": "basket://product/p1" }
← { "id": 2, "ok": true, "node": { … }, "path": ["App", "Tabs", "Stack", "ProductDetail"], "busy": false }
```

- `fixtures`: the merged fixture document (§7). Reading and merging the files is the client's job; the target does not access the file system.
- `route`: an optional deep link. Without it, the app opens on its own start screen.

### `ls`

Returns the focused node.

```json
→ { "id": 3, "cmd": "ls" }
← { "id": 3, "ok": true, "node": { … }, "path": [ … ], "busy": false }
```

### `do`

Runs an action on the focused node or on a navigator that contains it.

```json
→ { "id": 4, "cmd": "do", "action": "setQuantity", "input": { "value": 3 } }
← { "id": 4, "ok": true, "node": { … }, "path": [ … ], "busy": true }
```

The response shows the state right after the action is sent. Effect results appear in later `ls` responses. When `busy` is `false`, no effects are in flight.

### `stop`

Ends the session. A headless host process stays up and waits for a new `start`.

## 4. Node and focus

```json
{
  "name": "Catalog",
  "state": { "items": [], "page": 0, "loading": false },
  "actions": [
    { "name": "load", "title": "Load" },
    { "name": "openProduct", "title": "Open product",
      "input": { "type": "object", "properties": { "id": { "type": "string", "minLength": 1 } }, "required": ["id"] } },
    { "name": "goBack", "title": "Back", "lentBy": "Stack" }
  ]
}
```

- Nodes form a tree: the root (`App`) → navigators → ViewModel nodes. Each node points to at most one `child`. The deepest node in the chain is **focused**.
- `path` is the list of node names from the root to the focused node.
- `actions` holds the focused node's own actions first, then those lent by the navigators above it (`lentBy`: the name of the lending node). If two actions share a name, the nearest node wins.
- `state` is a JSON object. With the same fixtures and the same sequence of actions it comes out the same every time (ARCHITECTURE.md R6).
- `null` values are left out of `state`: an empty optional field is absent on every platform, never `null`. Fields with default values are always written.
- `busy` (in the response): whether any effect is in flight in the session.

## 5. Action input

Input is a JSON object, validated against the action's `input` schema. The schema is a small subset of JSON Schema:

| Key | Values |
|---|---|
| `type` | `object`, `string`, `integer`, `number`, `boolean`, `array` |
| `properties`, `required` | for `object` |
| `items` | for `array` |
| `enum` | a list of fixed values |
| `minimum`, `maximum` | for `integer` and `number` |
| `minLength`, `maxLength` | for `string` |

An action without input gets no `input`, or `{}`. Input that fails validation never reaches the ViewModel. The response is an `invalid_input` error whose `errors` field holds a list of `{ "path": "/value", "message": "…" }`.

## 6. Network guard

The host keeps the network guard on for the whole session, from `start` to `stop`. Outside a session, for example while someone uses a debug app by hand, the guard is off. When a request is attempted:

1. The request is not sent.
2. The session is poisoned. From then on, `ls` and `do` return the same `network_blocked` error, which includes `request: { url, method? }` (the method only where the platform's guard can see it).
3. A new `start` clears the session.

`fixture_missing` poisons the session the same way. The point is to keep a test from silently carrying on with the wrong state when a fixture is missing.

## 7. Fixture document

Fixtures are defined at the service boundary: what a service method returns when it is called with which arguments.

```json
{
  "services": {
    "ProductService": {
      "list": [
        { "args": { "page": 1 }, "result": { "page": 1, "items": [ … ] } },
        { "args": { "page": 2 }, "result": { "page": 2, "items": [ … ] }, "delayMs": 300 }
      ],
      "detail": [
        { "args": { "id": "p404" }, "error": { "code": "notFound" } },
        { "result": { "id": "p1", "name": "Tomato", "price": 34.9 } }
      ]
    },
    "Clock": { "now": [ { "result": "2026-11-10T09:00:00Z" } ] }
  },
  "flags": { "favorites": true }
}
```

**Matching.** When a service call arrives, the method's entries are tried in order. The first entry whose `args` are a subset of the call's arguments matches; an entry without `args` matches every call. If no entry matches, the session is poisoned with `fixture_missing`.

**Entry fields.**

| Field | Meaning |
|---|---|
| `args` | Arguments to match on. Parameter names are the names in the service definition (ARCHITECTURE.md R5). |
| `result` | A successful result; decoded into the service's return type. |
| `error` | An error: `{ "code": "…", "message": "…" }`. Decoded into the platform's `AppError` type. |
| `delayMs` | A delay before the result. For testing loading states. |
| `times` | How many times the entry matches; once used up, the entry is skipped. For example, first an error, then a success. |

An entry has exactly one of `result` and `error`.

**Defaults.** Without a `Clock` fixture, the clock stands still at `2026-01-01T00:00:00Z`. Without an `IdGenerator` fixture, ids are generated in sequence: `id-1`, `id-2`…

**Merging.** The client merges several fixture files in order. For the same service and method, a later file's entries are placed in front of the earlier ones, so they are tried first. `flags` is merged shallowly; the later file wins.

**Recording.** The Flutter adapter writes the reference app's real service responses in this format, using the target service names (COMPONENTS.md §5).

## 8. Error codes

| Code | When | Extra fields |
|---|---|---|
| `bad_request` | The line is not JSON, or has no `cmd` | — |
| `unknown_command` | Unknown `cmd` | `commands` |
| `protocol_mismatch` | The version in `hello` is not supported | `supported` |
| `no_session` | `ls` or `do` without `start` | — |
| `action_unavailable` | The action is neither on the focused node nor among the lent actions | `available` |
| `invalid_input` | The input does not match the schema | `errors` |
| `network_blocked` | A network request was attempted in the session; the session is poisoned | `request` |
| `fixture_missing` | A service call has no matching fixture; the session is poisoned | `service`, `method`, `args` |
| `unsupported` | The target does not support this command | — |
| `internal` | Unexpected error in the host | `detail` |

## 9. Versioning

`protocol` is an integer. Additions that do not change the meaning of existing fields do not bump the version; clients ignore fields they do not recognize. Every breaking change bumps the version, and the kits and the CLI are updated together.
