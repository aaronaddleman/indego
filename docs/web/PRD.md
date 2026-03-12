# Product Requirements Document (PRD) — Web Client

## 1. Overview

- **Product Name:** Indago Web — Habits Tracker PWA
- **Problem Statement:** Users need to access their habit tracker from any device with a browser, without installing a native app. The web client must provide the same core experience as the iOS app with offline capability and push notifications.
- **Goals:**
  - Full habit-tracking experience in the browser (parity with iOS)
  - Installable as a PWA on desktop and mobile
  - Offline support — view habits and log completions without connectivity
  - Push notifications for habit reminders
  - Real-time sync with iOS and other web sessions
- **Non-Goals:**
  - Social features (sharing, leaderboards) — not in v1
  - Gamification beyond streaks — not in v1
  - Habit suggestions or AI features — not in v1
  - Native desktop app (Electron, Tauri) — PWA covers this
  - Admin dashboard — not in v1

## 2. Background & Context

The Indago GraphQL API is built and deployed. It supports full habit CRUD, completion tracking, and stats. The web client consumes this API to provide the user-facing experience. As the first client to ship, it establishes the UI patterns and interaction model that the iOS app will mirror.

The web client is a PWA so it can be installed on any platform (desktop, Android, iOS) from the browser, providing near-native experience without app store distribution.

## 3. User Stories / Jobs to Be Done

### Users
- **Primary:** Individuals tracking habits, accessing from desktop or mobile browser
- **Same users as iOS app** — data syncs seamlessly between platforms

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-1 | User | Sign in with Google | I can access my habits quickly without creating a new account |
| WS-2 | User | Sign in with email/password | I have an alternative to Google sign-in |
| WS-3 | User | See all my habits on a dashboard | I get an overview of today's progress |
| WS-4 | User | Tap a habit to mark it complete | I can quickly log my progress |
| WS-5 | User | Undo a completion | I can fix mistakes |
| WS-6 | User | Create a new habit with name, frequency, and optional reminder | I can start tracking something new |
| WS-7 | User | Edit a habit's name, frequency, or reminder | I can adjust as my goals change |
| WS-8 | User | Delete a habit | I can remove habits I no longer track |
| WS-9 | User | View a single habit's detail page | I can see its calendar, streak, and history |
| WS-10 | User | See my current streak for each habit | I stay motivated |
| WS-11 | User | See my longest streak for each habit | I know my personal best |
| WS-12 | User | View stats across all habits | I understand my overall consistency |
| WS-13 | User | Receive browser notifications for reminders | I don't forget my habits |
| WS-14 | User | Use the app offline | I can still view and log habits without internet |
| WS-15 | User | Install the app to my home screen | It feels like a native app |
| WS-16 | User | See a sync indicator | I know if my data is up to date |
| WS-17 | User | See changes from my phone appear instantly | My data stays consistent across devices |

## 4. Requirements

### Functional Requirements

#### 4.1 Authentication
- Google Sign-In via Firebase Auth popup/redirect flow
- Email/password sign-in with registration and password reset
- Persistent session (stay signed in across browser sessions)
- Sign out
- Auth guard — unauthenticated users redirected to sign-in page

#### 4.2 Dashboard (Home)
- List all habits for the authenticated user
- Each habit shows: name, frequency, today's completion status, current streak
- One-tap completion toggle (log/undo) directly from the list
- Visual distinction between completed and pending habits
- Empty state for new users with prompt to create first habit
- Pull-to-refresh on mobile viewports

#### 4.3 Habit Detail View
- Habit name, frequency, reminder settings
- Completion calendar with two tabs: month view and scrollable weeks view
- Current streak and longest streak
- Log/undo completion for any date from the calendar (both views)
- Edit and delete actions accessible from this view

#### 4.4 Habit Management
- **Create:** Form with name (required), frequency type (daily/weekly/custom) with options, optional reminder toggle with time picker
- **Edit:** Same form pre-filled with current values
- **Delete:** Confirmation dialog before hard delete
- Form validation with inline error messages

#### 4.5 Stats View
- Overall stats: total habits, total completions, overall completion rate
- Per-habit stats: completion rate, longest streak, total completions
- Date range selector (default: last 7 days)
- Visual indicators (progress bars or simple charts)

