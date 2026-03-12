# Architecture Requirements Document (ARD) — Web Client

## 1. Overview

- **Project Name:** Indago Web — Habits Tracker PWA
- **Purpose:** A Progressive Web Application that provides the full habit-tracking experience in the browser, with offline support, installability, and push notifications.
- **Goals:**
  - Full feature parity with the planned iOS client
  - Installable PWA with offline capability
  - Real-time sync across devices via Firestore listeners
  - Client-side streak calculation and reminder notifications via Service Worker
- **Scope:** Web client application. The GraphQL API and Firebase backend are already built and deployed.

## 2. System Context

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│            Indago Web (PWA)             │
│                                         │
│  ┌───────────┐  ┌────────────────────┐  │
│  │   React   │  │   Service Worker   │  │
│  │   (Vite)  │  │  - Offline cache   │  │
│  │           │  │  - Push notifs     │  │
│  │  Apollo   │  │  - Background sync │  │
│  │  Client   │  │                    │  │
│  └─────┬─────┘  └────────────────────┘  │
│        │                                │
│        │  GraphQL                       │
│        ▼                                │
│  ┌───────────┐   ┌──────────────────┐   │
│  │ Firebase  │   │    Firebase      │   │
│  │   Auth    │   │    Hosting       │   │
│  │  (SDK)    │   │  (Static files)  │   │
│  └───────────┘   └──────────────────┘   │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Cloud Functions (GraphQL)   │
│  us-central1-indego-bc76b    │
└──────────┬───────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌────────┐ ┌────────┐
│Firestore│ │Firebase │
│  (DB)   │ │  Auth   │
└────────┘ └────────┘
```

### External Systems & Integrations
- **GraphQL API:** Existing Cloud Functions endpoint (`https://us-central1-indego-bc76b.cloudfunctions.net/graphql`)
- **Firebase Auth (client SDK):** Google Sign-In, email/password (client-side auth flow, ID token sent to API)
- **Firebase Hosting:** Static file hosting with CDN, custom domain support
- **Firestore (client SDK):** Real-time listeners for cross-device sync, direct writes for `longestStreak`

### Actors
- **End User:** Same users as the iOS app — tracks habits via browser

## 3. Functional Requirements

- **Authentication:** Google Sign-In and email/password via Firebase Auth client SDK. Obtain ID token for GraphQL API requests.
- **Habit CRUD:** Create, read, update, delete habits via GraphQL mutations/queries
- **Completion Tracking:** Log/undo completions via GraphQL. Display today's status per habit.
- **Streak Calculation:** Client-side calculation from completions map. Write `longestStreak` directly to Firestore when a new record is set.
- **Habit Dashboard:** Single-habit detail view with completion calendar, streak info, and stats
- **Stats View:** Aggregate and per-habit stats via GraphQL `stats` query
- **Reminders:** Schedule browser notifications via Service Worker. Subscribe to reminder changes via Firestore real-time listeners.
- **Offline Support (v1):** Service Worker caches app shell. Apollo cache persisted for offline reads. Offline writes (mutation queuing) deferred to v2.
- **Installable PWA:** Web app manifest with icons, theme color, standalone display mode
- **Sync Status:** Display last-synced timestamp or offline indicator
- **Real-time Sync:** Firestore listeners push changes from other devices immediately

## 4. Non-Functional Requirements

- **Performance:** First Contentful Paint < 1.5s. App shell cached by Service Worker for instant subsequent loads. Lighthouse PWA score > 90.
- **Accessibility:** WCAG 2.1 AA compliance. Keyboard navigation, screen reader support, sufficient color contrast.
- **Browser Support:** Chrome, Safari, Firefox, Edge (latest 2 versions). Mobile browsers (Chrome Android, Safari iOS).
- **Responsiveness:** Mobile-first design. Usable from 320px to 2560px viewport width.
- **Bundle Size:** Initial JS bundle < 150KB gzipped. Code splitting for routes.
- **Security:** Firebase Auth ID tokens for all API requests. No secrets in client code. CSP headers via Firebase Hosting config.

## 5. Architecture Decisions

### AD-W1: React + Vite + TypeScript
- **Decision:** Use React with Vite as the build tool and TypeScript for type safety.
- **Rationale:** React has the largest ecosystem for component libraries, Firebase integration, and GraphQL clients. Vite provides fast HMR and optimized builds. TypeScript catches errors at build time and enables GraphQL codegen.
- **Alternatives Considered:** Next.js — adds SSR complexity unnecessary for a Firebase Hosting SPA; Svelte — smaller ecosystem; Vue — viable but React has better Firebase and GraphQL tooling.

### AD-W2: Apollo Client for GraphQL
- **Decision:** Use Apollo Client for GraphQL operations.
- **Rationale:** Best-in-class caching, optimistic updates, and React hooks integration. Normalized cache means habit updates reflect everywhere instantly. Supports offline persistence via `apollo3-cache-persist`.
- **Alternatives Considered:** urql — lighter but less mature caching; fetch + manual state — more code, no caching benefits.

