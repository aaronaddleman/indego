# Product Requirements Document (PRD) — Indago Web Client

## 1. Overview

- **Product Name:** Indago Web — Habits Tracker PWA
- **Problem Statement:** Users need to track habits from any device with a browser, with offline support and real-time sync. The web client must provide the same core experience as the planned iOS app without requiring app store installation.
- **Goals:**
  - Full habit-tracking experience in the browser (feature parity with planned iOS client)
  - Installable as a PWA on desktop and mobile
  - Offline support — view habits and log completions without connectivity
  - Push notifications for habit reminders
  - Real-time sync with iOS and other web sessions

## 2. Background & Context

The Indago GraphQL API is built and deployed. It supports full habit CRUD, completion tracking, and stats. The web client consumes this API to provide the user-facing experience.

As the **first client to ship**, the web client establishes the UI patterns, interaction model, and client-side business logic (streak calculation, date handling, theme system) that the iOS app will mirror.

The web client is a **Progressive Web App (PWA)** so it can be installed on any platform (desktop, Android, iOS) from the browser, providing a near-native experience without app store distribution.

## 3. User Stories

### Users

- **Primary:** Individuals tracking habits, accessing from desktop or mobile browser
- **Admin:** App owner managing access control and allowlist
- **Same users as iOS app** — data syncs seamlessly between platforms

### Authentication

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-1 | User | Sign in with Google | I can access my habits quickly without creating a new account |
| WS-2 | User | Sign in with email/password | I have an alternative to Google sign-in |

### Dashboard

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-3 | User | See all my habits on a dashboard | I get an overview of today's progress |
| WS-4 | User | Tap a habit to mark it complete | I can quickly log my progress |
| WS-5 | User | Undo a completion | I can fix mistakes |

### Habit Management

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-6 | User | Create a new habit with name, frequency, and optional reminder | I can start tracking something new |
| WS-7 | User | Edit a habit's name, frequency, or reminder | I can adjust as my goals change |
| WS-8 | User | Delete a habit | I can remove habits I no longer track |

### Habit Detail

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-9 | User | Tap a habit and see a fullscreen detail view | I feel focused on this one habit |
| WS-10 | User | See my current and longest streak in large text | I stay motivated at a glance |
| WS-11 | User | See a 7-day week strip and tap a large Complete button | I can log today's completion in one tap from the detail view |

### Stats

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-12 | User | View stats across all habits | I understand my overall consistency |

### Notifications

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-13 | User | Receive browser notifications for reminders | I don't forget my habits |

### Offline & PWA

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| WS-14 | User | Use the app offline | I can still view and log habits without internet |
| WS-15 | User | Install the app to my home screen | It feels like a native app |
| WS-16 | User | See a sync indicator | I know if my data is up to date |
| WS-17 | User | See changes from my phone appear instantly | My data stays consistent across devices |

### Streaks

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| LS-1 | User (DAILY habit) | See my current streak as consecutive days completed | I know how many days in a row I've been consistent |
| LS-2 | User (WEEKLY habit) | See my streak as consecutive weeks where I hit my target | I know how many weeks in a row I've been consistent |
| LS-3 | User (CUSTOM habit) | See my streak as consecutive scheduled days completed | Missed non-scheduled days don't break my streak |
| LS-4 | User | See my longest streak ever for each habit | I know my personal best |
| LS-5 | User | Have my longest streak persist across sessions | It doesn't reset when I reload the app |
| LS-6 | User | Have my longest streak update when I backfill past completions | Historical check-ins are counted |
| LS-7 | User (WEEKLY habit mid-week) | Not have my streak broken before the week ends | I still have time to hit my target |
| LS-8 | User | Have my longest streak decrease if I undo completions | The number is always accurate, not inflated |
| LS-9 | User | Rapidly backfill dates on the history page without lag | The app doesn't make a Firestore write on every click |

### Access Control

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AL-1 | App owner | Restrict access to approved emails only | Only invited people can use my app |
| AL-2 | Approved user | Sign in and use the app normally | My experience is unchanged |
| AL-3 | Non-approved user | See a clear message that access is restricted | I understand I can't use the app without being confused |
| AL-4 | App owner | Add/remove emails via Firebase Console or admin UI | I can manage access without code changes |

