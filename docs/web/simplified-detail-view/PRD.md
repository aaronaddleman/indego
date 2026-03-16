# Product Requirements Document (PRD) — Simplified Detail View

## 1. Overview

- **Feature Name:** Simplified Habit Detail View
- **Problem Statement:** The current detail view has too many elements — a bottom action bar, separate history page, and a large Complete button that's easy to accidentally trigger on mobile.
- **Goals:**
  - Cleaner layout with fewer on-screen elements
  - Edit and History combined in one tabbed modal
  - Tappable month/year navigation in calendar
- **Non-Goals:**
  - Swipe between habits
  - Animated transitions
  - Slide-to-complete gesture (deferred to iOS native app)

## 2. Background & Context

The fullscreen detail view (PR #8) replaced the original detail page. This iteration simplifies it further by consolidating Edit and History into a modal, and replacing the Complete button with a more intentional slide gesture on mobile.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| SDV-1 | User | See edit and history in one modal | I don't navigate between pages for management tasks |
| SDV-3 | User | Tap the month name to pick a month | I can quickly jump to any month without clicking arrows repeatedly |
| SDV-4 | User | Tap the year to pick a year | I can jump to a different year for backfilling |
| SDV-5 | User | See a clean detail view with minimal buttons | The screen feels focused on the habit itself |
| SDV-6 | User | Undo a completion via History tab | I can fix mistakes without a separate page |

## 4. Requirements

### Functional Requirements

#### 4.1 Top Bar
- Back arrow (left) — returns to dashboard
- Edit icon (right) — opens tabbed modal on "Settings" tab
- History/calendar icon (right) — opens tabbed modal on "History" tab
- Icons: inline SVG, 44x44px tap targets

#### 4.2 Tabbed Modal
- Two tabs: "Settings" and "History"
- **Settings tab:**
  - Edit form: name, frequency, reminder (existing `HabitForm` fields)
  - Delete button with confirmation dialog
- **History tab:**
  - Calendar month view with completion toggles
  - Calendar week view option (existing `CalendarTabs`)
  - Tappable month name → month picker (list of Jan–Dec)
  - Tappable year → year picker (list from earliest completion year to current)
  - Previous/next month navigation arrows
- Modal close triggers deferred `longestStreak` write
- Nearly fullscreen on mobile, centered max-width card on desktop
- Close via X button, ESC key, or tapping overlay

#### 4.3 Complete Button
- Existing `CompleteButton` component — click/tap for all devices
- Slide-to-complete deferred to native iOS app

#### 4.4 Calendar Month/Year Pickers
- **Month picker:** Tap month name → dropdown/list of 12 months. Tap to select → calendar navigates.
- **Year picker:** Tap year → dropdown/list of years from earliest completion year to current. Tap to select → calendar navigates.
- Both close after selection

### Non-Functional Requirements

- **Accessibility:** Focus trap in modal. Keyboard users can navigate tabs.
- **Tap targets:** All icons and interactive elements minimum 44x44px
- **Modal:** WCAG AA compliance. Focus managed on open/close.

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Elements on detail view | Fewer (no bottom action bar) |
| Navigation to backfill | Faster (no separate page load) |
| Month/year navigation | Jump to any month in 2 taps |

## 6. Out of Scope

- Swipe between habits
- Haptic feedback
- Custom slide track themes
- Animated transitions between pages

## 7. Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Modal with calendar may be crowded on small screens | Scrollable content, max-height constraint |

## 8. Files Changed / Created / Deleted

| Action | File |
|--------|------|
| **Create** | `src/components/common/TabbedModal.tsx` + CSS |
| **Create** | `src/components/calendar/MonthPicker.tsx` + CSS |
| **Create** | `src/components/calendar/YearPicker.tsx` + CSS |
| **Modify** | `src/pages/HabitDetailPage.tsx` + CSS |
| **Modify** | `src/components/calendar/MonthView.tsx` |
| **Modify** | `src/components/habits/HabitForm.tsx` |
| **Modify** | `src/App.tsx` (remove history route) |
| **Delete** | `src/pages/HabitHistoryPage.tsx` + CSS |

## 9. Open Questions

None — all resolved in Discovery.

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
