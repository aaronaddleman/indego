# Architecture Requirements Document (ARD) — Theme Settings

## 1. Overview

- **Project Name:** Theme Settings (Light / Dark / System)
- **Purpose:** Add dark mode support and a theme selector in Settings. Themes work by swapping CSS custom property values via a `data-theme` attribute on `<html>`.
- **Goals:**
  - Three theme options: Light, Dark, System (follows OS preference)
  - System is the default
  - Theme preference persisted in localStorage
  - All components automatically adapt via existing CSS variables
  - Architecture supports future custom themes (color palettes) without component changes
- **Scope:** Web client only. No API changes.

## 2. System Context

### How it works

```
1. On app load:
   localStorage["theme"] → "light" | "dark" | "system" | null

2. Resolve effective theme:
   - "light" or "dark" → use directly
   - "system" or null → check window.matchMedia("(prefers-color-scheme: dark)")

3. Set data-theme attribute:
   document.documentElement.setAttribute("data-theme", resolvedTheme)

4. CSS applies:
   :root { /* light tokens (default) */ }
   [data-theme="dark"] { /* dark token overrides */ }
```

### Affected Files

```
web/src/
├── styles/
│   └── tokens.css                    ← Add [data-theme="dark"] block
├── hooks/
│   └── useTheme.ts                   ← New: theme state + localStorage + media query
├── pages/
│   └── SettingsPage.tsx              ← Add theme selector
│   └── SettingsPage.module.css       ← Fix hardcoded "white" → variable
├── main.tsx                          ← Apply theme on initial load (prevent flash)
```

## 3. Functional Requirements

- **Theme options:** Light, Dark, System
- **Default:** System
- **Persistence:** localStorage key `"theme"` with values `"light"`, `"dark"`, `"system"`
- **System theme:** Listens to `prefers-color-scheme` media query, updates in real-time if OS preference changes
- **No flash on load:** Theme applied before React renders (script in `index.html` or early in `main.tsx`)
- **All colors via CSS variables:** Components don't need changes — token overrides handle everything

## 4. Non-Functional Requirements

- **No flash of wrong theme (FOWT):** Theme must be applied before first paint
- **Performance:** Zero runtime cost — CSS variables are resolved by the browser
- **Accessibility:** Sufficient contrast ratios maintained in dark mode (WCAG AA 4.5:1)
- **Future-proof:** Adding a new theme is just a new `[data-theme="x"]` block in tokens.css

## 5. Architecture Decisions

### AD-TS1: CSS custom properties with data-theme attribute
- **Decision:** Use `[data-theme="dark"]` selector to override `:root` variables
- **Rationale:** Zero-JS theming at the CSS level. All existing components automatically adapt. No styled-components or theme providers needed.

### AD-TS2: localStorage for persistence
- **Decision:** Store theme preference in localStorage, not Firestore
- **Rationale:** Theme is a display preference, not user data. Must be available instantly on page load (no network delay). Per-device is appropriate — a user may want dark on phone, light on laptop.

### AD-TS3: System as default
- **Decision:** Default to system/OS preference, not light
- **Rationale:** Respects user's existing preference. Most users who want dark mode already have it set at the OS level.

### AD-TS4: Prevent flash with inline script
- **Decision:** Apply theme via a small inline `<script>` in `index.html` before React loads
- **Rationale:** If theme is set via React useEffect, there's a flash of the light theme before dark kicks in. An inline script in `<head>` runs synchronously before first paint.

### AD-TS5: Surface and background variables
- **Decision:** Add `--color-surface` and `--color-bg` semantic variables for backgrounds that are currently hardcoded as `white` or `var(--color-neutral-50)`
- **Rationale:** Several components use hardcoded `white` or `background: white`. These need to be variables to support dark mode.

## 6. Data Architecture

No data model changes. localStorage only.

## 7. Security & Access Control

No changes.

## 8. Infrastructure & Deployment Overview

No changes. Web client deploy only.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | PWA theme-color in manifest — should it change with dark mode? | Deferred — keep static for v1 |
| 2 | Some components may have hardcoded colors not using variables | Will audit during implementation and fix |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
