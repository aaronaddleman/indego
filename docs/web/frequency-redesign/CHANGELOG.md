# Frequency Redesign — Changelog

## What's New

Habits now have specific scheduled days of the week.

### Changed
- WEEKLY habits now require selecting specific days (Mon-Sun)
- CUSTOM frequency deprecated — treated identically to WEEKLY
- Streak calculation unified for WEEKLY and CUSTOM habits

### Added
- `dueDays` computed field on Frequency — resolved days for filtering
- Day-of-week picker in habit creation/edit form
- Migration prompt for old WEEKLY habits without specific days
- Centralized frequency validation service (API)
- `isDueOnDay` utility for client-side filtering

---

# Changelog

## [Unreleased]
### Changed
- WEEKLY frequency requires daysOfWeek selection
- CUSTOM deprecated as alias for WEEKLY
- Streak calc merged for WEEKLY/CUSTOM
### Added
- Frequency.dueDays computed field
- frequency_service.py (centralized validation)
- Day picker in HabitForm
- frequency.ts + frequency.test.ts (client utilities)
