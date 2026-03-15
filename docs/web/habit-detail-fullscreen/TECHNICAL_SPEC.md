# Technical Spec — Habit Detail Fullscreen

## 1. Summary

Replace the existing `HabitDetailPage` with a mobile-first fullscreen view. The new view removes `PageShell`/`NavBar` chrome and presents the habit with large typography, a 7-day week strip, a prominent "Complete" button, and quick-access action buttons (Edit, History, Back). No API changes required.

## 2. Goals & Non-Goals

### Goals
- Define the component structure for the fullscreen detail view
- Specify the new `WeekStrip` component behavior
- Specify changes to `HabitForm` (add delete action inside it)
- Define the History sub-view for calendar backfilling
- Maintain existing design tokens and CSS Modules pattern

### Non-Goals
- API or schema changes
- New GraphQL queries or mutations
- Offline behavior changes
- Desktop-specific layouts (mobile-first, responsive by default)

## 3. Design / Architecture

### Component Tree

```
/habit/:id → HabitDetailPage (fullscreen, no PageShell)
├── BackButton                    ← top-left, navigates to /
├── HabitHeader                   ← name (large), frequency description
├── StreakDisplay                  ← current + longest streak (large numbers)
├── WeekStrip                     ← NEW: 7-day strip (3 past, today, 3 future)
│   └── WeekStripDay (×7)         ← day label + date + completion indicator
├── CompleteButton                ← NEW: large primary action button
├── ActionBar                     ← Edit + History buttons
│   ├── EditButton                ← opens HabitForm modal
│   └── HistoryButton             ← navigates to /habit/:id/history
└── HabitForm (modal)             ← existing, modified to include delete
    └── DeleteButton + ConfirmDialog
```

### History Sub-View

```
/habit/:id/history → HabitHistoryPage (fullscreen, no PageShell)
├── BackButton                    ← navigates back to /habit/:id
├── Header                        ← "History" title + habit name
├── CalendarTabs                  ← existing component (Month/Week tabs)
│   ├── MonthView                 ← existing, toggle completions on past dates
│   └── WeekView                  ← existing, toggle completions on past dates
└── CompletionHistory             ← optional: sorted list of completions
```

### Route Changes

| Route | Page | Description |
|-------|------|-------------|
| `/habit/:id` | HabitDetailPage | **Modified** — fullscreen layout, no PageShell |
| `/habit/:id/history` | HabitHistoryPage | **New** — calendar backfill view |

Update in `App.tsx`:
```typescript
const HabitDetailPage = lazy(() => import('./pages/HabitDetailPage'));
const HabitHistoryPage = lazy(() => import('./pages/HabitHistoryPage'));

// Routes
<Route path="/habit/:id" element={<AuthGuard><HabitDetailPage /></AuthGuard>} />
<Route path="/habit/:id/history" element={<AuthGuard><HabitHistoryPage /></AuthGuard>} />
```

## 4. Component Specifications

### WeekStrip

New component: `components/calendar/WeekStrip.tsx`

**Props:**
```typescript
interface WeekStripProps {
  completions: Completion[];      // from habit.completions
  onToggle: (date: string) => void;  // log/undo completion callback
}
```

**Behavior:**
- Computes 7 dates: `[today-3, today-2, today-1, today, today+1, today+2, today+3]`
- Each day renders: abbreviated day name (Mon, Tue...), date number, completion dot/check
- Today gets a visual highlight (accent border or background)
- Days ≤ today: tappable — calls `onToggle(dateString)` on tap
- Days > today: visually muted, `pointer-events: none`, `aria-disabled="true"`
- Completion state derived from `completions` array by matching date strings

**Date computation:**
```typescript
import { addDays, format, startOfDay } from 'date-fns';

function getWeekStripDates(today: Date): Date[] {
  return [-3, -2, -1, 0, 1, 2, 3].map(offset => addDays(startOfDay(today), offset));
}
```

### CompleteButton

New component: `components/habits/CompleteButton.tsx`

