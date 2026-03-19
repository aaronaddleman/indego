# Architecture Requirements Document (ARD) — Indago Web Client

## 1. Overview

- **Project Name:** Indago Web -- Habits Tracker PWA
- **Purpose:** A Progressive Web Application that provides the full habit-tracking experience in the browser, with offline support, installability, and real-time sync.
- **Stack:** React + Vite + TypeScript, Apollo Client for GraphQL, Firebase Auth + Firestore client SDK
- **Goals:**
  - Full feature parity with the planned iOS client
  - Installable PWA with offline capability
  - Real-time sync across devices via Firestore listeners
  - Client-side streak calculation for all frequency types
  - Theme support (Light/Dark/System + custom palettes)
  - Admin interface for allowlist management
- **Scope:** Web client application. The GraphQL API and Firebase backend are already built and deployed.

## 2. System Context

### High-Level Architecture

```
+-------------------------------------------+
|           Indago Web (PWA)                |
|                                           |
|  +-----------+  +----------------------+  |
|  |   React   |  |   Service Worker     |  |
|  |   (Vite)  |  |  - Offline cache     |  |
|  |           |  |  - Background sync   |  |
|  |  Apollo   |  |                      |  |
|  |  Client   |  |                      |  |
|  +-----+-----+  +----------------------+  |
|        |                                  |
|        |  GraphQL                         |
|        v                                  |
|  +-----------+   +------------------+     |
|  | Firebase  |   |    Firebase      |     |
|  |   Auth    |   |    Hosting       |     |
|  |  (SDK)    |   |  (Static files)  |     |
|  +-----------+   +------------------+     |
+--------+----------------------------------+
         |
         v
+------------------------------+
|  Cloud Run (GraphQL API)     |
|  us-central1-indego-bc76b    |
+----------+-------------------+
           |
     +-----+-----+
     v           v
+--------+ +--------+
|Firestore| |Firebase |
|  (DB)   | |  Auth   |
+--------+ +--------+
```

### External Systems and Integrations

- **GraphQL API:** Cloud Run endpoint (`https://us-central1-indego-bc76b.cloudfunctions.net/graphql`)
- **Firebase Auth (client SDK):** Google Sign-In, email/password. ID token sent as `Authorization: Bearer <token>` to the API.
- **Firestore (client SDK):** Real-time listeners for cross-device sync, direct writes for `longestStreak`, allowlist/admin checks.
- **Firebase Hosting:** Static file hosting with CDN, SPA rewrites.
- **Service Worker:** Workbox-based via `vite-plugin-pwa`. Precaches app shell, runtime caching for API responses.

### Actors

- **End User:** Tracks habits via browser (same users as the planned iOS app)
- **Admin User:** Manages the email allowlist via `/admin` route

## 3. Functional Requirements

### Authentication
- Google Sign-In and email/password via Firebase Auth client SDK
- Obtain ID token for GraphQL API requests
- Allowlist check after sign-in: query `allowedEmails` collection for user's email
- Non-allowed email/password sign-ups: Firebase Auth account deleted immediately
- Non-allowed sign-ins (email or Google): signed out, shown restricted access page
- Admin detection via `isAdmin` field on user's `allowedEmails` document

### Dashboard
- Habit list with completion status for today
- Completion toggle per habit (optimistic UI via Apollo)
- Current streak and longest streak displayed per habit
- Uses local timezone date (`getLocalDate()`) for today's date

### Habit Detail (Fullscreen View)
- Fullscreen layout replacing standard page chrome (no PageShell/NavBar)
- Back button (top-left) returns to dashboard
- Habit name, frequency, current streak, longest streak in large typography
- 7-day week strip: 3 past days + today (highlighted) + 3 future days
- Past days and today tappable to toggle completion; future days display-only
- Large Complete button for toggling today's completion
- Edit icon (top-right) opens tabbed modal on Settings tab
- History icon (top-right) opens tabbed modal on History tab

### Tabbed Modal (Settings + History)
- Two tabs: Settings and History
- Settings tab: HabitForm in inline mode (name, frequency, reminder) + delete with confirmation
- History tab: Calendar with MonthView, tappable month/year pickers, completion toggles for backfilling
- Deferred longestStreak write on modal close (not on every toggle)
- Nearly fullscreen on mobile, centered card on desktop

