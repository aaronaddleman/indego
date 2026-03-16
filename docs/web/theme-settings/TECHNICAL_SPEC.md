# Technical Spec — Theme Settings

## 1. Summary

Add dark mode and a theme selector (Light / Dark / System) to Settings. Implemented via CSS custom property overrides with a `data-theme` attribute on `<html>`.

## 2. Goals & Non-Goals

### Goals
- Dark token overrides in tokens.css
- useTheme hook for state management
- Theme selector UI in Settings
- No flash via inline script in index.html
- Fix hardcoded colors in component CSS

### Non-Goals
- Custom color palettes
- API changes
- Theme sync across devices

## 3. Implementation

### tokens.css — Dark Mode Overrides

```css
/* Semantic surface variables (used by both themes) */
:root {
  --color-bg: var(--color-neutral-50);
  --color-surface: #ffffff;
  --color-surface-hover: var(--color-neutral-100);
  /* ... existing variables ... */
}

[data-theme="dark"] {
  /* Backgrounds */
  --color-bg: #111827;
  --color-surface: #1f2937;
  --color-surface-hover: #374151;

  /* Neutral (inverted) */
  --color-neutral-50: #111827;
  --color-neutral-100: #1f2937;
  --color-neutral-200: #374151;
  --color-neutral-300: #4b5563;
  --color-neutral-400: #9ca3af;
  --color-neutral-500: #9ca3af;
  --color-neutral-600: #d1d5db;
  --color-neutral-700: #e5e7eb;
  --color-neutral-800: #f3f4f6;
  --color-neutral-900: #f9fafb;

  /* Shadows (subtle on dark) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);

  /* Semantic adjustments */
  --color-success-light: #064e3b;
  --color-error-light: #7f1d1d;
}
```

By inverting the neutral scale, all existing `var(--color-neutral-*)` references automatically produce correct contrast. Light text on dark backgrounds.

### useTheme Hook

`src/hooks/useTheme.ts`

```typescript
type ThemeOption = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  resolvedTheme: 'light' | 'dark';
}

export function useTheme(): UseThemeReturn
```

**Behavior:**
- Reads initial value from `localStorage.getItem('theme')` (default: `'system'`)
- Resolves system preference via `window.matchMedia('(prefers-color-scheme: dark)')`
- Sets `document.documentElement.setAttribute('data-theme', resolved)`
- Listens to `matchMedia` changes for real-time OS preference updates
- On `setTheme`: writes to localStorage + applies immediately

### Inline Script (index.html)

Prevent flash of wrong theme:

```html
<script>
  (function() {
    var theme = localStorage.getItem('theme') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

Placed in `<head>` before any CSS/JS loads.

### Settings Page — Theme Selector

Add an "Appearance" section with a segmented control:

```
┌─────────────────────────────┐
│  Appearance                 │
│  ┌───────┬───────┬────────┐ │
│  │ Light │ Dark  │ System │ │
│  └───────┴───────┴────────┘ │
└─────────────────────────────┘
```

Three buttons, active state highlighted with primary color.

### Fix Hardcoded Colors

Replace all hardcoded `white` and `background: white` with `var(--color-surface)`:

| File | Change |
|------|--------|
| `SettingsPage.module.css` | `background: white` → `background: var(--color-surface)` |
| `HabitDetailPage.module.css` | Check for hardcoded colors |
| `HabitForm.module.css` | `background: white` in `.modal` → `var(--color-surface)` |
| `ConfirmDialog.module.css` | Check for hardcoded colors |
| `global.css` | `background: var(--color-neutral-50)` → `background: var(--color-bg)` |

## 4. Files Changed / Created

| Action | File |
|--------|------|
| **Modify** | `web/src/styles/tokens.css` (dark overrides + surface variables) |
| **Modify** | `web/src/styles/global.css` (use --color-bg) |
| **Modify** | `web/index.html` (inline theme script) |
| **Create** | `web/src/hooks/useTheme.ts` |
| **Modify** | `web/src/pages/SettingsPage.tsx` (theme selector) |
| **Modify** | `web/src/pages/SettingsPage.module.css` (fix white, add theme selector styles) |
| **Modify** | Various component CSS files (fix hardcoded white) |

## 5. Testing

- Light mode: all pages render as current
- Dark mode: all pages render with dark backgrounds, light text, correct contrast
- System mode: follows OS preference, updates in real-time
- Theme persists across page reload
- No flash of wrong theme on load
- Modal backgrounds correct in dark mode
- Calendar, week strip, complete button all adapt

## 6. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Documentation | Initial draft |
