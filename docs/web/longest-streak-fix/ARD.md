# Architecture Requirements Document (ARD) — Longest Streak Fix

## 1. Overview

- **Project Name:** Longest Streak Calculation & Persistence
- **Purpose:** Fix the streak calculation for all frequency types and persist `longestStreak` to Firestore when a new record is set.
- **Goals:**
  - Correct current streak calculation for DAILY, WEEKLY, and CUSTOM frequency types
  - Persist `longestStreak` to Firestore using a safe conditional write
  - Backfill `longestStreak` from existing completion history on load
- **Scope:** Web client only. No API or schema changes.

## 2. System Context

### Current State (Broken)

```
useStreak(habit) → computes current streak (wrong for WEEKLY/CUSTOM)
                 → returns number
                 → longestStreak NEVER written to Firestore
```

### Target State

```
useStreak(habit) → computes current streak (correct for all frequency types)
                 → returns { currentStreak, longestStreak }
                 → if currentStreak > habit.longestStreak → conditional write to Firestore
```

### Affected Components

```
web/src/
├── hooks/
│   └── useStreak.ts              ← Rewrite: correct calculation + longestStreak write
├── pages/
│   └── HabitDetailPage.tsx       ← Update: use new return shape
├── components/
│   └── habits/
│       └── HabitCard.tsx         ← Update: use new return shape (if applicable)
```

## 3. Functional Requirements

### Streak Calculation by Frequency Type

**DAILY:**
- Walk backwards from today (or yesterday if today not completed)
- Count consecutive calendar days with a completion
- A missed day breaks the streak

**WEEKLY (N days/week):**
- Walk backwards through calendar weeks (Monday–Sunday)
- For each week, count completions within that week
- If completions >= `daysPerWeek` target, the week counts toward the streak
- A week below target breaks the streak
- The current (partial) week: count completions so far — if already met target, include in streak; if not yet met but week isn't over, don't break (grace period)

**CUSTOM (specific days, e.g., Mon/Wed/Fri):**
- Walk backwards through expected days only (skip non-scheduled days)
- Each scheduled day that has a completion extends the streak
- A missed scheduled day breaks the streak
- Future scheduled days are ignored

### Longest Streak Persistence

- After computing the current streak, compare with `habit.longestStreak`
- If current > longest, write the new value to Firestore
- Use a **Firestore transaction** to ensure safe concurrent writes:
  - Read current `longestStreak` from Firestore
  - Only write if the new value is strictly greater
  - Handles multiple clients racing safely

### Backfill

- On habit load, compute the all-time longest streak from the full completions history
- If computed longest > stored `longestStreak`, write the correct value
- This handles existing habits with `longestStreak: 0` and real completions
- Also handles backfilled historical check-ins

## 4. Non-Functional Requirements

- **Performance:** Sort completions once O(n log n), then single-pass computation O(n). Sorted array cached to avoid re-sorting on render.
- **Concurrency:** Firestore transaction ensures only the highest value wins across multiple clients.
- **Correctness:** Backfill ensures historical data is accounted for, not just going-forward.
- **Write efficiency:** History page defers longestStreak write until navigation away, collecting multiple rapid toggles into a single Firestore write.

## 5. Architecture Decisions

### AD-LS1: Firestore transaction for longestStreak writes
- **Decision:** Use a Firestore transaction (read-then-conditional-write) instead of a blind write.
- **Rationale:** Multiple clients (browser tabs, devices) may compute streaks simultaneously. A transaction ensures only the highest value is persisted. `runTransaction` reads the current value and only writes if the new value exceeds it.
- **Alternative:** `updateDoc` with a blind write — simpler but last-write-wins could lower the value if a stale client writes.

### AD-LS2: Compute all-time longest from completions history
- **Decision:** Compute the longest streak by walking through the entire completions history, not just the current streak.
- **Rationale:** The current streak may not be the longest. A user could have had a 30-day streak months ago and a 4-day current streak. Backfill must find the historical maximum. Also handles the case where a user backfills historical check-ins.

### AD-LS3: Streak logic derived from frequency config
- **Decision:** The streak definition is determined by the habit's frequency type and settings. Users don't choose a separate streak mode.
- **Rationale:** Keeps the model simple. The frequency already defines what "consistent" means for that habit.

### AD-LS4: Current week grace period for WEEKLY habits
- **Decision:** If the current week hasn't ended and the user hasn't yet met their target, don't break the streak — they still have time. Week boundary is start of Monday (ISO).
- **Rationale:** Breaking the streak mid-week when the user hasn't had a chance to complete would feel punishing and incorrect. The streak only breaks when the next Monday begins and the previous week is finalized as below target.

### AD-LS5: Deferred longestStreak write on history page
- **Decision:** On the history page, do NOT recompute or write `longestStreak` on every completion toggle. Instead, recompute once when the user leaves the history page (via `beforeunload` or navigation away).
- **Rationale:** Users may rapidly click multiple dates when backfilling. Recomputing and writing on every click wastes Firestore writes and computation. A single deferred write on exit collects all changes into one operation.
- **On the main detail page:** Write immediately after the Complete button toggle, since it's a single action.

### AD-LS6: Optimize computation for scale
- **Decision:** Pre-sort completions once, then use a single pass for streak computation. Cache the sorted array.
- **Rationale:** Sorting is O(n log n), single-pass streak computation is O(n). Caching the sorted array avoids re-sorting on every render. For WEEKLY, group completions into week buckets using a Map keyed by ISO week — O(n) grouping after sort.

## 6. Data Architecture

No data model changes. Existing fields used:
- `habit.completions` — array of `{ date, completedAt }`
- `habit.longestStreak` — integer on habit document
- `habit.frequency` — `{ type, daysPerWeek?, specificDays? }`

### Firestore Write Path

```
users/{userId}/habits/{habitId}.longestStreak
```

Written via Firestore client SDK transaction (bypasses GraphQL API, same as original architecture).

## 7. Security & Access Control

Existing Firestore rule already allows:
```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

No changes needed.

## 8. Infrastructure & Deployment Overview

No infrastructure changes. Web client deploy only.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Should the all-time longest computation run on every render or only on completion toggle? | Decided — on load (backfill), after completion toggle on detail page, and once on leaving history page |
| 2 | Week boundary: Monday–Sunday or Sunday–Saturday? | Decided — Monday–Sunday (ISO standard), streak breaks at start of Monday |
| 3 | Should longestStreak decrease on undo? | Decided — yes, recompute from full history (always accurate, not high-water mark) |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
