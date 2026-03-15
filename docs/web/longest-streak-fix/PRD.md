# Product Requirements Document (PRD) — Longest Streak Fix

## 1. Overview

- **Feature Name:** Longest Streak Calculation & Persistence
- **Problem Statement:** The longest streak always shows 0 because it's never written to Firestore. The current streak calculation is also wrong for WEEKLY and CUSTOM frequency types — it treats all habits as daily.
- **Goals:**
  - Correct streak calculation for all frequency types (DAILY, WEEKLY, CUSTOM)
  - Persist longest streak to Firestore when a new record is set
  - Backfill longest streak from existing completions history
- **Non-Goals:**
  - New frequency types (e.g., "every X weeks") — tracked separately
  - Server-side streak calculation
  - Streak milestones or celebrations

## 2. Background & Context

The architecture specifies that current streak is computed client-side and longest streak is written directly to Firestore by clients (high-water mark pattern). The current implementation computes the current streak but never writes the longest streak. Additionally, the streak calculation for WEEKLY and CUSTOM habits is a placeholder that just counts consecutive calendar days.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| LS-1 | User with a DAILY habit | See my current streak as consecutive days completed | I know how many days in a row I've been consistent |
| LS-2 | User with a WEEKLY habit (3x/week) | See my current streak as consecutive weeks where I hit my target | I know how many weeks in a row I've been consistent |
| LS-3 | User with a CUSTOM habit (Mon/Wed/Fri) | See my current streak as consecutive scheduled days completed | Missed non-scheduled days don't break my streak |
| LS-4 | User | See my longest streak ever for each habit | I know my personal best |
| LS-5 | User | Have my longest streak persist across sessions | It doesn't reset when I reload the app |
| LS-6 | User | Have my longest streak update when I backfill past completions | Historical check-ins are counted |
| LS-7 | User with a WEEKLY habit mid-week | Not have my streak broken before the week ends | I still have time to hit my target |
| LS-8 | User | Have my longest streak decrease if I undo completions | The number is always accurate, not inflated |
| LS-9 | User | Rapidly backfill dates on the history page without lag | The app doesn't make a Firestore write on every click |

## 4. Requirements

### Functional Requirements

#### 4.1 Current Streak Calculation

**DAILY habits:**
- Count consecutive calendar days with a completion, walking backwards from today
- If today isn't completed, start from yesterday
- A day without a completion breaks the streak

**WEEKLY habits (N days/week):**
- Count consecutive full calendar weeks (Mon–Sun) where completions >= target (`daysPerWeek`)
- Current (incomplete) week: if target already met, count it; if not yet met, don't break (grace period until Sunday)
- A past week below target breaks the streak

**CUSTOM habits (specific days, e.g., Mon/Wed/Fri):**
- Walk backwards through only the scheduled days
- Each scheduled day with a completion extends the streak
- A scheduled day without a completion breaks the streak
- Non-scheduled days are skipped entirely
- If today is a scheduled day and not yet completed, start from the previous scheduled day

#### 4.2 Longest Streak Calculation

- Compute the all-time longest streak from the full completions history (not just the current streak)
- Walk through all completions chronologically and track the maximum streak found
- Uses the same frequency-aware logic as current streak calculation

#### 4.3 Longest Streak Persistence

- After computing, compare with `habit.longestStreak` stored in Firestore
- If computed value != stored value, write via Firestore transaction
- Transaction reads current value, only writes if different (safe for concurrent clients, highest value wins)
- **Always accurate:** if a user undoes a completion that was part of their longest streak, recompute and lower the value

#### 4.4 Backfill

- On habit load, compute all-time longest from completions history
- If computed != stored `longestStreak`, write the correct value
- Handles existing habits stuck at 0 and historical backfill scenarios

#### 4.5 Write Triggers

- **Detail page (Complete button):** Recompute and write immediately after toggle
- **History page (calendar backfill):** Defer recompute and write until user navigates away from the history page. This collects rapid multi-date toggles into a single Firestore write.
- **On load:** Backfill check — recompute from full history, write if different

### Non-Functional Requirements

- Streak calculation must complete in < 100ms for habits with up to 5000 completions
- Firestore transaction for safe multi-client writes
- No visual delay — streaks computed synchronously from in-memory data

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| DAILY streak accuracy | Matches manual count of consecutive days |
| WEEKLY streak accuracy | Matches manual count of consecutive weeks meeting target |
| CUSTOM streak accuracy | Matches manual count of consecutive scheduled days |
| Longest streak persisted | Value in Firestore matches all-time best after any completion |
| Backfill works | Existing habits with completions show correct longest streak |

## 6. Out of Scope

- New frequency types
- Server-side streak calculation
- Streak notifications or milestones
- Streak freeze / skip days

## 7. Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Computation expensive for large completion histories | O(n log n) sort + O(n) pass. Sorted array cached to avoid re-sort |
| 2 | Multiple clients writing longestStreak | Firestore transaction ensures safe concurrent writes |
| 3 | Backfill runs on every load | Only writes if value changed — no unnecessary writes |
| 4 | Rapid clicks on history page | Deferred write on navigation away — single Firestore operation |

## 8. Open Questions

None — all resolved in Discovery.

## 9. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