### Admin

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AU-1 | Admin | See all allowed emails in one list | I know who has access |
| AU-2 | Admin | Add a new email to the allowlist | I can grant someone access |
| AU-3 | Admin | Remove an email from the allowlist | I can revoke access |
| AU-4 | Admin | See which emails are admins | I know who else can manage access |
| AU-5 | Admin | Be prevented from removing myself | I don't accidentally lock myself out |
| AU-6 | Admin | Be prevented from removing the last admin | The system always has at least one admin |
| AU-7 | Non-admin | Not see or access the admin page | The feature is hidden from regular users |
| AU-8 | Admin | Access admin from Settings | I can find it easily |

### Themes

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TS-1 | User | Have the app follow my OS dark/light setting | It matches my device without manual config |
| TS-2 | User | Switch to dark mode | I can use the app comfortably in low light |
| TS-3 | User | Switch to light mode | I can override my OS setting for this app |
| TS-4 | User | Have my theme preference remembered | I don't have to set it every time I open the app |
| TS-5 | User | Not see a flash of the wrong theme on load | The experience feels polished |

### Timezone

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TZ-1 | User | Complete a habit at 11pm and have it count for today | My completion doesn't end up on tomorrow |
| TZ-2 | User | Travel to a different timezone and still see correct dates | My habit history isn't confused |
| TZ-3 | Developer | Have CI catch timezone bugs | This class of bug doesn't recur |

### Detail View

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| SDV-1 | User | See edit and history in one tabbed modal | I don't navigate between pages for management tasks |
| SDV-2 | User | Complete a habit from the detail view with a single tap | I can log progress without extra navigation |
| SDV-3 | User | Tap the month name to pick a month | I can quickly jump to any month without clicking arrows |
| SDV-4 | User | Tap the year to pick a year | I can jump to a different year for backfilling |
| SDV-5 | User | See a clean detail view with minimal buttons | The screen feels focused on the habit itself |
| SDV-6 | User | Undo a completion via History tab | I can fix mistakes without a separate page |

## 4. Requirements

### Functional Requirements

#### 4.1 Authentication

- Google Sign-In via Firebase Auth popup/redirect flow
- Email/password sign-in with registration and password reset
- Persistent session (stay signed in across browser sessions)
- Sign out
- Auth guard — unauthenticated users redirected to sign-in page
- **Allowlist-aware sign-up flow:**
  - Email/password: create Firebase Auth account, check allowlist, if not allowed delete account and show restricted page
  - Google: sign in, check allowlist, if not allowed sign out and show restricted page
  - Only call `upsertUser` after allowlist check passes

#### 4.2 Dashboard (Home)

- List all habits for the authenticated user
- Each habit shows: name, frequency, today's completion status, current streak
- One-tap completion toggle (log/undo) directly from the list
- Visual distinction between completed and pending habits
- Empty state for new users with prompt to create first habit
- Pull-to-refresh on mobile viewports

#### 4.3 Habit Detail (Fullscreen)

- **Layout:** Fullscreen view — no global navigation chrome. Route: `/habit/:id`
- **Back button** (top-left) returns to dashboard
- **Habit info:** Large hero-style name, frequency label (e.g., "Daily", "3x per week", "Mon, Wed, Fri"), current streak and longest streak in large numbers
- **Week strip:** 7 days (3 past, today, 3 future). Each day shows abbreviated name and date number. Today visually highlighted. Past days and today tappable to toggle completion. Future days muted and not tappable.
- **Complete button:** Large, prominent, positioned for thumb reach on mobile. Two states: "Complete" (primary/filled) and "Completed" (success/outline). Triggers `logCompletion` / `undoCompletion` for today. Optimistic UI update.
- **Action icons** (top-right): Edit icon opens tabbed modal on Settings tab; History/calendar icon opens tabbed modal on History tab.

#### 4.4 Habit Management (Create / Edit / Delete)

- **Create:** Form with name (required), frequency type (daily/weekly/custom) with options, optional reminder toggle with time picker
- **Edit:** Same form pre-filled with current values, accessed from the detail view tabbed modal (Settings tab)
- **Delete:** Confirmation dialog, accessible from within the edit form (not a separate button on the detail view)
- Form validation with inline error messages

#### 4.5 Calendar

- **Tabbed modal** with "Settings" and "History" tabs. Nearly fullscreen on mobile, centered max-width card on desktop. Closeable via X button, ESC key, or overlay tap.
- **History tab:** Calendar month view and week view (existing `CalendarTabs`). Tappable dates to toggle completions for backfilling.
- **Month picker:** Tap the month name to open a list of Jan-Dec. Tap to select and navigate.
- **Year picker:** Tap the year to open a list from earliest completion year to current. Tap to select and navigate.
- Previous/next month navigation arrows
- Modal close triggers deferred `longestStreak` write

