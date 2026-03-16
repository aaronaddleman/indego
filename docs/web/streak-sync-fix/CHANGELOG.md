# Streak Sync Fix — Changelog

## What's New

Longest streak now updates correctly after backfilling completions on the history page.

### Fixed
- Longest streak not updating after backfilling past completions
- Removed dependency on stale Apollo cache for sync comparison

---

# Changelog

## [Unreleased]
### Fixed
- `useLongestStreakSync` uses local ref tracking instead of stale Apollo cache value
- Longest streak updates when navigating back from history page after backfill
