# Architecture Requirements Document (ARD) — Simplified Detail View

## 1. Overview

- **Project Name:** Simplified Habit Detail View
- **Purpose:** Simplify the fullscreen habit detail view by consolidating Edit and History into a tabbed modal, replacing the Complete button with a slide-to-complete gesture on touch devices, and cleaning up the layout.
- **Goals:**
  - Fewer on-screen elements — cleaner, more focused view
  - Slide-to-complete on touch devices prevents accidental completions
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
│  [══► Slide to complete] │  ← touch devices
│  [ ✓ Complete Button   ] │  ← desktop (click)
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
│   │   ├── SlideToComplete.tsx       ← New: slide gesture component
│   │   ├── SlideToComplete.module.css
│   │   └── HabitForm.tsx             ← Modify: remove delete button (moves to Settings tab)
│   ├── calendar/
│   │   ├── MonthView.tsx             ← Modify: tappable month/year navigation
│   │   ├── MonthPicker.tsx           ← New: month selection list
│   │   └── YearPicker.tsx            ← New: year selection list
│   └── common/
│       └── TabbedModal.tsx           ← New: reusable tabbed modal
├── hooks/
│   └── useTouchDevice.ts            ← New: detect touch capability
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

### Slide-to-Complete (touch devices)
- Detected via `'ontouchstart' in window`
- Visual: track with a draggable thumb containing an SVG right-arrow
- Text: "Slide to complete →" or similar
- Behavior: drag thumb from left to right past threshold → triggers `logCompletion`
- One-direction only — cannot slide back to undo
- **Completed state:** Track and thumb change to lighter color, disabled, shows "Completed ✓"
- Undo only available via History tab in the modal

### Click-to-Complete (desktop / non-touch)
- Standard button (existing `CompleteButton` component)
- After click: shows completed state (same lighter disabled look)
- Undo only via History tab

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

### AD-SDV2: Touch detection for slide vs click
- **Decision:** Use `'ontouchstart' in window` to detect touch capability.
- **Rationale:** Detects actual touch support, not just viewport size. A laptop with touch screen gets the slide. A desktop without touch gets the click.

### AD-SDV3: Slide is irreversible
- **Decision:** Once slid to complete, cannot undo from the slide. Must use History tab.
- **Rationale:** The slide gesture is intentional — it requires physical effort. Making it reversible defeats the purpose of preventing accidental completions.

### AD-SDV4: Deferred streak write on modal close
- **Decision:** Recompute and write `longestStreak` when the tabbed modal closes, not on every completion toggle inside it.
- **Rationale:** Same batching benefit as the previous history page unmount approach. Modal close is a cleaner lifecycle event than page unmount.

### AD-SDV5: SVG-based slide arrow
- **Decision:** Use an inline SVG for the slide thumb arrow — minimalistic right-pointing chevron.
- **Rationale:** No image assets needed. Scales perfectly. Matches the indigo design system.

## 6. Data Architecture

No changes. Same queries, mutations, and Firestore writes.

## 7. Security & Access Control

No changes.

## 8. Infrastructure & Deployment Overview

No changes. Web client deploy only.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Slide gesture on older mobile browsers? | Low risk — touch events are widely supported. Fallback to click button if touch detection fails. |
| 2 | Modal height on small screens with calendar? | Use max-height with scroll. Calendar month view fits in ~350px. |
| 3 | Tab state persistence — if user switches tabs, should form state persist? | Yes — React state persists while modal is open. |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
