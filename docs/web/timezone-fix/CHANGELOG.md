# Timezone Fix — Changelog

## What's New

Habit completions now always use your local date, even late at night.

### Fixed
- Completing a habit near midnight no longer logs it for the next day
- All date calculations centralized in `getLocalDate()` helper

### Added
- Unit tests for date helper and streak calculations
- CI runs tests on every PR and push to main

---

# Changelog

## [Unreleased]
### Fixed
- HabitCard used UTC date instead of local timezone (caused next-day completions near midnight)
- All components now use centralized `getLocalDate()` helper
### Added
- `src/utils/date.ts` — single source of truth for local date
- Unit tests for getLocalDate() and streakCalc
- `npm test` added to CI web-test job