#### 4.6 Stats

- Overall stats: total habits, total completions, overall completion rate
- Per-habit stats: completion rate, longest streak, total completions
- Date range selector (default: last 7 days)
- Visual indicators (progress bars or simple charts)

#### 4.7 Streaks

**Current streak calculation:**

- **DAILY:** Count consecutive calendar days with a completion, walking backwards from today. If today isn't completed, start from yesterday. A day without a completion breaks the streak.
- **WEEKLY (N days/week):** Count consecutive full calendar weeks (Mon-Sun) where completions >= target (`daysPerWeek`). Current incomplete week: if target already met, count it; if not yet met, grace period until Sunday. A past week below target breaks the streak.
- **CUSTOM (specific days):** Walk backwards through only the scheduled days. Each scheduled day with a completion extends the streak. A scheduled day without a completion breaks it. Non-scheduled days skipped entirely. If today is a scheduled day and not yet completed, start from the previous scheduled day.

**Longest streak:**

- Compute all-time longest from full completions history using the same frequency-aware logic
- Walk through all completions chronologically, track maximum streak found
- Compare with stored `habit.longestStreak` in Firestore; write via Firestore transaction if different
- Always accurate: if user undoes a completion that was part of longest streak, recompute and lower the value

**Write triggers:**

- **Detail page (Complete button):** Recompute and write immediately after toggle
- **History tab (calendar backfill):** Defer recompute and write until modal closes. Collects rapid multi-date toggles into a single Firestore write.
- **On load:** Backfill check — recompute from full history, write if different from stored value

**Persistence:**

- `useLongestStreakSync` hook tracks last written value via ref
- Writes only when computed value differs from last written
- Firestore transaction ensures safe concurrent multi-client writes

#### 4.8 Access Control

- **Allowlist storage:** Firestore collection `allowedEmails`. Document ID = email (lowercase). Document existence = access granted.
- **API enforcement:** After verifying Firebase ID token, check email against `allowedEmails`. If not found, return `UNAUTHENTICATED`. The `version` query remains unauthenticated.
- **Client enforcement:** Check allowlist after authentication. If not allowed, sign out (and delete account for email/password sign-up), show restricted page. Only call `upsertUser` after allowlist passes.
- **Restricted page:** Minimal page, no navigation, no app chrome. Generic message: "Access is currently restricted." Sign-out button to return to login. No auto-redirect.

#### 4.9 Admin

- **Route:** `/admin`, protected by `AdminGuard`. Non-admins redirected to `/`.
- **Admin detection:** `isAdmin` field on user's `allowedEmails` Firestore document.
- **Admin link:** Visible in Settings page only for admins.
- **Email list:** Table showing all allowed emails with admin badge indicator.
- **Add email:** Input with submit button. Basic email format validation. Lowercases on add. Rejects duplicates.
- **Remove email:** Button per row. Disabled for self-removal. Disabled for last admin.
- **API schema additions:**
  - `allowedEmails: [AllowedEmail!]!` query
  - `addAllowedEmail(email: String!)` and `removeAllowedEmail(email: String!)` mutations
  - All admin operations require `require_admin` check

#### 4.10 Themes

- **7 themes:** Light, Dark, System, Solarized Light, Solarized Dark, Dracula, Nord
- **Theme selector:** "Appearance" section in Settings page. Displayed as a segmented control or selectable list. Changing theme applies immediately (no save button).
- **Dark mode colors:** Dark background `#111827`, surface `#1f2937`, text `#f9fafb`, muted text `#9ca3af`, borders `#374151`. Primary indigo palette retained. Shadows reduced.
- **System theme:** Default selection. Follows `prefers-color-scheme` media query. Updates in real-time if OS preference changes.
- **Persistence:** Theme choice stored in `localStorage`. Survives page reload.
- **No flash:** Theme applied before first paint via inline script in `index.html` that reads `localStorage` and applies `data-theme` attribute synchronously.

#### 4.11 Offline & PWA

- **Service Worker:** Caches app shell (HTML, CSS, JS)
- **Offline reads:** Apollo cache persisted to IndexedDB. Habits list and detail views viewable offline.
- **Sync indicator:** Shows connection state: "Synced", "Syncing...", "Offline". Last-synced timestamp visible in settings or footer.
- **On reconnect:** Refresh data from server. Real-time updates from Firestore listener reflected immediately.
- **Installability:** Web app manifest with app name, icons (192px, 512px), theme color, background color. Standalone display mode. "Add to Home Screen" prompt. Splash screen.
- **Offline writes (v2):** Mutations queued locally, replayed on reconnect. Deferred to v2.

