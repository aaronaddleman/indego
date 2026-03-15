# Longest Streak Fix — Changelog

## What's New

Streak calculations are now correct for all habit frequency types, and the longest streak is persisted to Firestore.

### Fixed
- Longest streak now saves to Firestore (was always 0)
- Current streak calculation correct for WEEKLY and CUSTOM habits (was treating all as daily)

### Added
- Longest streak computed from full completion history (backfill)
- Longest streak updates on undo (always accurate)
- Deferred Firestore write on history page exit (batches rapid toggles)
- WEEKLY streaks count consecutive weeks meeting the target
- CUSTOM streaks count only scheduled days (non-scheduled days skipped)
- Current week grace period for WEEKLY habits

---

# Changelog

## [Unreleased]
### Fixed
- Longest streak persisted to Firestore via transaction (was always 0)
- Current streak calculation for WEEKLY habits (consecutive weeks meeting daysPerWeek target)
- Current streak calculation for CUSTOM habits (only counts scheduled days)

### Added
- All-time longest streak computed from full completion history
- Backfill on load for existing habits with longestStreak: 0
- Deferred longestStreak write on history page navigation away
- WEEKLY grace period: current week doesn't break streak until Monday