**Props:**
```typescript
interface CompleteButtonProps {
  completed: boolean;
  onToggle: () => void;
  loading?: boolean;
}
```

**Behavior:**
- Large button, full-width or near-full-width on mobile
- Two visual states:
  - Not completed: filled primary (indigo) background, "Complete" label with checkmark icon
  - Completed: success (green) outline/filled, "Completed" label with filled checkmark
- Triggers `logCompletion` or `undoCompletion` mutation for today
- Shows loading state during mutation (disabled, spinner or subtle animation)
- Minimum height: 56px for comfortable tap target

### HabitDetailPage (modified)

**Key changes from current implementation:**
1. Remove `PageShell` wrapper — render directly without NavBar
2. Remove `CalendarTabs` from this page (moved to History)
3. Remove inline completion history list
4. Add `WeekStrip`, `CompleteButton`, and action buttons
5. Add `BackButton` for navigation

**Layout (mobile, top to bottom):**
```
┌──────────────────────────┐
│ ← Back                   │  ← BackButton (top-left)
│                          │
│      Morning Run         │  ← Habit name (24-32px)
│        Daily             │  ← Frequency (16px, muted)
│                          │
│   🔥 12        ⭐ 28     │  ← Current / Longest streak (32px numbers)
│   current     longest    │
│                          │
│  M   T   W   T   F   S  │  ← WeekStrip (day labels)
│  12  13  14 [15] 16  17  │  ← WeekStrip (dates, today highlighted)
│  ●   ●   ○  ○   ·   ·   │  ← Completion indicators (· = future/disabled)
│                          │
│ ┌──────────────────────┐ │
│ │     ✓ Complete       │ │  ← CompleteButton (large, bottom area)
│ └──────────────────────┘ │
│                          │
│   ✏️ Edit    📅 History  │  ← Action buttons
│                          │
└──────────────────────────┘
```

### HabitForm (modified)

**Change:** Add a "Delete Habit" button at the bottom of the edit form.

```typescript
// Inside HabitForm, when in edit mode:
{isEditing && (
  <button
    className={styles.deleteButton}
    onClick={() => setShowDeleteConfirm(true)}
  >
    Delete Habit
  </button>
)}
```

- Delete button styled as destructive (red text or outline)
- Triggers existing `ConfirmDialog` for confirmation
- On confirm: calls `deleteHabit` mutation, navigates to `/`

### HabitHistoryPage (new)

New page: `pages/HabitHistoryPage.tsx`

- Fetches habit via `GET_HABIT` query (same as detail page)
- Renders `CalendarTabs` with `MonthView` and `WeekView` (existing components)
- Back button navigates to `/habit/:id`
- No `PageShell` — same fullscreen pattern as the detail page

## 5. Data Flow

No new queries or mutations. Uses existing:

- `GET_HABIT` query — fetches habit by ID (name, frequency, completions, longestStreak)
- `LOG_COMPLETION` mutation — log completion for a date
- `UNDO_COMPLETION` mutation — undo completion for a date
- `UPDATE_HABIT` mutation — edit habit
- `DELETE_HABIT` mutation — delete habit

**Completion toggle flow (WeekStrip or CompleteButton):**
1. Check if date exists in `habit.completions`
2. If not completed → call `logCompletion({ habitId, date })`
3. If completed → call `undoCompletion({ habitId, date })`
4. Optimistic update via Apollo (instant UI feedback)
5. Recalculate streak via `useStreak` hook
6. If new streak > longestStreak → write to Firestore

## 6. CSS / Styling

### New CSS Modules

| File | Purpose |
|------|---------|
| `pages/HabitDetailPage.module.css` | **Rewrite** — fullscreen layout, large typography |
| `components/calendar/WeekStrip.module.css` | 7-day strip grid, day states |
| `components/habits/CompleteButton.module.css` | Large button states |
| `pages/HabitHistoryPage.module.css` | History page layout |

### Typography Scale (feature-specific)

