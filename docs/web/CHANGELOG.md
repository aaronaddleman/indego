# Indago Web Client — Changelog

## What's New

Indago Web is a Progressive Web Application for tracking habits, building streaks, and viewing stats — all from the browser.

### Features
- Sign in with Google or email/password
- Dashboard with all habits and today's completion status
- One-tap completion toggle with optimistic updates
- Habit detail view with month and week calendar views
- Client-side streak calculation (current + longest)
- Stats view with per-habit and aggregate metrics
- Real-time sync across devices via Firestore
- Installable as a PWA (add to home screen)
- Offline reads — view cached habits without internet
- Browser notifications for habit reminders (on-demand permission)
- Indigo-themed design with mobile-first responsive layout

## How to Use

1. Visit the app URL in your browser
2. Sign in with Google or create an account with email/password
3. Create your first habit — set a name, frequency, and optional reminder
4. Tap a habit to mark it complete for today
5. View your streak on the habit card or detail page
6. Check your stats to see completion rates and trends
7. Install the app to your home screen for a native-like experience

## Known Issues / Limitations

- Offline writes not supported in v1 — completions require connectivity
- Browser notifications may not work on older Safari versions (< 16.4)
- Stats date range fixed to last 7 days for v1

---

# Changelog

## [0.1.0] — Unreleased
### Added
- Initial PWA scaffolding (React + Vite + TypeScript)
- Firebase Auth integration (Google Sign-In, email/password)
- Apollo Client with GraphQL API integration
- Dashboard page with habit list and completion toggle
- Habit detail page with month and week calendar views
- Habit CRUD (create, edit, delete with confirmation)
- Client-side streak calculation
- Stats page with date range selector
- Firestore real-time listeners for cross-device sync
- Service Worker with app shell precaching
- Web app manifest for PWA installability
- Indigo design system with CSS Modules
- Offline reads via Apollo cache persistence
- Browser notification support for reminders
- Sync status indicator
- Responsive layout (mobile, tablet, desktop)
