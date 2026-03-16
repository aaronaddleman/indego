# Product Requirements Document (PRD) — Simplified Detail View

## 1. Overview

- **Feature Name:** Simplified Habit Detail View
- **Problem Statement:** The current detail view has too many elements — a bottom action bar, separate history page, and a large Complete button that's easy to accidentally trigger on mobile.
- **Goals:**
  - Cleaner layout with fewer on-screen elements
  - Slide-to-complete on touch devices (prevents accidental taps)
  - Edit and History combined in one tabbed modal
  - Tappable month/year navigation in calendar
- **Non-Goals:**
  - Swipe between habits
  - Animated transitions
  - Haptic feedback on slide

## 2. Background & Context

The fullscreen detail view (PR #8) replaced the original detail page. This iteration simplifies it further by consolidating Edit and History into a modal, and replacing the Complete button with a more intentional slide gesture on mobile.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| SDV-1 | Mobile user | Slide to complete instead of tapping | I don't accidentally mark habits complete |
| SDV-2 | User | See edit and history in one modal | I don't navigate between pages for management tasks |
| SDV-3 | User | Tap the month name to pick a month | I can quickly jump to any month without clicking arrows repeatedly |
| SDV-4 | User | Tap the year to pick a year | I can jump to a different year for backfilling |
| SDV-5 | User | See a clean detail view with minimal buttons | The screen feels focused on the habit itself |
| SDV-6 | Desktop user | Click a Complete button | I can complete without needing touch gestures |
| SDV-7 | User | Undo a completion via History tab | I can fix mistakes without a separate page |

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

#### 4.3 Slide-to-Complete (touch devices)
- Renders on devices where `'ontouchstart' in window` is true
- Track: rounded rectangle, indigo background
- Thumb: draggable circle with minimalistic SVG right-arrow (chevron)
- Label: "Slide to complete" text in the track
- Drag threshold: ~70% of track width to trigger completion
- Below threshold: thumb snaps back (spring animation)
- Above threshold: triggers `logCompletion` for today
- **Completed state:** Track and thumb lighter/muted color, disabled, text shows "Completed"
- Cannot slide back — undo only via History tab
- Smooth dragging at 60fps via CSS transforms (no layout thrashing)

#### 4.4 Click-to-Complete (non-touch devices)
- Standard button (similar to current `CompleteButton`)
- **Completed state:** Lighter/muted color, disabled, shows "Completed ✓"
- Undo only via History tab

#### 4.5 Calendar Month/Year Pickers
- **Month picker:** Tap month name → dropdown/list of 12 months. Tap to select → calendar navigates.
- **Year picker:** Tap year → dropdown/list of years from earliest completion year to current. Tap to select → calendar navigates.
- Both close after selection

### Non-Functional Requirements

- **Slide gesture:** 60fps on mobile. Uses CSS transforms, not layout properties.
- **Accessibility:** Slide has `aria-label`. Keyboard users can press Enter/Space as fallback. Focus trap in modal.
- **Tap targets:** All icons and interactive elements minimum 44x44px
- **Modal:** WCAG AA compliance. Focus managed on open/close.

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Accidental completions | Reduced (slide requires intent) |
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
| 1 | Slide gesture fails on some browsers | Fallback: click button always rendered for keyboard/screen reader |
| 2 | Modal with calendar may be crowded on small screens | Scrollable content, max-height constraint |
| 3 | Touch detection false positive on touch-capable laptops | Acceptable — slide works fine with trackpad drag too |

## 8. Files Changed / Created / Deleted

| Action | File |
|--------|------|
| **Create** | `src/components/habits/SlideToComplete.tsx` + CSS |
| **Create** | `src/components/common/TabbedModal.tsx` + CSS |
| **Create** | `src/components/calendar/MonthPicker.tsx` + CSS |
| **Create** | `src/components/calendar/YearPicker.tsx` + CSS |
| **Create** | `src/hooks/useTouchDevice.ts` |
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