#### 4.12 Date Handling

- All dates and timestamps stored as UTC in Firestore
- `getLocalDate()` helper returns `YYYY-MM-DD` in the user's local timezone
- All components use `getLocalDate()` for "today" calculations — never raw UTC
- Completions respect earliest check-in (existing completion not overwritten by timezone change)
- **Testing:** Unit tests for `getLocalDate()` at 11pm UTC-7 and 1am UTC+9. Unit tests for streak calculation near midnight for all frequency types. CI runs `npm test` on every PR and push to main.

### Non-Functional Requirements

- **Responsiveness:** Mobile-first design. Breakpoints: mobile (< 768px), tablet (768-1024px), desktop (> 1024px). Primary design target: 375px wide (iPhone). Must work from 320px to desktop widths.
- **Accessibility:** WCAG 2.1 AA compliance. Keyboard navigation, focus management, ARIA labels, 4.5:1 contrast ratio. Focus trap in modals. All tap targets minimum 44x44px. Screen reader labels on all buttons.
- **Performance:** Lighthouse PWA score > 90. FCP < 1.5s. TTI < 3s. Bundle < 150KB gzipped. Streak calculation < 100ms for up to 5000 completions. No additional API calls beyond `GET_HABIT` for week strip or streaks.
- **Browser Support:** Chrome, Safari, Firefox, Edge (latest 2 versions)
- **Themes:** WCAG AA contrast ratios in both light and dark modes. All themes work across all pages, modals, and components.

## 5. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Lighthouse PWA score | > 90 | Lighthouse CI |
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Offline reads | Habits viewable offline from cache | Manual + automated testing |
| Cross-device sync latency | Changes appear within 3 seconds | Manual testing |
| Accessibility | WCAG 2.1 AA | axe-core automated checks |
| Streak accuracy (all types) | Matches manual count for DAILY, WEEKLY, CUSTOM | Automated unit tests |
| Longest streak persistence | Value in Firestore matches all-time best | Automated tests |
| Test pass rate | 100% | CI pipeline |
| No flash of wrong theme | Theme visible from first paint | Visual audit |

## 6. Out of Scope

- Social/community features (sharing, leaderboards)
- Gamification beyond streaks (badges, points, levels)
- Habit templates or AI suggestions
- Native desktop app (Electron, Tauri) — PWA covers this
- Data export/import
- Apple Sign-In (web — complex to set up, Google covers this need)
- Payment/subscription features
- Slide-to-complete gesture (deferred to iOS native app)
- Role-based access control beyond admin/non-admin (RBAC deferred to v4.0)
- Admin role management UI (stays in Firebase Console)
- Bulk import/export of allowlist
- Audit log of allowlist changes
- Streak freeze / skip days
- Streak milestone celebrations / animations
- Swipe gestures to navigate between habits

## 7. Dependencies & Risks

| # | Dependency / Risk | Impact | Mitigation |
|---|-------------------|--------|-----------|
| 1 | Cloud Run API must be deployed and stable | Web client non-functional without it | API already deployed and tested |
| 2 | Firebase Auth client SDK | Sign-in flows depend on it | Well-supported, stable library |
| 3 | Browser notification API adoption varies | Reminders won't work on all browsers | Graceful fallback to in-app indicator |
| 4 | Safari PWA limitations | Reduced functionality on iOS Safari | iOS native app covers this gap |
| 5 | Service worker caching | Stale assets or cache conflicts | Versioned cache keys, cache-busting on deploy |
| 6 | Offline mutation replay ordering | Potential conflicts on reconnect | Deferred to v2 — v1 is offline reads only |
| 7 | Firestore read per API request for allowlist | Latency increase | Acceptable for v1; TTL cache tracked for future |
| 8 | Fail-closed allowlist — empty collection blocks everyone | Owner locked out | Owner must add email to `allowedEmails` before deploying |
| 9 | Multiple clients writing longestStreak concurrently | Race condition | Firestore transaction ensures safe concurrent writes |
| 10 | Rapid clicks on history calendar | Excessive Firestore writes | Deferred write on modal close — single operation |

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Documentation | Consolidated from per-feature PRDs into single web client PRD |