```css
.habitName {
  font-size: var(--font-size-2xl);    /* 1.5rem, 24px */
  font-weight: 700;
  color: var(--color-neutral-900);
}

.frequency {
  font-size: var(--font-size-base);   /* 1rem, 16px */
  color: var(--color-neutral-500);
}

.streakNumber {
  font-size: 2rem;                    /* 32px */
  font-weight: 700;
  color: var(--color-primary-600);
}

.streakLabel {
  font-size: var(--font-size-sm);     /* 0.875rem, 14px */
  color: var(--color-neutral-400);
}
```

### WeekStrip States

```css
.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
}

.day[data-today="true"] {
  background: var(--color-primary-50);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-primary-400);
}

.day[data-future="true"] {
  opacity: 0.4;
  pointer-events: none;
}

.day[data-completed="true"] .indicator {
  background: var(--color-success);
  border-radius: var(--radius-full);
}
```

### CompleteButton States

```css
.button {
  width: 100%;
  min-height: 56px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-primary-500);
  background: var(--color-primary-500);
  color: white;
  cursor: pointer;
}

.button[data-completed="true"] {
  background: var(--color-success);
  border-color: var(--color-success);
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

## 7. Error Handling & Edge Cases

| Scenario | Handling |
|----------|---------|
| Habit not found (invalid ID) | Show error state, back button to dashboard |
| Network error on completion toggle | Optimistic update rolls back, show toast/error |
| Completion toggle while loading | Disable button during mutation |
| User navigates to future date directly | WeekStrip always centers on today — no navigation |
| Habit deleted while viewing | Firestore listener triggers refetch → redirect to dashboard |

## 8. Testing Strategy

### Component Tests (Vitest + RTL)

- **WeekStrip:** Renders 7 days, highlights today, disables future days, shows completion state, fires onToggle for past/today
- **CompleteButton:** Renders both states, fires onToggle, disabled when loading
- **HabitDetailPage:** Renders habit info, streak, week strip, action buttons, no NavBar
- **HabitHistoryPage:** Renders calendar tabs, back button
- **HabitForm (delete):** Shows delete button in edit mode, triggers confirmation

### Integration Tests

- Complete button → triggers `logCompletion` mutation → optimistic update → streak recalc
- WeekStrip tap on past date → triggers completion toggle
- Edit → delete → confirmation → `deleteHabit` mutation → redirect to `/`

### E2E Tests (Playwright)

- Tap habit card → fullscreen view → complete → verify streak update
- Tap History → calendar view → toggle past date → back to fullscreen
- Edit → delete habit → confirm → redirected to dashboard

## 9. Performance Considerations

- No additional API calls — `GET_HABIT` already fetches everything needed
- `WeekStrip` date computation is O(1) — fixed 7-day window
- Completion lookup per day is O(n) on completions array — acceptable for typical habit sizes (< 1000 completions)
- Lazy-load `HabitHistoryPage` route (code splitting)

## 10. Files Changed / Created

| Action | File |
|--------|------|
| **Rewrite** | `src/pages/HabitDetailPage.tsx` |
| **Rewrite** | `src/pages/HabitDetailPage.module.css` |
| **Create** | `src/pages/HabitHistoryPage.tsx` |
| **Create** | `src/pages/HabitHistoryPage.module.css` |
| **Create** | `src/components/calendar/WeekStrip.tsx` |
| **Create** | `src/components/calendar/WeekStrip.module.css` |
| **Create** | `src/components/habits/CompleteButton.tsx` |
| **Create** | `src/components/habits/CompleteButton.module.css` |
| **Modify** | `src/components/habits/HabitForm.tsx` (add delete button in edit mode) |
| **Modify** | `src/App.tsx` (add `/habit/:id/history` route) |

## 11. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | Should WeekStrip show completion counts for weekly/custom habits (e.g., "2/3 this week")? | Open |
| 2 | Desktop: centered card with max-width (~480px) or full width? | Open — recommend centered card |
| 3 | Transition animation from dashboard to fullscreen? | Deferred — not in v1 |

## 12. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
