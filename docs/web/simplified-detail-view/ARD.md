# Architecture Requirements Document (ARD) — Simplified Detail View

## 1. Overview

- **Project Name:** Simplified Habit Detail View
- **Purpose:** Simplify the fullscreen habit detail view by consolidating Edit and History into a tabbed modal, replacing the Complete button with a slide-to-complete gesture on touch devices, and cleaning up the layout.
- **Goals:**
  - Fewer on-screen elements — cleaner, more focused view
  - Edit and History combined in one tabbed modal
  - Tappable month/year navigation in the calendar
  - Remove the separate history page route
- **Scope:** Web client only. No API changes.

## 2. System Context

### Current Layout

```
┌──────────────────────────┐
│ ← Back                   │
│      Habit Name          │
│      Frequency           │
│   Current    Longest     │
│   streak     streak      │
│  [--- Week Strip ---]    │
│  [ ✓ Complete Button ]   │
│   ✏️ Edit    📅 History  │  ← bottom action bar
└──────────────────────────┘

/habit/:id/history          ← separate route
```

### Target Layout

```
┌──────────────────────────┐
│ ← Back          ✏️  📅   │  ← icons in top-right
│      Habit Name          │
│      Frequency           │
│   Current    Longest     │
│   streak     streak      │
│  [--- Week Strip ---]    │
│                          │
│  [ ✓ Complete Button   ] │  ← click/tap
│                          │
└──────────────────────────┘

Tabbed Modal (edit or history icon):
┌──────────────────────────┐
│  Settings  |  History    │  ← tabs
├──────────────────────────┤
│  (tab content)           │
└──────────────────────────┘
```

### Affected Components

```
web/src/
├── pages/
│   ├── HabitDetailPage.tsx           ← Modify: new top bar, remove action bar, tabbed modal
│   ├── HabitDetailPage.module.css    ← Modify: updated layout
│   ├── HabitHistoryPage.tsx          ← Delete
│   └── HabitHistoryPage.module.css   ← Delete
├── components/
│   ├── habits/
│   │   └── HabitForm.tsx             ← Modify: extract form content for tabbed modal
│   ├── calendar/
│   │   ├── MonthView.tsx             ← Modify: tappable month/year navigation
│   │   ├── MonthPicker.tsx           ← New: month selection list
│   │   └── YearPicker.tsx            ← New: year selection list
│   └── common/
│       └── TabbedModal.tsx           ← New: reusable tabbed modal
└── App.tsx                           ← Modify: remove /habit/:id/history route
```

## 3. Functional Requirements

### Top Bar
- Back arrow (left) — navigates to dashboard
- Edit icon (right) — opens tabbed modal on Settings tab
- History icon (right) — opens tabbed modal on History tab
- Icons: minimalistic, SVG-based

### Tabbed Modal
- Two tabs: "Settings" and "History"
- Opens with the tab matching the icon that was tapped
- **Settings tab:** Habit edit form (name, frequency, reminder) + delete button with confirmation
- **History tab:** Calendar with month/week views, completion toggles for backfilling
- Deferred streak write: recompute and write `longestStreak` when modal closes
- Nearly fullscreen on mobile (scrollable), centered card on desktop

### Complete Button
- Existing `CompleteButton` component — click/tap for all devices
- Slide-to-complete deferred to native iOS app

### Calendar Navigation (in History tab)
- **Month name tappable:** Opens a month picker list (Jan–Dec for the current year)
- **Year tappable:** Opens a year picker list (range from earliest completion year to current year)
- Previous/next month arrows still available
- Selecting a month or year navigates the calendar to that period

## 4. Non-Functional Requirements

- **Touch detection:** Client-side, no server involvement
- **Slide gesture:** Smooth 60fps animation, works on iOS Safari and Chrome Android
- **Modal:** Accessible — focus trap, keyboard navigable, ESC to close
- **Calendar pickers:** Fast rendering — simple list, no heavy date library overhead
- **Performance:** No new API calls. Calendar reuses existing components.

## 5. Architecture Decisions

### AD-SDV1: Tabbed modal replaces separate history route
- **Decision:** Remove `/habit/:id/history` route. Combine edit and history in a tabbed modal.
- **Rationale:** Fewer routes, less navigation, edit and history are related management actions. Deferred streak write moves to modal close (simpler than page unmount).

### AD-SDV2: Deferred streak write on modal close
- **Decision:** Recompute and write `longestStreak` when the tabbed modal closes, not on every completion toggle inside it.
- **Rationale:** Same batching benefit as the previous history page unmount approach. Modal close is a cleaner lifecycle event than page unmount.

## 6. Data Architecture

No changes. Same queries, mutations, and Firestore writes.

## 7. Security & Access Control

No changes.

## 8. Infrastructure & Deployment Overview

No changes. Web client deploy only.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Modal height on small screens with calendar? | Use max-height with scroll. Calendar month view fits in ~350px. |
| 3 | Tab state persistence — if user switches tabs, should form state persist? | Yes — React state persists while modal is open. |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