### Habit Management
- Create, edit, delete habits via GraphQL mutations
- HabitForm supports both create and inline edit modes
- Delete action accessible from Settings tab (with ConfirmDialog)

### Calendar
- MonthView with tappable month name (opens MonthPicker list) and tappable year (opens YearPicker list)
- Previous/next month arrow navigation
- WeekView for weekly display
- WeekStrip (7-day fixed window) on detail page

### Stats
- Aggregate and per-habit statistics via GraphQL `stats` query
- Date range filtering

### Streaks
- Client-side calculation for all frequency types:
  - **DAILY:** Consecutive calendar days with completion, walking backwards from today
  - **WEEKLY (N days/week):** Calendar weeks (Mon-Sun) where completions >= target; current partial week has grace period
  - **CUSTOM (specific days):** Walk backwards through scheduled days only; missed scheduled day breaks streak
- Longest streak computed from full completions history (not just current streak)
- Longest streak persisted via Firestore transaction (read-then-conditional-write)
- Backfill on load: compute all-time longest from history, write if greater than stored
- Local `useRef` tracks last written value to avoid stale Apollo cache reads

### Admin
- `/admin` route protected by `AdminGuard` (checks `isAdmin` from Firestore)
- List all allowed emails with admin badges
- Add email (validated, lowercased)
- Remove email (server rejects self-removal and last-admin removal)
- Toggle admin status in Firebase Console only (no UI for granting admin)
- Settings page shows "Admin" link for admin users

### Themes
- Three base modes: Light, Dark, System (follows OS `prefers-color-scheme`)
- Custom palettes: Dracula, Nord, Solarized, Monokai
- CSS custom properties with `[data-theme]` attribute on `<html>`
- System is the default
- Persisted in localStorage (key: `"theme"`)
- No flash of wrong theme: inline `<script>` in `index.html` applies theme before first paint
- Semantic variables (`--color-surface`, `--color-bg`) replace hardcoded `white`

### Offline (v1)
- Service Worker caches app shell via Workbox precaching
- Apollo cache persisted via `apollo3-cache-persist` for offline reads
- Offline writes (mutation queuing) deferred to v2

### PWA
- Installable: web app manifest with icons, theme color, standalone display mode
- Service Worker for offline support
- Lighthouse PWA score > 90

## 4. Non-Functional Requirements

### Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Initial JS bundle < 150KB gzipped
- Code splitting by route (lazy loading)
- App shell cached by Service Worker for instant subsequent loads
- Streak computation: sort completions once O(n log n), single-pass O(n), cached sorted array

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation throughout
- Screen reader support with ARIA labels
- Sufficient color contrast in all themes (4.5:1 minimum)
- Large tap targets (minimum 44x44px)
- Focus trap in modals, ESC to close

### Browser Support
- Chrome, Safari, Firefox, Edge (latest 2 versions)
- Mobile browsers (Chrome Android, Safari iOS)

### Responsiveness
- Mobile-first design
- Usable from 320px to 2560px viewport width
- Fullscreen detail view optimized for 320px-428px as primary target

### Testing
- Vitest unit tests in CI
- Date helper tests with mocked timezones (`vi.useFakeTimers()`)
- Streak calculation tests for all frequency types
- Tests run as part of `web-test` CI job (alongside lint and build)

## 5. Architecture Decisions

### AD-W1: React + Vite + TypeScript
- **Decision:** Use React with Vite as the build tool and TypeScript for type safety.
- **Rationale:** React has the largest ecosystem for component libraries, Firebase integration, and GraphQL clients. Vite provides fast HMR and optimized builds. TypeScript catches errors at build time and enables GraphQL codegen.
- **Alternatives Considered:** Next.js (adds SSR complexity unnecessary for a Firebase Hosting SPA); Svelte (smaller ecosystem); Vue (viable but React has better Firebase and GraphQL tooling).

