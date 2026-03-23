# Technical Spec — Kinetic Sanctuary Redesign

## Overview

Complete UI redesign of the Indego web client based on the "Kinetic Sanctuary" design system. Implemented in 5 phases, each as a separate PR.

## Design System Summary

- **Palette:** Green/biophilia (emerald primary, blue secondary, orange tertiary) replacing indigo
- **Font:** Plus Jakarta Sans replacing Inter
- **No-border rule:** Depth via tonal surface layering, no 1px solid borders
- **Icons:** Material Symbols (variable font)
- **Cards:** 2rem rounded corners, tonal backgrounds
- **Nav:** Bottom floating glassmorphism bar (Today/History/Streaks/Settings)
- **Typography:** Editorial — large hero stats, small uppercase labels with letter-spacing

## Phase A: Design Foundation

### Scope
- tokens.css: new green palette, surface hierarchy, typography tokens
- global.css: Plus Jakarta Sans, Material Symbols
- index.html: font preloads
- NavBar: bottom floating nav with glassmorphism
- PageShell: restructured for bottom nav
- All component CSS: remove borders, apply tonal layering
- Dark mode: update dark theme for green palette
- IDE themes: keep as-is (their own palettes)

### tokens.css Rewrite

```css
:root {
  /* Primary — Emerald Green */
  --color-primary: #006c49;
  --color-primary-container: #10b981;
  --color-primary-fixed: #6ffbbe;
  --color-primary-fixed-dim: #4edea3;

  /* Secondary — Blue */
  --color-secondary: #0058be;
  --color-secondary-container: #2170e4;

  /* Tertiary — Orange (energy/streaks) */
  --color-tertiary: #855300;
  --color-tertiary-container: #e29100;

  /* Surfaces (tonal layering) */
  --color-bg: #f4fbf4;
  --color-surface: #f4fbf4;
  --color-surface-container: #e8f0e9;
  --color-surface-container-low: #eef6ee;
  --color-surface-container-high: #e3eae3;
  --color-surface-container-highest: #dde4dd;
  --color-surface-container-lowest: #ffffff;

  /* On-surface (text) */
  --color-on-surface: #161d19;
  --color-on-surface-variant: #3c4a42;

  /* Outline */
  --color-outline: #6c7a71;
  --color-outline-variant: #bbcabf;

  /* Semantic */
  --color-success: #4edea3;
  --color-error: #ba1a1a;
  --color-error-container: #ffdad6;
  --color-warning: #e29100;

  /* Map old variable names for backwards compat during migration */
  --color-primary-50: #eef6ee;
  --color-primary-100: #d1fae5;
  --color-primary-200: #a7f3d0;
  --color-primary-300: #6ffbbe;
  --color-primary-400: #4edea3;
  --color-primary-500: #10b981;
  --color-primary-600: #006c49;
  --color-primary-700: #005236;
  --color-primary-800: #00422b;
  --color-primary-900: #002113;

  --color-neutral-50: #f4fbf4;
  --color-neutral-100: #eef6ee;
  --color-neutral-200: #e3eae3;
  --color-neutral-300: #dde4dd;
  --color-neutral-400: #bbcabf;
  --color-neutral-500: #6c7a71;
  --color-neutral-600: #3c4a42;
  --color-neutral-700: #2b322d;
  --color-neutral-800: #161d19;
  --color-neutral-900: #0d1210;

  /* Typography */
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;

  /* Spacing (unchanged) */
  /* Border radius */
  --radius-card: 2rem;
  --radius-card-sm: 1.5rem;
  /* Keep existing radius tokens too */

  /* Shadows — ambient, never harsh */
  --shadow-sm: 0 2px 8px rgba(0, 108, 73, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 108, 73, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 108, 73, 0.08);
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --color-bg: #0d1210;
  --color-surface: #161d19;
  --color-surface-container: #1e2a22;
  --color-surface-container-low: #1a2420;
  --color-surface-container-high: #2b322d;
  --color-surface-container-highest: #3c4a42;
  --color-surface-container-lowest: #0d1210;
  --color-on-surface: #e3eae3;
  --color-on-surface-variant: #bbcabf;
  /* Primary stays the same — green works on dark */
  --color-neutral-50: #0d1210;
  --color-neutral-100: #161d19;
  /* ... inverted scale */
}
```

