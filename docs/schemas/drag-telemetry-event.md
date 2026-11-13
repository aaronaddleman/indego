# `DragTelemetryEvent`

Raw event stream capturing every user action on the Pronoia Plan or
Execute screen that moves, resizes, reorders, skips, completes, or
pushes a block. Stored Indego-side. Written from phase 1 onward; read
by Stratix's phase-4 aggregator to learn planning patterns from
real behavior.

Part of the Pronoia feature. See aaronaddleman/stratix#255 for the
broader execution plan.

## Design intent

Raw events are noise on their own; patterns emerge only after
aggregation across weeks. Store cheaply, read lazily. Two layers:

- **Raw layer (this schema)** — every event logged forever. Forensic
  value, and lets future aggregation re-slice the data differently
  without a migration.
- **Aggregate layer (phase 4, not in this doc)** — rolling 7/28/90-day
  buckets. Only aggregates feed the Stratix planner prompt.

A 10-min idle window ends a `sessionId`. When the phase-4 aggregator
rolls events up, same-block-same-session edits collapse into one net
delta — indecisive editing doesn't inflate pattern counts.

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `ID!` | yes | Typed string, `evt_<nanoid>`. |
| `planId` | `ID!` | yes | FK to the plan the block belongs to. Lets aggregates scope to one day's / week's / month's plan. |
| `blockId` | `ID!` | yes | FK to the Task row the event acts on. |
| `kind` | `DragEventKind!` | yes | See enum below. |
| `from` | `BlockSlot` | no | Where the block was. Null for events that don't have a starting state (`COMPLETE`, `DROP`). |
| `to` | `BlockSlot` | no | Where the block went. Null for terminal events (`SKIP`, `DROP`, `COMPLETE`). |
| `occurredAt` | `DateTime!` | yes | ms-precision ISO 8601. |
| `sessionId` | `ID!` | yes | Stable id for a contiguous editing session. 10-min idle window ends it. |
| `scale` | `PronoiaScale!` | yes | Scrubber position when the event fired. |
| `screen` | `PronoiaScreen!` | yes | Which Pronoia screen fired it. |
| `source` | `InputSource!` | yes | Input modality. Later distinguishes mobile-vs-desktop drag patterns. |
| `blockTitleSnapshot` | `String` | no | Title at time of event. Guards against forensic gaps if a block is renamed later. |

## GraphQL

```graphql
enum DragEventKind {
  MOVE       # start/end changed
  RESIZE     # duration changed, start pinned
  REORDER    # position-in-list changed, time unchanged
  SKIP       # user dismissed the block without doing it
  COMPLETE   # user marked block done
  PUSH       # user bumped the block to a later slot or day
  DROP       # user removed the block from the plan
  OVERRAN    # user flagged the block as having taken longer than planned
}

enum PronoiaScale { DAY WEEK MONTH }
enum PronoiaScreen { PLAN EXECUTE RECOVER }
enum InputSource { TOUCH MOUSE KEYBOARD GESTURE }

type BlockSlot {
  start: DateTime
  end: DateTime
  index: Int
}

type DragTelemetryEvent {
  id: ID!
  planId: ID!
  blockId: ID!
  kind: DragEventKind!
  from: BlockSlot
  to: BlockSlot
  occurredAt: DateTime!
  sessionId: ID!
  scale: PronoiaScale!
  screen: PronoiaScreen!
  source: InputSource!
  blockTitleSnapshot: String
}

input RecordDragTelemetryEventInput {
  planId: ID!
  blockId: ID!
  kind: DragEventKind!
  from: BlockSlotInput
  to: BlockSlotInput
  occurredAt: DateTime!
  sessionId: ID!
  scale: PronoiaScale!
  screen: PronoiaScreen!
  source: InputSource!
  blockTitleSnapshot: String
}

input BlockSlotInput {
  start: DateTime
  end: DateTime
  index: Int
}
```

## Example event

User drags the writing block from 14:00 → 09:00 on the Plan screen
at day zoom, on iPhone:

```json
{
  "id": "evt_7Hk9mN2qPx",
  "planId": "plan_AbC",
  "blockId": "task_42",
  "kind": "MOVE",
  "from": {
    "start": "2026-11-13T14:00:00-08:00",
    "end":   "2026-11-13T15:30:00-08:00",
    "index": 3
  },
  "to": {
    "start": "2026-11-13T09:00:00-08:00",
    "end":   "2026-11-13T10:30:00-08:00",
    "index": 1
  },
  "occurredAt": "2026-11-12T22:14:33.812-08:00",
  "sessionId": "sess_Qr7Lp",
  "scale": "DAY",
  "screen": "PLAN",
  "source": "TOUCH",
  "blockTitleSnapshot": "Write Pronoia blog post draft"
}
```

## Deliberately out of scope for v1

- **`userId`** — single-user project. Infer at query time.
- **Device-level fields** (model, OS version). `source` carries enough
  signal to distinguish mobile-vs-desktop drag patterns; detailed
  device info is a privacy cost without a clear use case.
- **Chain-of-events linking** — each drag is atomic. Indecisive
  editing is reconstructed at rollup time by grouping on `sessionId`.
- **`indegoListId`** — not needed for v1. Add later only if we want
  to track cross-list moves as a distinct signal.

## Dependencies

Each event's `planId` must reference a plan that Indego knows about.
Stratix generates plans and must propagate `planId` through the
push to Indego — see
[docs/schemas/plan-rating.md](plan-rating.md) for the same
constraint on the rating side. Minor change on the Stratix
`_write_tasks_to_indego` path — add a `planId` column on Task,
set it on create.
