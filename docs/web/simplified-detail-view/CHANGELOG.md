# Simplified Detail View — Changelog

## What's New

The habit detail view has been simplified with fewer buttons and a combined edit/history modal.

### Changed
- Edit and History buttons moved to icons in the top-right corner
- Edit and History combined into a single tabbed modal (Settings + History tabs)
- Calendar month name is now tappable to select a month
- Calendar year is now tappable to select a year
- Removed the separate History page — history is now in the modal

### Added
- TabbedModal component with Settings and History tabs
- MonthPicker and YearPicker for quick calendar navigation

### Removed
- Bottom action bar (Edit / History buttons)
- `/habit/:id/history` route and HabitHistoryPage

---

# Changelog

## [Unreleased]
### Changed
- Habit detail view simplified: icons in top bar, tabbed modal
### Added
- TabbedModal, MonthPicker, YearPicker
### Removed
- HabitHistoryPage, bottom action bar, `/habit/:id/history` route