#### 4.6 Streaks
- Current streak displayed on habit card and detail view
- Longest streak displayed on detail view and stats
- Calculated client-side from completions map
- Longest streak written to Firestore when new record set
- Streak resets when a scheduled period is missed

#### 4.7 Reminders / Notifications
- Request browser notification permission on-demand (first time user enables a reminder)
- Schedule notifications via Service Worker based on reminder times
- Subscribe to Firestore listener for reminder schedule changes
- Graceful degradation if notifications denied — show in-app reminder indicator
- Notification content: "Time to: [habit name]"

#### 4.8 Offline Support (v1: reads only)
- Service Worker caches app shell (HTML, CSS, JS)
- Apollo cache persisted to IndexedDB for offline reads
- Habits list and detail views viewable offline from cache
- Sync indicator shows offline status
- On reconnect: refresh data from server
- **v2:** Offline writes — mutations queued locally, replayed on reconnect

#### 4.9 PWA / Installability
- Web app manifest with app name, icons (192px, 512px), theme color, background color
- Standalone display mode (no browser chrome when installed)
- "Add to Home Screen" prompt on supported browsers
- Splash screen on launch

#### 4.10 Sync Status
- Indicator showing connection state: "Synced", "Syncing...", "Offline"
- Last-synced timestamp visible in settings or footer
- Real-time updates from Firestore listener reflected immediately

### Non-Functional Requirements

- **Responsiveness:** Mobile-first. Breakpoints: mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- **Accessibility:** WCAG 2.1 AA. Keyboard navigation, focus management, aria labels, 4.5:1 contrast ratio
- **Performance:** Lighthouse PWA score > 90. FCP < 1.5s. TTI < 3s. Bundle < 150KB gzipped.
- **Browser Support:** Chrome, Safari, Firefox, Edge (latest 2 versions)

## 5. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Lighthouse PWA score | > 90 | Lighthouse CI |
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Offline reads | Habits viewable offline from cache | Manual + automated testing |
| Cross-device sync | Changes appear within 3 seconds | Manual testing |
| Accessibility | WCAG 2.1 AA | axe-core automated checks |

## 6. Out of Scope

- Social/community features
- Gamification beyond streaks
- Habit templates or AI suggestions
- Native desktop app
- Admin dashboard
- Data export/import
- Apple Sign-In (web — complex to set up, Google covers this)
- Payment/subscription features

## 7. Dependencies & Risks

| # | Dependency / Risk | Impact | Mitigation |
|---|-------------------|--------|-----------|
| 1 | GraphQL API must be deployed and stable | Web client non-functional without it | API already deployed and tested |
| 2 | Firebase Auth client SDK | Sign-in flows depend on it | Well-supported, stable library |
| 3 | Browser notification API adoption varies | Reminders won't work on all browsers | Graceful fallback to in-app indicator |
| 4 | Safari PWA limitations | Reduced functionality on iOS Safari | iOS native app covers this gap |
| 5 | Offline mutation replay ordering | Potential conflicts | Deferred to v2 — v1 is offline reads only |
| 6 | API schema change: `logCompletion`/`undoCompletion` should return `Habit!` | Client needs full habit for streak recalc | Change API schema before web client ships |

## 8. Timeline / Milestones

| Milestone | Description |
|-----------|------------|
| W1 | ARD + PRD approved (Gate 1) |
| W2 | Technical Spec + Deployment Plan complete (Gate 2) |
| W3 | Project scaffolding, auth flow, routing |
| W4 | Dashboard + habit CRUD |
| W5 | Habit detail view + completion calendar |
| W6 | Stats view |
| W7 | PWA setup + offline support + notifications |
| W8 | Polish, accessibility, testing, deploy |

## 9. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | Color scheme / branding — use a design system or custom? | Decided — indigo color scheme to match the "Indago" name |
| 2 | Should the completion calendar show a full month or scrollable weeks? | Decided — both, as separate tabs (month view + scrollable weeks) |
| 3 | Date range picker for stats — predefined ranges (7d, 30d, 90d) or custom? | Decided — last 7 days default, may expand later |
| 4 | Should the app auto-prompt for notification permission or wait until user sets a reminder? | Decided — on-demand, prompt on first reminder setup |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Discovery/Iteration | Initial draft |
