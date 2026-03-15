# Technical Spec — Longest Streak Fix

## 1. Summary

Rewrite the `useStreak` hook to correctly calculate current and all-time longest streaks for all frequency types (DAILY, WEEKLY, CUSTOM). Persist `longestStreak` to Firestore via transactions. Defer writes on the history page to batch rapid toggles.

## 2. Goals & Non-Goals

### Goals
- Correct streak calculation for DAILY, WEEKLY, CUSTOM
- Compute all-time longest streak from full completion history
- Persist longestStreak via Firestore transaction (safe for concurrent clients)
- Deferred write on history page exit
- Immediate write on detail page Complete button
- Backfill on load

### Non-Goals
- New frequency types
- Server-side streak calculation
- API or schema changes

## 3. Design / Architecture

### Hook API Change

**Before:**
```typescript
function useStreak(habit: Habit | null | undefined): number
// Returns: currentStreak
```

**After:**
```typescript
function useStreak(habit: Habit | null | undefined): { current: number; longest: number }
// Returns: { current, longest }
```

### New Module: streak calculation (pure functions)

Create `web/src/hooks/streakCalc.ts` — pure, testable functions with no React or Firestore dependencies:

```typescript
interface Completion {
  date: string;
  completedAt: string;
}

interface Frequency {
  type: string;
  daysPerWeek?: number;
  specificDays?: string[];
}

interface StreakResult {
  current: number;
  longest: number;
}

export function computeStreaks(
  completions: Completion[],
  frequency: Frequency,
  today: string           // "YYYY-MM-DD"
): StreakResult
```

### New Module: longestStreak persistence

Create `web/src/hooks/useLongestStreakSync.ts` — handles Firestore transaction writes:

```typescript
export function useLongestStreakSync(
  habitId: string | undefined,
  computedLongest: number,
  storedLongest: number
): void
```

### Component Tree Updates

```
HabitDetailPage
  └── useStreak(habit) → { current, longest }
  └── useLongestStreakSync(habit.id, longest, habit.longestStreak)  ← immediate write
  └── CompleteButton

HabitHistoryPage
  └── on navigation away: computeStreaks() → writeLongestStreak()  ← deferred write

HabitCard (dashboard)
  └── useStreak(habit) → { current, longest }  ← display only, no write
```

## 4. Streak Calculation Algorithms

### DAILY

```
Input: sorted completions, today
Algorithm:
  1. Build Set of completed date strings
  2. Start from today (or yesterday if today not completed)
  3. Walk backwards day by day
  4. Each completed day: streak++
  5. First missed day: break

For longest:
  1. Sort all completion dates chronologically
  2. Walk forward, counting consecutive days
  3. Track max streak seen

Time: O(n log n) sort + O(n) pass
Space: O(n) for Set + sorted array
```

### WEEKLY (N days/week)

```
Input: sorted completions, frequency.daysPerWeek, today
Algorithm:
  1. Group completions by ISO week (Mon–Sun) into Map<weekKey, count>
  2. Start from current week, walk backwards by week
  3. Current week special case:
     - If completions >= target → count toward streak
     - If completions < target AND week not over → don't break (grace)
     - If completions < target AND week is over → break
  4. Past weeks: completions >= target → streak++, else break

For longest:
  1. Group all completions by ISO week
  2. Sort weeks chronologically
  3. Walk forward, count consecutive weeks meeting target
  4. Track max streak seen

Time: O(n log n) sort + O(n) grouping + O(w) walk where w = number of weeks
Space: O(n) + O(w) for week map
```

### CUSTOM (specific days)

```
Input: sorted completions, frequency.specificDays (e.g., ["monday", "wednesday", "friday"]), today
Algorithm:
  1. Build Set of completed date strings
  2. Start from today (or previous scheduled day if today not scheduled or not completed)
  3. Walk backwards through calendar days
  4. Skip non-scheduled days
  5. Each scheduled day that's completed: streak++
  6. First scheduled day that's missed: break

For longest:
  1. Generate all scheduled days from earliest completion to today
  2. Walk forward through scheduled days
  3. Count consecutive completed scheduled days
  4. Track max streak seen

Time: O(n log n) sort + O(d) where d = total scheduled days in range
Space: O(n) for Set
```

### Helper: ISO Week Key

```typescript
import { getISOWeek, getISOWeekYear } from 'date-fns';

function getWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}
```

### Helper: Is Scheduled Day