### Bottom Navigation

```
┌─────────────────────────────────────────┐
│                                         │
│  Today    History    Streaks    Settings │
│   📅       🕐        🔥         ⚙️     │
│                                         │
└─────────────────────────────────────────┘
  ↑ frosted glass, backdrop-blur, rounded top corners
  ↑ active item: gradient pill (primary → primary-container)
```

New component: `BottomNav.tsx` replacing `NavBar.tsx`

Routes:
| Route | Icon | Label |
|-------|------|-------|
| `/` | today | Today |
| `/history` | history | History |
| `/streaks` | local_fire_department | Streaks |
| `/settings` | settings | Settings |

### Font Loading

index.html:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

### Files Changed (Phase A)

| Action | File |
|--------|------|
| **Rewrite** | `src/styles/tokens.css` |
| **Modify** | `src/styles/global.css` |
| **Modify** | `web/index.html` (fonts) |
| **Create** | `src/components/layout/BottomNav.tsx` + CSS |
| **Modify** | `src/components/layout/PageShell.tsx` + CSS |
| **Delete** | `src/components/layout/NavBar.tsx` + CSS |
| **Modify** | `src/App.tsx` (route restructure) |
| **Modify** | All component `.module.css` files (remove borders, update colors) |
| **Create** | `src/pages/HistoryPage.tsx` (placeholder) |
| **Create** | `src/pages/StreaksPage.tsx` (placeholder) |

---

## Phase B: Today (Dashboard) Redesign

### Scope
- Circular progress ring (overall daily completion)
- Active streak banner
- Habit checklist with new card styling
- Completion toggles redesigned
- Day filter strip (#35)

### New Components
- `ProgressRing.tsx` — circular SVG progress indicator
- `StreakBanner.tsx` — active streak with personal best
- `DayFilterStrip.tsx` — 7-day week filter (from #35)

---

## Phase C: History Page

### Scope
- Momentum Heatmap component (GitHub-style contribution grid)
- Time range selector (Last 7 days / This Month / All Time)
- Peak Streak + Completion Rate stat cards
- Per-habit breakdown with vertical progress bars
- Export Report button (placeholder for future)

### New Components
- `MomentumHeatmap.tsx` — contribution grid with green intensity
- `StatCard.tsx` — icon + large number + label
- `HabitBreakdownCard.tsx` — habit row with progress bar

---

## Phase D: Streaks Page

### Scope
- Streaks overview: list of all habits with current/longest streaks
- Habit streak detail (tap a habit):
  - Current + Longest streak hero stats
  - "Don't break the chain" motivational banner
  - Weekly Link chain visualization (vertical timeline)
  - Insights: completion rate, total sessions, missed days

### New Components
- `StreakChain.tsx` — vertical chain/link visualization
- `StreakInsights.tsx` — 30-day analysis card
- `MotivationalBanner.tsx` — "Don't break the chain" card

---

## Phase E: Settings + Polish

### Scope
- Settings redesigned: notifications, scheduled reflections, integrations
- Only implement what API supports (toggles for reminders)
- Placeholder sections for future features (Weekly Digest, Calendar Sync, Export)
- Final polish pass on all screens
- Dark mode verification

---

## Future Feature Issues (from designs, not yet in API)

To be created as separate issues:
- Weekly Digest notifications
- Scheduled Reflections (morning/evening review)
- Momentum Insight ("You're 20% more active on Sundays")
- Export Data (CSV/JSON)
- Calendar Sync (Google, iCloud, Outlook)
- Haptic Feedback
- Notification Sound selection
- Delete Account

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-22 | Documentation | Initial draft — all 5 phases |
