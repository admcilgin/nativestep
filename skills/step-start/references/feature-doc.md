# <feature>

Status: draft

What the user can do with this feature, in two or three sentences.

## Screens

### <NodeName>

What it shows, and how the user gets here (tab, push from `<OtherNode>`, modal, deep link `<pattern>`).

| State | Shown | Design |
|---|---|---|
| loading | … | `docs/design/<feature>/<topic>-loading.png` |
| content | … | … |
| empty | … | — |
| error `<code>` | the message, and the way out | — |

Actions: what the user can do here, with any input and its validation rules.

## Services

| Call | Input | Result | Errors |
|---|---|---|---|
| `<Service>.<method>` | `{ page: Int }` | `{ items: [Item] }` | `offline`, `server` |

Models: the fields of each type the results carry, with their JSON names.

## Acceptance criteria

- AC1: <user action or starting state> → <what the screen then shows>.
- AC2: …

## Decisions

- Decision: <an assumption the engineer has to confirm>.
