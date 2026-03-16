# Technical Spec — Simplified Detail View

## 1. Summary

Simplify the habit detail view: consolidate Edit and History into a tabbed modal with icons in the top bar, replace the Complete button with a slide-to-complete gesture on touch devices, add tappable month/year navigation in the calendar, and remove the separate history page route.

## 2. Goals & Non-Goals

### Goals
- Tabbed modal with Settings + History tabs
- Complete button stays as click/tap for all devices
- Tappable month/year pickers in calendar
- Remove `/habit/:id/history` route and `HabitHistoryPage`
- Deferred streak write on modal close

### Non-Goals
- API changes
- New frequency types
- Haptic feedback

## 3. Design / Architecture

### Component Tree (updated)

```
/habit/:id → HabitDetailPage
├── TopBar
│   ├── BackButton (left)
│   ├── EditIcon (right) → opens TabbedModal on "Settings"
│   └── HistoryIcon (right) → opens TabbedModal on "History"
├── HabitHeader (name, frequency)
├── StreakDisplay (current, longest)
├── WeekStrip (7-day view)
├── CompleteButton (click/tap)
├── TabbedModal
│   ├── Tab: Settings
│   │   ├── HabitForm (name, frequency, reminder)
│   │   └── DeleteButton + ConfirmDialog
│   └── Tab: History
│       └── CalendarTabs
│           ├── MonthView (modified: tappable month/year)
│           │   ├── MonthPicker (dropdown list)
│           │   └── YearPicker (dropdown list)
│           └── WeekView
└── useLongestStreakSync (immediate on slide/click)
    + deferred write on modal close
```

## 4. New Components

### TabbedModal

`src/components/common/TabbedModal.tsx`

**Props:**
```typescript
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedModalProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onClose: () => void;
}
```

**Behavior:**
- Fullscreen overlay with centered modal (max-width 480px on desktop)
- Tab bar at top with active indicator
- Content area scrollable (max-height on mobile)
- Close: X button, ESC key, overlay click
- Focus trap while open

### MonthPicker

`src/components/calendar/MonthPicker.tsx`

**Props:**
```typescript
interface MonthPickerProps {
  selectedMonth: number;    // 0-11
  onSelect: (month: number) => void;
}
```

**Behavior:**
- Grid or list of 12 month names
- Current month highlighted
- Tap to select → closes and navigates calendar

### YearPicker

`src/components/calendar/YearPicker.tsx`

**Props:**
```typescript
interface YearPickerProps {
  selectedYear: number;
  minYear: number;         // earliest completion year
  onSelect: (year: number) => void;
}
```

**Behavior:**
- List of years from `minYear` to current year
- Current year highlighted
- Tap to select → closes and navigates calendar

## 5. Modified Components

### HabitDetailPage

Major changes:
1. Remove bottom action bar (Edit/History buttons)
2. Add top-right icons (edit, history)
3. Add `TabbedModal` state (open/closed, active tab)
4. Conditionally render `SlideToComplete` or `CompleteButton` based on `useTouchDevice()`
5. Deferred streak write on modal close
6. Remove `useLongestStreakSync` for the main page (keep only for slide/click completion)

```typescript
const [modalOpen, setModalOpen] = useState(false);
const [activeTab, setActiveTab] = useState('settings');

const openModal = (tab: string) => {
  setActiveTab(tab);
  setModalOpen(true);
};

const closeModal = () => {
  setModalOpen(false);
  // Deferred streak write
  if (habit && user?.uid) {
    const { longest } = computeStreaks(habit.completions, habit.frequency, today);
    if (longest !== lastWrittenRef.current) {
      lastWrittenRef.current = longest;
      void writeLongestStreak(user.uid, habit.id, longest);
    }
  }
};
```

### MonthView

Changes to header:
```typescript
// Before
<span className={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</span>

// After
<span className={styles.monthLabel}>
  <button onClick={() => setShowMonthPicker(true)}>
    {format(currentMonth, 'MMMM')}
  </button>
  <button onClick={() => setShowYearPicker(true)}>
    {format(currentMonth, 'yyyy')}
  </button>
</span>
```

### HabitForm

- Remove delete button from HabitForm (it moves to the Settings tab directly in HabitDetailPage)
- Or keep delete in HabitForm since the Settings tab renders HabitForm — either works
- Decision: keep delete in HabitForm for simplicity

### App.tsx

Remove the history route:
```typescript
// Delete this line:
<Route path="/habit/:id/history" element={<AuthGuard><HabitHistoryPage /></AuthGuard>} />

// Delete this import:
const HabitHistoryPage = lazy(() => import('./pages/HabitHistoryPage'));
```

## 6. Files Changed / Created / Deleted

| Action | File |
|--------|------|
| **Create** | `src/components/common/TabbedModal.tsx` |
| **Create** | `src/components/common/TabbedModal.module.css` |
| **Create** | `src/components/calendar/MonthPicker.tsx` |
| **Create** | `src/components/calendar/MonthPicker.module.css` |
| **Create** | `src/components/calendar/YearPicker.tsx` |
| **Create** | `src/components/calendar/YearPicker.module.css` |
| **Modify** | `src/pages/HabitDetailPage.tsx` |
| **Modify** | `src/pages/HabitDetailPage.module.css` |
| **Modify** | `src/components/calendar/MonthView.tsx` |
| **Modify** | `src/components/calendar/MonthView.module.css` |
| **Modify** | `src/App.tsx` |
| **Delete** | `src/pages/HabitHistoryPage.tsx` |
| **Delete** | `src/pages/HabitHistoryPage.module.css` |

## 7. Error Handling

| Scenario | Handling |
|----------|---------|
| Modal close during loading mutation | Let mutation complete, streak write fires |
| Year picker with no completions | Show current year only |

## 8. Testing Strategy

### Component Tests
- **TabbedModal:** Renders tabs, switches content, closes on ESC/overlay/X
- **MonthPicker:** Renders 12 months, fires onSelect
- **YearPicker:** Renders year range, fires onSelect
### Integration
- Open modal via edit icon → Settings tab active
- Open modal via history icon → History tab active
- Backfill in History tab → close modal → longest streak updates

## 9. Performance Considerations

- Month/year pickers: simple lists, no virtualization needed

## 10. Open Questions

None.

## 11. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Documentation | Initial draft |
