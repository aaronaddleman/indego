# Product Requirements Document (PRD) — Theme Settings

## 1. Overview

- **Feature Name:** Theme Settings (Light / Dark / System)
- **Problem Statement:** The app only has a light theme. Users who prefer dark mode (or have dark OS settings) get a bright white screen.
- **Goals:**
  - Dark mode support
  - Theme selector in Settings (Light / Dark / System)
  - System default — respects OS preference automatically
- **Non-Goals:**
  - Custom color palettes (future feature)
  - Per-user theme sync across devices
  - Dark mode for the login page (nice-to-have, not required)

## 2. Background & Context

The app uses CSS custom properties for all colors, making dark mode implementation straightforward — override the variables, everything adapts.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TS-1 | User | Have the app follow my OS dark/light setting | It matches my device without manual config |
| TS-2 | User | Switch to dark mode | I can use the app comfortably in low light |
| TS-3 | User | Switch to light mode | I can override my OS setting for this app |
| TS-4 | User | Have my theme preference remembered | I don't have to set it every time I open the app |
| TS-5 | User | Not see a flash of the wrong theme on load | The experience feels polished |

## 4. Requirements

### Functional Requirements

#### 4.1 Theme Selector in Settings
- New "Appearance" section in Settings page
- Three options: Light, Dark, System
- Displayed as a segmented control or radio group
- Changing theme applies immediately (no save button)
- Current selection visually indicated

#### 4.2 Dark Mode Colors
- Dark background: `#111827` (neutral-900)
- Dark surface (cards, modals): `#1f2937` (neutral-800)
- Text: `#f9fafb` (neutral-50)
- Muted text: `#9ca3af` (neutral-400)
- Borders: `#374151` (neutral-700)
- Primary colors: same indigo palette (works on dark backgrounds)
- Success/error/warning: same semantic colors (adjusted if contrast insufficient)
- Shadows: reduced opacity or removed (less visible on dark backgrounds)

#### 4.3 System Theme
- Default selection
- Follows `prefers-color-scheme` media query
- Updates in real-time if user changes OS preference while app is open

#### 4.4 No Flash
- Theme applied before first paint via inline script in `index.html`
- Reads localStorage, applies `data-theme` attribute synchronously

### Non-Functional Requirements

- WCAG AA contrast ratios in both light and dark modes
- No performance impact — CSS-only theming
- Works on all supported browsers

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Dark mode renders correctly | All pages, modals, components |
| No flash of wrong theme | Theme visible from first paint |
| Theme persists | Survives page reload |
| System theme responds | OS change reflected immediately |

## 6. Out of Scope

- Custom color palettes
- Theme sync via Firestore
- Animated theme transitions

## 7. Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Hardcoded `white` or colors in component CSS | Audit and replace with variables |
| 2 | Contrast issues in dark mode | Test with WCAG contrast checker |

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
