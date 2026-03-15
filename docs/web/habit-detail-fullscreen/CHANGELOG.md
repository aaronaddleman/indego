# Habit Detail Fullscreen — User Documentation

## What's New

The habit detail view has been redesigned as a fullscreen, mobile-first experience focused on quick completion tracking.

### Changes
- **Fullscreen view** — tapping a habit opens a clean, focused view without navigation chrome
- **Large "Complete" button** — one-tap to log today's habit completion
- **7-day week strip** — see 3 days past, today, and 3 days ahead at a glance; tap past days to toggle completions
- **Streaks front and center** — current and longest streaks displayed in large numbers
- **History view** — access the full calendar for backfilling past completions via the History button
- **Simplified actions** — Edit button opens the habit form (delete is available inside edit)

## How to Use

1. Tap any habit on your dashboard
2. See your habit name, frequency, and streaks at a glance
3. Tap the **Complete** button to log today's completion (tap again to undo)
4. Use the **week strip** to quickly toggle completions for the past 3 days
5. Tap **History** (calendar icon) to view and backfill older dates
6. Tap **Edit** to change the habit's name, frequency, or reminder — or to delete the habit
7. Tap the **back arrow** to return to your dashboard

## Known Issues / Limitations

- Future days on the week strip are display-only (cannot log future completions)
- No swipe gestures between habits (tap back and select another)
- Desktop layout may have extra whitespace (mobile-first design)

---

# Changelog

## [Unreleased]
### Changed
- Replaced existing habit detail page with fullscreen view
- Moved delete action inside the edit form (removed standalone delete button)
- Moved calendar/history to a dedicated History sub-view

### Added
- WeekStrip component (7-day view centered on today)
- CompleteButton component (large, prominent completion toggle)
- HabitHistoryPage (calendar backfill view at /habit/:id/history)
