# Technical Spec — Timezone Fix

## 1. Summary

Fix the UTC date bug in HabitCard, centralize date logic in a `getLocalDate()` helper, and add unit tests for date and streak calculations with CI integration.

## 2. Implementation

### New: `src/utils/date.ts`

```typescript
import { format } from 'date-fns';

/**
 * Get today's date in the user's local timezone as YYYY-MM-DD.
 * This is the single source of truth for "today" across the app.
 */
export function getLocalDate(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}
```

### Fix: HabitCard.tsx

```diff
- const today = new Date().toISOString().split('T')[0];
+ const today = getLocalDate();
```

### Audit: Switch all inline `format(new Date(), 'yyyy-MM-dd')` to `getLocalDate()`

| File | Current | Change |
|------|---------|--------|
| HabitCard.tsx | `new Date().toISOString().split('T')[0]` | `getLocalDate()` |
| HabitDetailPage.tsx | `format(new Date(), 'yyyy-MM-dd')` | `getLocalDate()` |
| WeekStrip.tsx | `format(today, 'yyyy-MM-dd')` | `getLocalDate()` |
| MonthView.tsx | `format(new Date(), 'yyyy-MM-dd')` | `getLocalDate()` |
| WeekView.tsx | `format(new Date(), 'yyyy-MM-dd')` | `getLocalDate()` |
| useStreak.ts | `format(new Date(), 'yyyy-MM-dd')` | `getLocalDate()` |
| StatsPage.tsx | `format(new Date(), 'yyyy-MM-dd')` | `getLocalDate()` |

### New: `src/utils/date.test.ts`

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getLocalDate } from './date';

describe('getLocalDate', () => {
  afterEach(() => vi.useRealTimers());

  it('returns local date at 11pm UTC-7', () => {
    // 11pm March 17 in UTC-7 = 6am March 18 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T06:00:00Z'));
    // We can't change timezone in Vitest, but we can test the function
    // with an explicit Date to verify format behavior
    const d = new Date(2026, 2, 17, 23, 0, 0); // March 17, 11pm local
    expect(getLocalDate(d)).toBe('2026-03-17');
  });

  it('returns local date at 1am', () => {
    const d = new Date(2026, 2, 18, 1, 0, 0); // March 18, 1am local
    expect(getLocalDate(d)).toBe('2026-03-18');
  });

  it('returns correct format', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(getLocalDate(d)).toBe('2026-01-05');
  });
});
```

### New: `src/hooks/streakCalc.test.ts`

Tests for all frequency types:

**DAILY:**
- 0 completions → { current: 0, longest: 0 }
- 4 consecutive days ending today → { current: 4, longest: 4 }
- Gap in middle → longest is the longer segment
- Today not completed, yesterday completed → current counts from yesterday

**WEEKLY:**
- 2 weeks meeting target → { current: 2, longest: 2 }
- Week below target breaks streak
- Current incomplete week: grace period

**CUSTOM:**
- Consecutive scheduled days → correct count
- Non-scheduled days skipped
- Missed scheduled day breaks streak

### CI: Update web-test job

Add `npm test` to the web-test steps in `deploy.yml`:

```yaml
- run: npm ci
- run: npm run lint
- run: npm test
- run: npm run build
```

### Vitest configuration

Add to `web/package.json` scripts:
```json
"test": "vitest run"
```

Check if vitest is already configured.

## 3. Files Changed / Created

| Action | File |
|--------|------|
| **Create** | `src/utils/date.ts` |
| **Create** | `src/utils/date.test.ts` |
| **Create** | `src/hooks/streakCalc.test.ts` |
| **Modify** | `src/components/habits/HabitCard.tsx` |
| **Modify** | `src/pages/HabitDetailPage.tsx` |
| **Modify** | `src/components/calendar/WeekStrip.tsx` |
| **Modify** | `src/components/calendar/MonthView.tsx` |
| **Modify** | `src/components/calendar/WeekView.tsx` |
| **Modify** | `src/hooks/useStreak.ts` |
| **Modify** | `src/pages/StatsPage.tsx` |
| **Modify** | `.github/workflows/deploy.yml` (add npm test) |
| **Modify** | `web/package.json` (if test script missing) |

## 4. Deployment Plan

No special deployment steps. Web client only. Tests run in CI.

## 5. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Documentation | Initial draft |