### AD-W2: Apollo Client for GraphQL
- **Decision:** Use Apollo Client for GraphQL operations.
- **Rationale:** Best-in-class caching, optimistic updates, and React hooks integration. Normalized cache means habit updates reflect everywhere instantly. Supports offline persistence via `apollo3-cache-persist`.
- **Alternatives Considered:** urql (lighter but less mature caching); fetch + manual state (more code, no caching benefits).

### AD-W3: vite-plugin-pwa for PWA capabilities
- **Decision:** Use `vite-plugin-pwa` (wraps Workbox) for Service Worker generation, precaching, and web manifest.
- **Rationale:** Handles the complexity of Service Worker lifecycle, cache strategies, and manifest generation. Workbox provides battle-tested runtime caching strategies.
- **Alternatives Considered:** Manual Service Worker (more control but significantly more boilerplate and error-prone).

### AD-W4: Firebase Auth client SDK
- **Decision:** Use Firebase Auth JavaScript SDK directly in the client for sign-in flows.
- **Rationale:** Handles OAuth redirects, token refresh, and session persistence. The ID token is extracted and sent as `Authorization: Bearer <token>` to the GraphQL API. No custom auth backend needed.

### AD-W5: Firestore SDK alongside GraphQL
- **Decision:** Use Firestore client SDK alongside the GraphQL API.
- **Rationale:** GraphQL handles CRUD operations (validated by the server). Firestore client SDK provides: (1) real-time listeners for instant cross-device sync, (2) direct writes for `longestStreak` (matches iOS behavior per AD-5 in the API ARD), (3) allowlist/admin checks using existing security rules. This dual approach gives server validation for mutations and real-time sync without polling.

### AD-W6: CSS Modules + indigo design system
- **Decision:** Use CSS Modules for component-scoped styles with an indigo-based design token system (colors, spacing, typography). Primary color palette derived from indigo to match the "Indago" brand.
- **Rationale:** Zero-runtime CSS, no library dependency, natural scoping. Design tokens ensure visual consistency. Indigo provides a professional, calming aesthetic suited to a productivity app.
- **Alternatives Considered:** Tailwind (utility-first approach adds learning curve and larger HTML); styled-components (runtime CSS-in-JS adds to bundle); plain CSS (global scope conflicts).

### AD-W7: React Router for client-side routing
- **Decision:** Use React Router for SPA navigation.
- **Rationale:** Standard routing library for React SPAs. Supports code splitting via lazy routes. Firebase Hosting rewrites all routes to `index.html` for SPA support.

### AD-HDF1: Fullscreen route replaces existing HabitDetailPage
- **Decision:** The `/habit/:id` route renders the fullscreen view, completely replacing the previous `HabitDetailPage`.
- **Rationale:** User confirmed this is a replacement, not an addition. Simpler routing, no feature flag needed.

### AD-HDF2: History as tabbed modal (not separate route)
- **Decision:** History is accessed via a tab in the detail view modal, not a separate `/habit/:id/history` route.
- **Rationale:** Keeps the main fullscreen view clean and focused. Edit and history are related management actions combined in one modal. Decided during AD-SDV1 implementation.

### AD-HDF3: Week strip is a new component
- **Decision:** Build a new `WeekStrip` component (not reuse `WeekView`) since it has fixed 7-day window behavior centered on today, with future-day disabling.
- **Rationale:** The existing `WeekView` supports arbitrary week navigation and has different interaction patterns. A purpose-built component is simpler.

### AD-HDF4: Delete action lives inside edit form
- **Decision:** The delete button is only accessible from the Settings tab in the tabbed modal, not directly on the fullscreen view.
- **Rationale:** Reduces accidental destructive actions on mobile. Edit is the natural place for habit management actions.

### AD-AL1: Firestore collection with email as document ID
- **Decision:** Store allowed emails as document IDs in an `allowedEmails` collection.
- **Rationale:** O(1) lookup by document ID. No query needed. Easy to manage via Firebase Console.
- **Alternatives:** Array in a config document (harder to manage at scale); Firebase Auth custom claims (requires admin SDK calls per user).