```typescript
function isScheduledDay(date: Date, specificDays: string[]): boolean {
  const dayName = format(date, 'EEEE').toLowerCase();
  return specificDays.includes(dayName);
}
```

## 5. Firestore Persistence

### Transaction Write

```typescript
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';

async function writeLongestStreak(
  userId: string,
  habitId: string,
  newLongest: number
): Promise<void> {
  const habitRef = doc(db, 'users', userId, 'habits', habitId);

  await runTransaction(db, async (transaction) => {
    const habitDoc = await transaction.get(habitRef);
    if (!habitDoc.exists()) return;

    const currentLongest = habitDoc.data().longestStreak ?? 0;
    if (newLongest !== currentLongest) {
      transaction.update(habitRef, { longestStreak: newLongest });
    }
  });
}
```

### useLongestStreakSync Hook (immediate — detail page)

```typescript
import { useEffect, useRef } from 'react';

export function useLongestStreakSync(
  habitId: string | undefined,
  computedLongest: number,
  storedLongest: number
): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!habitId || !user?.uid) return;
    if (computedLongest !== storedLongest) {
      writeLongestStreak(user.uid, habitId, computedLongest);
    }
  }, [habitId, computedLongest, storedLongest, user?.uid]);
}
```

### Deferred Write (history page)

```typescript
// In HabitHistoryPage, trigger on unmount:
useEffect(() => {
  return () => {
    // Recompute streaks from latest completions and write if needed
    if (!habit || !user?.uid) return;
    const { longest } = computeStreaks(habit.completions, habit.frequency, todayStr);
    if (longest !== habit.longestStreak) {
      writeLongestStreak(user.uid, habit.id, longest);
    }
  };
}, [habit, user?.uid]);
```

## 6. Files Changed / Created

| Action | File | Purpose |
|--------|------|---------|
| **Create** | `src/hooks/streakCalc.ts` | Pure streak calculation functions |
| **Rewrite** | `src/hooks/useStreak.ts` | Hook wrapper, returns `{ current, longest }` |
| **Create** | `src/hooks/useLongestStreakSync.ts` | Firestore transaction write hook |
| **Modify** | `src/pages/HabitDetailPage.tsx` | Use new return shape, add sync hook |
| **Modify** | `src/pages/HabitHistoryPage.tsx` | Add deferred write on unmount |
| **Modify** | `src/components/habits/HabitCard.tsx` | Use new return shape |

## 7. Error Handling

| Scenario | Handling |
|----------|---------|
| Firestore transaction fails | Fail silently — streak displays correctly from computation, write retries on next load |
| Empty completions array | Return `{ current: 0, longest: 0 }` |
| Habit with no frequency | Default to DAILY behavior |
| Future completions in data | Ignored — only past/today dates counted |

## 8. Testing Strategy

### Unit Tests (streakCalc.ts — pure functions)

**DAILY:**
- 0 completions → `{ current: 0, longest: 0 }`
- 4 consecutive days ending today → `{ current: 4, longest: 4 }`
- 4 consecutive days ending yesterday (today not done) → `{ current: 4, longest: 4 }`
- Gap in the middle: 3 days, gap, 5 days → `{ current: 3, longest: 5 }` (or vice versa)
- Today completed but yesterday missed → `{ current: 1, longest: ... }`

**WEEKLY (3x/week):**
- 2 full weeks meeting target → `{ current: 2, longest: 2 }`
- Current week with 2/3 (not yet Sunday) → current streak includes grace
- Current week with 2/3 (past Sunday) → current streak breaks
- Past week with only 2/3 → streak breaks

**CUSTOM (Mon/Wed/Fri):**
- All 3 days completed this week + last week → `{ current: 6, longest: 6 }`
- Missed Wednesday → streak breaks at Wednesday
- Non-scheduled day (Tuesday) missing → doesn't affect streak

### Integration Tests

- `useLongestStreakSync` writes to Firestore when computed > stored
- Deferred write on HabitHistoryPage unmount

## 9. Performance Considerations

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Sort completions | O(n log n) | Done once, result cached |
| DAILY streak computation | O(n) | Single pass through sorted dates |
| WEEKLY streak computation | O(n + w) | O(n) grouping + O(w) week walk |
| CUSTOM streak computation | O(n + d) | O(n) lookup + O(d) scheduled day walk |
| Firestore transaction | 1 read + 0-1 write | Only writes if value changed |
| History page | 1 write on exit | Deferred, batches all toggles |

## 10. Open Questions

None — all resolved.

## 11. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
