# Architecture Requirements Document (ARD) — Habit Detail Fullscreen

## 1. Overview

- **Project Name:** Habit Detail Fullscreen View
- **Purpose:** Replace the existing `HabitDetailPage` with a focused, mobile-first fullscreen view that prioritizes the "complete" action and surfaces key habit info at a glance.
- **Goals:**
  - One-tap habit completion from the detail view
  - App-like fullscreen feel (no PageShell/NavBar chrome)
  - Surface habit name, frequency, streaks, and a 7-day strip prominently
  - Provide access to edit, history (calendar backfill), and close actions
- **Scope:** Web client only. No API or schema changes required — all data already available via `GET_HABIT` query.

## 2. System Context

### Affected Components

```
web/src/
├── pages/
│   └── HabitDetailPage.tsx        ← Replace (fullscreen layout, no PageShell)
├── components/
│   ├── habits/
│   │   └── CompletionToggle.tsx   ← Reuse (today's completion)
│   │   └── HabitForm.tsx          ← Reuse (edit modal, add delete inside)
│   ├── calendar/
│   │   └── WeekStrip.tsx          ← New (7-day strip: 3 past + today + 3 future)
│   │   └── MonthView.tsx          ← Reuse in history view
│   │   └── CalendarTabs.tsx       ← Reuse in history view
│   └── common/
│       └── ConfirmDialog.tsx      ← Reuse (delete confirmation)
```

### External Systems
- No new external dependencies. Consumes existing `GET_HABIT` query, `LOG_COMPLETION` / `UNDO_COMPLETION` mutations.

### Actors
- **End User:** Taps a habit from the dashboard to see the fullscreen detail view.

## 3. Functional Requirements

- **Fullscreen layout:** View occupies the entire viewport. No `PageShell` wrapper, no global `NavBar`.
- **Back button:** Single back/close button in the top-left to return to the dashboard.
- **Habit info (large typography):** Habit name, frequency description, current streak, longest streak.
- **7-day week strip:** Shows 3 days in the past, today (highlighted), and 3 days ahead. Past days and today are tappable to toggle completion. Future days are display-only (disabled).
- **Complete button:** Large, prominent button for toggling today's completion. Visual state changes on completion (e.g., filled vs outline).
- **Edit button:** Opens the existing `HabitForm` modal in edit mode. The edit form includes the delete action (with confirmation).
- **History button:** Calendar icon button that navigates to a history/calendar view for backfilling past completions (reuses existing `MonthView`/`CalendarTabs`).
- **No standalone delete button** on the fullscreen view — delete is accessed via edit.

## 4. Non-Functional Requirements

- **Mobile-first:** Designed for 320px–428px viewports as the primary target. Scales gracefully to tablet and desktop.
- **Performance:** No additional network requests beyond the existing `GET_HABIT` query. Week strip computed client-side from completions array.
- **Accessibility:** Large tap targets (minimum 44x44px). Complete button easily reachable with one hand (bottom of screen). Keyboard navigable. ARIA labels on all buttons.
- **Consistency:** Uses existing design tokens (indigo palette, spacing, typography from `tokens.css`).

## 5. Architecture Decisions

### AD-HDF1: Fullscreen route replaces existing HabitDetailPage
- **Decision:** The `/habit/:id` route renders the new fullscreen view, completely replacing the current `HabitDetailPage`.
- **Rationale:** User confirmed this is a replacement, not an addition. Simpler routing, no feature flag needed.

### AD-HDF2: History as a separate sub-view
- **Decision:** The "History" button navigates to a dedicated history view (could be `/habit/:id/history` or an in-page modal/panel) that reuses `MonthView` and `CalendarTabs` for backfilling.
- **Rationale:** Keeps the main fullscreen view clean and focused on today's action. Calendar backfill is a secondary workflow.
- **Open:** Route vs modal — to be decided during implementation.

### AD-HDF3: Week strip is a new component
- **Decision:** Build a new `WeekStrip` component (not reuse `WeekView`) since it has fixed 7-day window behavior centered on today, with future-day disabling.
- **Rationale:** The existing `WeekView` supports arbitrary week navigation and has different interaction patterns. A purpose-built component is simpler.

### AD-HDF4: Delete action lives inside edit form
- **Decision:** The delete button is only accessible from the edit form/modal, not directly on the fullscreen view.
- **Rationale:** Reduces accidental destructive actions on mobile. Edit is the natural place for habit management actions.

## 6. Data Architecture

No data model changes. The view consumes:
- `Habit` type from GraphQL (name, frequency, longestStreak, completions, reminder)
- `useStreak` hook for current streak calculation
- `LOG_COMPLETION` / `UNDO_COMPLETION` mutations for toggling completions

### Week Strip Data Flow
1. Compute 7-day range: `[today - 3 days, ..., today, ..., today + 3 days]`
2. For each date, check if `completions` array contains that date
3. Past dates and today: tappable → triggers `logCompletion` or `undoCompletion`
4. Future dates: display-only, visually muted/disabled

## 7. Security & Access Control

No changes — same auth model (Firebase Auth ID token on GraphQL requests).

## 8. Infrastructure & Deployment Overview

No infrastructure changes. This is a client-side UI change deployed via existing Firebase Hosting pipeline.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | History view: separate route (`/habit/:id/history`) or fullscreen modal/panel? | Open — to be decided |
| 2 | Animation/transition when opening fullscreen from dashboard? | Open — nice-to-have, not required for v1 |
| 3 | Landscape orientation on mobile — should layout adjust? | Deferred — portrait is primary |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
