# Architecture Requirements Document (ARD) — Timezone Fix

## 1. Overview

- **Project Name:** Timezone Fix & Date Testing
- **Purpose:** Fix the UTC date bug in HabitCard and establish a centralized date helper with CI unit tests to prevent timezone regressions.
- **Goals:**
  - Fix: HabitCard uses UTC date instead of local date
  - Centralize: single `getLocalDate()` helper used everywhere
  - Test: unit tests for date helper, streak calculations, and component date usage
  - CI: tests run as part of web-test job
- **Scope:** Web client only. No API changes.

## 2. System Context

### The Bug

```
HabitCard.tsx:
  const today = new Date().toISOString().split('T')[0];  // ← UTC!

At 11pm Pacific (UTC-7):
  Local date: 2026-03-17
  UTC date:   2026-03-18   ← wrong, logs completion for tomorrow
```

### The Fix

```
All components:
  const today = getLocalDate();  // ← always local timezone

getLocalDate() uses format(new Date(), 'yyyy-MM-dd') from date-fns
```

### Affected Files

```
web/src/
├── utils/
│   ├── date.ts                 ← New: getLocalDate() helper
│   └── date.test.ts            ← New: unit tests
├── hooks/
│   └── streakCalc.test.ts      ← New: streak calculation tests
├── components/habits/
│   └── HabitCard.tsx            ← Fix: use getLocalDate()
├── pages/
│   └── HabitDetailPage.tsx      ← Audit: already correct, switch to helper
├── components/calendar/
│   ├── WeekStrip.tsx            ← Audit: already correct, switch to helper
│   ├── MonthView.tsx            ← Audit: already correct, switch to helper
│   └── WeekView.tsx             ← Audit: check and switch to helper
└── hooks/
    └── useStreak.ts             ← Audit: already correct, switch to helper
```

## 3. Functional Requirements

- `getLocalDate()` returns `YYYY-MM-DD` in the user's local timezone
- All date computations use `getLocalDate()` instead of inline `format()` or `toISOString()`
- Unit tests verify correct behavior across timezone boundaries
- CI runs tests before lint and build

## 4. Non-Functional Requirements

- Tests run in < 10 seconds
- No external dependencies beyond Vitest
- Timezone mocking via `vi.useFakeTimers()` with timezone override

## 5. Architecture Decisions

### AD-TZ1: Centralized date helper
- **Decision:** Single `getLocalDate()` function in `utils/date.ts`
- **Rationale:** Prevents the bug from recurring. All components import the same function. Easy to test.

### AD-TZ2: Unit tests for timezone logic
- **Decision:** Vitest unit tests with mocked timezones, not E2E
- **Rationale:** Fast, deterministic, catches the exact class of bug. E2E timezone testing tracked separately (#31).

### AD-TZ3: Tests in CI
- **Decision:** Add `npm test` to existing `web-test` job
- **Rationale:** Simple, no new CI job. Tests run alongside lint and build.

## 6. Open Questions / Risks

None.

## 7. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Discovery/Iteration | Initial draft |
