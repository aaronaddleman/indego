# `PlanRating`

Aaron's thumbs-up / thumbs-down + optional note on a plan Stratix
proposed. One rating per plan. Stratix reads the most recent rating
when building the next plan at the same scale.

Part of the Pronoia feature. See aaronaddleman/stratix#255.

## Design intent

The fastest feedback loop. Ships with phase 1 so Stratix starts
getting signal immediately — before weeks of drag telemetry
accumulate. The planner prompt reads the most recent rating; a
thumbs-down + note is a stronger instruction than any aggregated
drag pattern.

Rating a plan is explicit, not inferred. Absent row = unrated.

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `ID!` | yes | Typed string, `rating_<nanoid>`. |
| `planId` | `ID!` | yes | FK to the plan being rated. |
| `rating` | `RatingValue!` | yes | Enum: `UP`, `DOWN`. Absent row = unrated. |
| `note` | `String` | no | Free-form, ≤500 chars. |
| `ratedAt` | `DateTime!` | yes | ISO 8601. |
| `scale` | `PronoiaScale!` | yes | Which Pronoia scale was being rated (day/week/month). |

## GraphQL

```graphql
enum RatingValue { UP DOWN }

type PlanRating {
  id: ID!
  planId: ID!
  rating: RatingValue!
  note: String
  ratedAt: DateTime!
  scale: PronoiaScale!
}

input RatePlanInput {
  planId: ID!
  rating: RatingValue!
  note: String
  scale: PronoiaScale!
}
```

## Example

Down-rate with a note on why:

```json
{
  "id": "rating_Vm3Xp9",
  "planId": "plan_AbC",
  "rating": "DOWN",
  "note": "Too many deep-focus blocks before lunch, nothing lower-effort to recover with",
  "ratedAt": "2026-11-13T19:45:02-08:00",
  "scale": "DAY"
}
```

## Deliberately out of scope for v1

- **Per-block ratings.** Later we might want "thumbs-down on the
  09:00 writing block specifically." Add a nullable `blockId` when
  that's a clear need. Overall-plan rating is the primary signal.
- **Three-state ratings** (neutral). Omitted. Absent row = unrated.
- **Multi-rate.** One rating per plan per user; later re-rates
  replace the previous row (keep update semantics simple).

## Dependencies

`planId` must reach Indego when Stratix pushes a plan, so a rating
can reference it. See the parallel note in
[docs/schemas/drag-telemetry-event.md](drag-telemetry-event.md).
Resolved by adding a `planId` column on Task and setting it in
`_write_tasks_to_indego`.
