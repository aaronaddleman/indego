# Product Requirements Document (PRD) — Habit Detail Fullscreen

## 1. Overview

- **Feature Name:** Habit Detail Fullscreen View
- **Problem Statement:** The current habit detail page uses the standard page layout with navigation chrome, making it feel like a secondary page rather than a focused action screen. On mobile, the experience should feel immersive — like tapping into a habit puts it front and center with the primary action (completing it) always within reach.
- **Goals:**
  - One-tap completion from the detail view (large, prominent button)
  - Mobile-first fullscreen feel that fills the viewport
  - Key habit info (name, frequency, streaks) visible at a glance in large typography
  - Quick access to edit, history, and close
- **Non-Goals:**
  - Full calendar/month view on this screen (moved to History sub-view)
  - Stats or analytics on this screen
  - Swipe gestures (may add later, tap is the v1 interaction)

## 2. Background & Context

The web client already has a `/habit/:id` detail page with calendar tabs, streak badges, and completion history. This redesign replaces it with a cleaner, action-oriented fullscreen view that prioritizes the daily completion workflow — the most frequent user action.

The existing calendar and history functionality is preserved but moved behind a "History" button, keeping the primary view focused.

## 3. User Stories / Jobs to Be Done

### Users
- **Primary:** Mobile web users checking in on a habit

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| HDF-1 | User | Tap a habit and see a fullscreen view | I feel focused on this one habit |
| HDF-2 | User | See a large "Complete" button | I can log today's completion in one tap |
| HDF-3 | User | See my habit name, frequency, and streaks in big text | I can read them at a glance on my phone |
| HDF-4 | User | See a 7-day strip (3 past, today, 3 ahead) | I can see recent context without leaving the view |
| HDF-5 | User | Tap past days on the week strip to toggle completion | I can quickly fix yesterday or the day before |
| HDF-6 | User | NOT be able to tap future days | I don't accidentally log completions for days that haven't happened |
| HDF-7 | User | Tap "Edit" to modify the habit | I can change the name, frequency, or reminder |
| HDF-8 | User | Delete a habit from within the edit form | I can remove it without a separate button cluttering the main view |
| HDF-9 | User | Tap a "History" button with a calendar icon | I can view and backfill completions on a full calendar |
| HDF-10 | User | Tap a back button to return to the dashboard | I can go back to my habit list |

## 4. Requirements

### Functional Requirements

#### 4.1 Layout & Navigation
- Fullscreen view — no `PageShell`, no global `NavBar`
- Back button (top-left) returns to dashboard (`/`)
- Route: `/habit/:id` (replaces existing detail page)

#### 4.2 Habit Information Display
- **Habit name:** Large, prominent heading (hero-style)
- **Frequency:** Displayed below the name (e.g., "Daily", "3x per week", "Mon, Wed, Fri")
- **Current streak:** Large number with label
- **Longest streak:** Displayed alongside current streak

#### 4.3 Week Strip
- Shows exactly 7 days: 3 days in the past, today, 3 days into the future
- Each day shows: abbreviated day name (Mon, Tue...) and date number
- Today is visually highlighted (e.g., accent border or background)
- Completed days show a filled indicator (e.g., filled circle, checkmark)
- Past days and today: tappable to toggle completion (log/undo)
- Future days: visually muted, not tappable
- Completion toggle triggers `logCompletion` / `undoCompletion` mutation

#### 4.4 Complete Button
- Large, prominent button — primary action of the screen
- Positioned for easy thumb reach on mobile (lower portion of the screen)
- Two states:
  - **Not completed today:** Primary/filled style, label "Complete" or checkmark
  - **Completed today:** Success/outline style, label "Completed" or filled checkmark
- Tapping triggers `logCompletion` or `undoCompletion` for today's date
- Optimistic UI update (instant visual feedback)

#### 4.5 Action Buttons
- **Edit:** Opens the existing `HabitForm` modal pre-filled with current values. The edit form includes a "Delete Habit" option with confirmation dialog.
- **History:** Button with calendar icon. Opens a view where the user can browse the full calendar (month/week views) and toggle completions on past dates for backfilling.

#### 4.6 History View
- Accessed via the "History" button on the fullscreen view
- Reuses existing `CalendarTabs`, `MonthView`, and `WeekView` components
- Shows full completion history with the ability to log/undo on any past date
- Back navigation returns to the fullscreen habit view

### Non-Functional Requirements

- **Mobile-first:** Primary design target is 375px wide (iPhone). Must work from 320px to desktop widths.
- **Tap targets:** All interactive elements minimum 44x44px
- **Thumb zone:** Complete button and key actions placed in the lower 2/3 of the screen
- **Typography:** Habit name should be at least 24px. Streak numbers should be at least 32px.
- **Accessibility:** Full keyboard navigation. Screen reader labels on all buttons. Sufficient color contrast (4.5:1 per WCAG AA).
- **Performance:** No additional API calls beyond `GET_HABIT`. Week strip computed from in-memory completions array.

## 5. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Tap-to-complete | 1 tap from detail view | UX review |
| Key info visible without scroll | Name, frequency, streaks, week strip, complete button all above fold on 375px viewport | Visual audit |
| No accidental future completions | Future days not tappable | Manual + automated testing |
| Accessibility | Keyboard navigable, screen reader labels, WCAG AA contrast | axe-core + manual |

## 6. Out of Scope

- Swipe gestures to navigate between habits
- Animated transitions from dashboard to fullscreen
- Landscape-specific layout
- Stats or analytics on this screen
- Streak milestone celebrations / animations

## 7. Dependencies & Risks

| # | Dependency / Risk | Impact | Mitigation |
|---|-------------------|--------|-----------|
| 1 | Existing `HabitForm` must support delete action inside it | Edit button won't expose delete otherwise | Add delete button to HabitForm — minor change |
| 2 | History view design not fully specified | May need iteration | Reuse existing calendar components, minimal new design needed |

## 8. Timeline / Milestones

| Milestone | Description |
|-----------|------------|
| M1 | ARD + PRD approved (Gate 1) |
| M2 | Technical Spec + Deployment Plan (Gate 2) |
| M3 | Implementation: Fullscreen view + week strip + complete button |
| M4 | Implementation: History view + edit form with delete |
| M5 | Polish, testing, deploy |

## 9. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | History view: separate route or modal/panel? | Open |
| 2 | Should the week strip show completion counts for weekly/custom habits? | Open |
| 3 | Desktop layout: centered card with max-width, or stretch full width? | Open |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