### AD-AL2: Enforce allowlist at both API and client
- **Decision:** Check allowlist in both the API auth middleware and the web client AuthGuard.
- **Rationale:** API enforcement is the security boundary (can't be bypassed). Client enforcement provides good UX (immediate feedback instead of broken API calls).

### AD-AL3: Same error as unauthenticated
- **Decision:** Non-allowlisted users receive the same `UNAUTHENTICATED` error as users with no/invalid tokens.
- **Rationale:** Reveals no information about whether the email exists in the system or the allowlist.

### AD-AL4: Fail closed
- **Decision:** If the allowlist check fails (Firestore error, empty collection), deny access.
- **Rationale:** Security-first -- a misconfiguration should lock the app down, not open it up.

### AD-ASF1: Check allowlist after auth, not before
- **Decision:** Move the allowlist check to after Firebase Auth completes.
- **Rationale:** Firestore security rules require authentication to read `allowedEmails`. This is a constraint of the security model and cannot be changed without weakening the rules.

### AD-ASF2: Delete account for non-allowed email/password sign-ups
- **Decision:** Call `deleteUser()` for non-allowed email/password sign-ups.
- **Rationale:** We created the account, so we can delete it. Prevents orphan accounts. Google sign-in cannot delete because the OAuth account is external.

### AD-LS1: Firestore transaction for longestStreak writes
- **Decision:** Use a Firestore transaction (read-then-conditional-write) instead of a blind write.
- **Rationale:** Multiple clients (browser tabs, devices) may compute streaks simultaneously. A transaction ensures only the highest value is persisted. `runTransaction` reads the current value and only writes if the new value exceeds it.
- **Alternative:** `updateDoc` with blind write -- simpler but last-write-wins could lower the value if a stale client writes.

### AD-LS2: Compute all-time longest from completions history
- **Decision:** Compute the longest streak by walking through the entire completions history, not just the current streak.
- **Rationale:** The current streak may not be the longest. A user could have had a 30-day streak months ago and a 4-day current streak. Backfill must find the historical maximum. Also handles backfilled historical check-ins.

### AD-LS3: Streak logic derived from frequency config
- **Decision:** The streak definition is determined by the habit's frequency type and settings. Users do not choose a separate streak mode.
- **Rationale:** Keeps the model simple. The frequency already defines what "consistent" means for that habit.

### AD-LS4: Current week grace period for WEEKLY habits
- **Decision:** If the current week has not ended and the user has not yet met their target, do not break the streak. Week boundary is start of Monday (ISO).
- **Rationale:** Breaking the streak mid-week when the user has not had a chance to complete would feel punishing and incorrect. The streak only breaks when Monday begins and the previous week is finalized as below target.

### AD-LS5: Deferred longestStreak write on history page
- **Decision:** On the history tab, do NOT recompute or write `longestStreak` on every completion toggle. Recompute once when the modal closes.
- **Rationale:** Users may rapidly click multiple dates when backfilling. Recomputing and writing on every click wastes Firestore writes and computation. A single deferred write on modal close collects all changes into one operation. On the main detail page, write immediately after the Complete button toggle since it is a single action.

### AD-LS6: Optimize computation for scale
- **Decision:** Pre-sort completions once, then use a single pass for streak computation. Cache the sorted array.
- **Rationale:** Sorting is O(n log n), single-pass streak computation is O(n). Caching the sorted array avoids re-sorting on every render. For WEEKLY, group completions into week buckets using a Map keyed by ISO week.

### AD-SSF1: Local ref for last written streak value
- **Decision:** Use `useRef` to track the last value written to Firestore, skip writes when unchanged.
- **Rationale:** Avoids stale Apollo cache problem (Apollo cache does not know about Firestore transaction writes). Avoids unnecessary Firestore reads. The transaction still protects against concurrent clients.

### AD-SDV1: Tabbed modal replaces separate history route
- **Decision:** Remove `/habit/:id/history` route. Combine edit and history in a tabbed modal on the detail page.
- **Rationale:** Fewer routes, less navigation, edit and history are related management actions. Deferred streak write moves to modal close (simpler than page unmount).

### AD-SDV2: Deferred streak write on modal close
- **Decision:** Recompute and write `longestStreak` when the tabbed modal closes, not on every completion toggle inside it.
- **Rationale:** Same batching benefit as the previous history page unmount approach. Modal close is a cleaner lifecycle event than page unmount.

### AD-TS1: CSS custom properties with data-theme attribute
- **Decision:** Use `[data-theme="dark"]` selector (and similar for custom palettes) to override `:root` CSS variables.
- **Rationale:** Zero-JS theming at the CSS level. All existing components automatically adapt. No styled-components or theme providers needed.

### AD-TS2: localStorage for theme persistence
- **Decision:** Store theme preference in localStorage, not Firestore.
- **Rationale:** Theme is a display preference, not user data. Must be available instantly on page load (no network delay). Per-device is appropriate -- a user may want dark on phone, light on laptop.

### AD-TS3: System as default theme
- **Decision:** Default to system/OS preference, not light.
- **Rationale:** Respects user's existing preference. Most users who want dark mode already have it set at the OS level.

### AD-TS4: Prevent flash with inline script
- **Decision:** Apply theme via a small inline `<script>` in `index.html` before React loads.
- **Rationale:** If theme is set via React useEffect, there is a flash of the light theme before dark kicks in. An inline script in `<head>` runs synchronously before first paint.

### AD-TS5: Surface and background semantic variables
- **Decision:** Add `--color-surface` and `--color-bg` semantic variables for backgrounds that were previously hardcoded as `white` or `var(--color-neutral-50)`.
- **Rationale:** Several components used hardcoded `white` or fixed background values. These must be CSS variables to support dark mode and custom palettes.

### AD-AU1: Admin detection via Firestore client SDK
- **Decision:** Check `isAdmin` by reading the user's `allowedEmails` doc directly, not via GraphQL.
- **Rationale:** We already read this doc in `AuthGuard`. Avoids adding `isAdmin` to the `User` GraphQL type. No extra network call.

### AD-AU2: require_admin middleware
- **Decision:** New `require_admin(context)` function alongside existing `require_auth` in the API.
- **Rationale:** Separates admin authorization from authentication. Resolvers call `require_admin` instead of `require_auth` for admin-only operations.

### AD-AU3: Self-removal and last-admin protection
- **Decision:** API rejects removing your own email AND removing the last admin.
- **Rationale:** Prevents lockout scenarios. Both checks are server-enforced.

### AD-AU4: Admin granting stays in Firebase Console
- **Decision:** No UI to make someone admin. Done manually in Firebase Console by setting `isAdmin: true`.
- **Rationale:** Admin granting is rare and high-trust. Console is sufficient for now.

### AD-TZ1: Centralized date helper
- **Decision:** Single `getLocalDate()` function in `utils/date.ts` used by all components.
- **Rationale:** Prevents the UTC-vs-local date bug from recurring. All components import the same function. Easy to test. Replaces inline `toISOString().split('T')[0]` and inline `format()` calls.

### AD-TZ2: Unit tests for timezone logic
- **Decision:** Vitest unit tests with mocked timezones, not E2E.
- **Rationale:** Fast, deterministic, catches the exact class of bug. E2E timezone testing tracked separately (#31).

### AD-TZ3: Tests in CI
- **Decision:** Add `npm test` to existing `web-test` CI job.
- **Rationale:** Simple, no new CI job. Tests run alongside lint and build.

## 6. Data Architecture

### Client-Side State

The web client manages three categories of state:

1. **Server state (Apollo Cache):** Habits, completions, user profile, stats -- fetched via GraphQL and cached by Apollo Client. Persisted offline via `apollo3-cache-persist`.
2. **Auth state (Firebase Auth):** Current user, ID token, sign-in status -- managed by Firebase Auth SDK.
3. **UI state (React state):** Modal visibility, form inputs, selected filters, selected calendar date -- local component state and React context.
4. **Theme state (localStorage):** Theme preference (`"light"`, `"dark"`, `"system"`, or palette name). Read synchronously on page load.

### Data Flow: Habit Completion

1. User taps "complete" on detail page or dashboard -> optimistic UI update (Apollo)
2. `logCompletion` mutation sent to GraphQL API
3. API writes to Firestore -> Firestore listener fires on all connected clients
4. Client recalculates current streak from completions map using `getLocalDate()` for today
5. If streak > longestStreak -> client writes new value via Firestore transaction directly

### Data Flow: History Backfill

1. User opens tabbed modal on History tab
2. User toggles completions on multiple past dates
3. On modal close: recompute all-time longest streak from full history
4. If computed longest > stored longestStreak -> write via Firestore transaction

### Offline Support Model

1. Service Worker serves cached app shell (Workbox precaching)
2. Apollo cache provides last-known data for display
3. Offline writes (mutation queuing) deferred to v2
4. On reconnect, Firestore listener resumes real-time sync

### Theme Persistence

1. On load: inline `<script>` reads `localStorage["theme"]`
2. Resolves effective theme: explicit value or OS `prefers-color-scheme`
3. Sets `data-theme` attribute on `<html>` before first paint
4. `useTheme` hook manages runtime changes and OS preference listener

### Firestore Collections Accessed by Client

- `users/{userId}/habits/{habitId}` -- longestStreak direct writes via transaction
- `allowedEmails/{email}` -- allowlist check (own doc only) and admin detection (`isAdmin` field)

## 7. Security and Access Control

- **Firebase Auth SDK** handles authentication (Google Sign-In, email/password)
- **ID tokens** sent as `Authorization: Bearer <token>` on all GraphQL requests
- **Allowlist check (AuthGuard):** After sign-in, reads user's `allowedEmails/{email}` doc via Firestore client SDK. Non-allowed users shown restricted page and signed out. Email/password sign-up accounts deleted immediately for non-allowed users.
- **Admin detection:** `isAdmin` field on `allowedEmails` doc, read via Firestore client SDK (same doc as allowlist check)
- **AdminGuard:** Protects `/admin` route, redirects non-admins to `/`
- **Firestore security rules:** Users can only read their own `allowedEmails` doc and their own habit data
- **No secrets in client code** -- all sensitive operations go through the API
- **Content Security Policy** headers configured in Firebase Hosting
- **HTTPS enforced** by Firebase Hosting
- **Fail closed:** If allowlist check fails, deny access

## 8. Infrastructure and Deployment

### Hosting
- Firebase Hosting with CDN-backed static file serving
- SPA rewrites: all routes -> `index.html`

### Build
- Vite produces static files (HTML, JS, CSS, assets)
- Code splitting by route (React Router lazy loading)

### CI Pipeline
- **Lint** -> **Test** (Vitest) -> **Build** (Vite)
- Tests include date helper, streak calculation, and component tests
- Runs as `web-test` job in GitHub Actions

### Preview Deploys
- PRs get preview deploys on Firebase Hosting
- 7-day expiry on preview channels

### Production Deploy
- On merge to main: build and deploy to Firebase Hosting
- Same Firebase project (`indego-bc76b`) for v1

### Custom Domain
- Configurable via Firebase Hosting console

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Tab styling in dark/themed modes needs visual polish | Open (#21) |
| 2 | E2E testing with Playwright for timezone and integration tests | Tracked (#31) |
| 3 | Slide-to-complete gesture deferred to iOS native app | Deferred |
| 4 | Browser notification permission -- users may deny, degrading reminder experience | Accepted -- graceful fallback to in-app display |
| 5 | Safari PWA limitations (limited Service Worker, push notifications iOS 16.4+) | Accepted -- core functionality works without push; iOS app covers gap |
| 6 | Apollo cache + Firestore listener coordination -- potential stale cache | v1 uses simple invalidation (listener triggers refetch). v2 may use direct cache writes. |
| 7 | Offline mutation queue -- conflict resolution across offline devices | Deferred to v2 -- v1 supports offline reads only |
| 8 | Google sign-in creates orphan Firebase Auth account for non-allowed users | Accepted -- cannot delete OAuth accounts client-side. Minimal impact. |
| 9 | PWA theme-color in manifest with dark mode | Deferred -- keep static for v1 |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Consolidation | Consolidated from per-feature ARDs (original, habit-detail-fullscreen, email-allowlist, allowlist-signup-fix, longest-streak-fix, streak-sync-fix, simplified-detail-view, theme-settings, admin-allowlist-ui, timezone-fix) |