### AD-W3: vite-plugin-pwa for PWA capabilities
- **Decision:** Use `vite-plugin-pwa` (wraps Workbox) for Service Worker generation, precaching, and web manifest.
- **Rationale:** Handles the complexity of Service Worker lifecycle, cache strategies, and manifest generation. Workbox provides battle-tested runtime caching strategies.
- **Alternatives Considered:** Manual Service Worker — more control but significantly more boilerplate and error-prone.

### AD-W4: Firebase Auth client SDK (not custom auth)
- **Decision:** Use Firebase Auth JavaScript SDK directly in the client for sign-in flows.
- **Rationale:** Handles OAuth redirects, token refresh, and session persistence. The ID token is extracted and sent as `Authorization: Bearer <token>` to the GraphQL API. No custom auth backend needed.

### AD-W5: Firestore client SDK for real-time sync and direct writes
- **Decision:** Use Firestore client SDK alongside the GraphQL API.
- **Rationale:** GraphQL handles CRUD operations (validated by the server). Firestore client SDK provides: (1) real-time listeners for instant cross-device sync, (2) direct writes for `longestStreak` (matches iOS behavior per AD-5 in the API ARD). This dual approach gives us server validation for mutations and real-time sync without polling.

### AD-W6: CSS Modules + indigo design system
- **Decision:** Use CSS Modules for component-scoped styles with an indigo-based design token system (colors, spacing, typography). Primary color palette derived from indigo to match the "Indago" brand.
- **Rationale:** Zero-runtime CSS, no library dependency, natural scoping. Design tokens ensure visual consistency. Indigo provides a professional, calming aesthetic suited to a productivity app.
- **Alternatives Considered:** Tailwind — utility-first approach adds learning curve and larger HTML; styled-components — runtime CSS-in-JS adds to bundle; plain CSS — global scope conflicts.

### AD-W7: React Router for client-side routing
- **Decision:** Use React Router for SPA navigation.
- **Rationale:** Standard routing library for React SPAs. Supports code splitting via lazy routes. Firebase Hosting rewrites all routes to `index.html` for SPA support.

## 6. Data Architecture

### Client-Side State

The web client manages three categories of state:

1. **Server state (Apollo Cache):** Habits, completions, user profile, stats — fetched via GraphQL and cached by Apollo Client
2. **Auth state (Firebase Auth):** Current user, ID token, sign-in status — managed by Firebase Auth SDK
3. **UI state (React state):** Modal visibility, form inputs, selected filters — local component state

### Data Flow

**App Load:**
1. Firebase Auth restores session → obtains ID token
2. Apollo Client fetches habits list via GraphQL
3. Firestore listener established for real-time updates
4. Service Worker serves cached app shell on subsequent visits

**Habit Completion:**
1. User taps "complete" → optimistic UI update (Apollo)
2. `logCompletion` mutation sent to GraphQL API
3. API writes to Firestore → Firestore listener fires on all connected clients
4. Client recalculates current streak from completions map
5. If streak > longestStreak → client writes new value to Firestore directly

**Offline:**
1. Service Worker serves cached app shell
2. Apollo cache provides last-known data for display
3. Mutations queued locally
4. On reconnect, queued mutations replay and Firestore listener resumes

## 7. Security & Access Control

- Firebase Auth SDK handles authentication (Google Sign-In, email/password)
- ID tokens sent as `Authorization: Bearer <token>` on all GraphQL requests
- Firestore security rules enforce per-user data isolation for direct writes (`longestStreak`)
- No secrets stored in client code
- Content Security Policy headers configured in Firebase Hosting
- HTTPS enforced by Firebase Hosting

## 8. Infrastructure & Deployment Overview

- **Hosting:** Firebase Hosting (CDN-backed static file hosting)
- **Build:** Vite produces static files (HTML, JS, CSS, assets)
- **Deploy:** `firebase deploy --only hosting` from the `web/` directory
- **CI/CD:** GitHub Actions — build, test, deploy on merge to main
- **Environments:** Same Firebase project (`indego-bc76b`) for v1, hosting site can be separated later
- **Custom Domain:** Configurable via Firebase Hosting console

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Browser notification permission — users may deny, degrading reminder experience | Accepted — graceful fallback to in-app reminder display |
| 2 | Safari PWA limitations (no push notifications on iOS Safari until 16.4+, limited Service Worker) | Accepted — core functionality works without push; iOS app covers this gap |
| 3 | Apollo cache + Firestore listener coordination — potential for stale cache when listener updates arrive | Decided — v1 uses simple invalidation (Firestore listener triggers Apollo refetch). v2 may upgrade to direct Apollo cache writes for smoother UX. |
| 4 | Offline mutation queue — conflict resolution if same habit modified on multiple offline devices | Deferred to v2 — v1 supports offline reads only |
| 5 | `logCompletion` mutation returns `Completion!` but client needs full `Habit!` for streak recalculation | Planned — API schema change: `logCompletion` and `undoCompletion` will return `Habit!` |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Discovery/Iteration | Initial draft |
