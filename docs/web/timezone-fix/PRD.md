# Product Requirements Document (PRD) — Timezone Fix

## 1. Overview

- **Feature Name:** Timezone Fix & Date Testing
- **Problem Statement:** Completing a habit late at night logs the completion for the next day because HabitCard converts to UTC instead of using the local timezone.
- **Goals:**
  - Completions always use the user's local date
  - Unit tests prevent timezone regressions
  - CI runs tests automatically
- **Non-Goals:**
  - E2E timezone testing (tracked in #31)
  - Server-side timezone changes
  - Storing user timezone preference

## 2. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TZ-1 | User | Complete a habit at 11pm and have it count for today | My completion doesn't end up on tomorrow |
| TZ-2 | User | Travel to a different timezone and still see correct dates | My habit history isn't confused |
| TZ-3 | Developer | Have CI catch timezone bugs | This class of bug doesn't recur |

## 3. Requirements

### Functional Requirements

- `getLocalDate()` helper returns YYYY-MM-DD in local timezone
- All components use `getLocalDate()` for "today" calculations
- HabitCard bug fixed (was using UTC)
- Completions respect the earliest check-in (existing completion not overwritten by timezone change)

### Testing Requirements

- Unit test: `getLocalDate()` at 11pm in UTC-7 returns local date
- Unit test: `getLocalDate()` at 1am in UTC+9 returns local date
- Unit test: streak calculation with completions near midnight
- Unit test: streak calculation for all frequency types (DAILY, WEEKLY, CUSTOM)
- CI: `npm test` runs in web-test job

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| HabitCard uses correct date | Local timezone in all cases |
| All tests pass | 100% |
| CI runs tests | On every PR and push to main |

## 5. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Discovery/Iteration | Initial draft |
