# Architecture Requirements Document (ARD)

## 1. Overview

- **Project Name:** Indago — Habits Tracker
- **Purpose:** A habit tracking system that allows users to create, manage, and track habits with reminders and streak tracking across iOS and web clients.
- **Goals:**
  - Provide a reliable, real-time synced habit tracking experience across devices
  - Calculate streaks client-side from completion history
  - Sync reminder schedules across devices; clients handle local notification delivery
  - Start with Python for rapid development; architect for future migration to Java/Scala
- **Scope:** Backend API, authentication, data storage, reminder schedule syncing. Native iOS and web clients are out of scope for this document but inform architectural decisions.

## 2. System Context

### High-Level Architecture

```
┌──────────────┐     ┌──────────────┐
│   iOS App    │     │   Web App    │
│ (local notif │     │ (local notif │
│  + streaks)  │     │  + streaks)  │
└──────┬───────┘     └──────┬───────┘
       │                    │
       │   GraphQL API      │
       └────────┬───────────┘
                │
     ┌──────────▼──────────┐
     │  Cloud Functions     │
     │  (Python / Ariadne)  │
     └──────────┬──────────┘
                │
          ┌─────┴─────┐
          ▼           ▼
     ┌────────┐ ┌────────┐
     │Firestore│ │Firebase │
     │  (DB)   │ │  Auth   │
     └────────┘ └────────┘
```

### External Systems & Integrations
- **Firebase Auth:** Identity provider (email/password, Apple Sign-In, Google Sign-In)
- **Firestore:** Primary data store with offline support and real-time listeners for cross-device sync
- **Cloud Functions for Firebase:** Serverless compute for the GraphQL API

### Actors
- **End User:** Creates and tracks habits via iOS or web client

## 3. Functional Requirements

- **Authentication:** Sign up, log in, log out, password reset via Firebase Auth (email/password, Apple, Google)
- **Habit CRUD:** Create, read, update, delete habits
- **Completion Logging:** Record habit completions with timestamps
- **Streak Calculation:** Client-side calculation from completion history (stored as a map on the habit document) and current date. Longest streak persisted as a high-water mark, written directly by clients via Firestore.
- **Sync Status:** Clients display last-synced timestamp so users know data freshness (e.g., "Last synced: 5 min ago" or offline indicator).
- **Reminder Schedule Sync:** Server stores reminder schedules (time in UTC). Clients subscribe to changes via Firestore listeners, convert to local timezone, and schedule local notifications independently. Offline clients continue firing the last-synced schedule.
- **Stats / Analytics (server-side):** Completion rates, streak history, per-habit and aggregate stats. Computed from the completions map on each habit document — single read per habit.
- **Multi-Device Sync:** Real-time sync across iOS and web via Firestore listeners

## 4. Non-Functional Requirements

- **Performance:** API responses < 500ms p95. Streak calculations must not block API responses for habits with long histories.
- **Scalability:** Serverless architecture scales automatically via Cloud Functions. Firestore scales horizontally.
- **Availability:** Firebase SLA (99.95% for Firestore, 99.95% for Cloud Functions).
- **Security:** All API requests authenticated via Firebase Auth ID tokens. Firestore security rules enforce per-user data isolation. No user can access another user's data.
- **Compliance:** User data deletion on account deletion (GDPR-friendly).
- **Portability:** Business logic separated from framework/transport layer to enable Python → Java/Scala migration.

## 5. Architecture Decisions

### AD-1: GraphQL over REST
- **Decision:** Use GraphQL as the API protocol.
- **Rationale:** Better fit for mobile clients (fetch exactly what's needed, reduce over-fetching), single endpoint simplifies client configuration, strongly typed schema serves as API documentation.
- **Alternatives Considered:** REST — simpler but leads to over/under-fetching for mobile; gRPC — better performance but poor browser support for web client.

### AD-2: Python with Ariadne (schema-first GraphQL)
- **Decision:** Use Python with Ariadne for the initial implementation.
- **Rationale:** Fast development, schema-first approach means the GraphQL schema is language-agnostic and survives a language migration. Resolvers are thin wrappers around service-layer logic.
- **Alternatives Considered:** Strawberry (code-first) — ties schema to Python types, harder to migrate; Apollo Server (Node.js) — strong ecosystem but user prefers Python.

### AD-3: Firestore as primary database
- **Decision:** Use Firestore (not Realtime Database).
- **Rationale:** Structured document model fits the data well, built-in offline support for iOS/web, real-time listeners for sync, scales automatically.
- **Alternatives Considered:** Realtime Database — simpler but less structured, weaker querying; external DB (Postgres) — more powerful but loses Firebase offline sync benefits.

### AD-4: Layered architecture for portability
- **Decision:** Separate code into Transport (GraphQL) → Service (business logic) → Repository (Firestore) layers.
- **Rationale:** When migrating to Java/Scala, only the implementation changes — the GraphQL schema and business rules remain the same. Repository pattern abstracts Firestore access.

### AD-5: Client-side streak calculation with server-persisted longest streak
- **Decision:** Current streaks are calculated client-side from the completions map and the current date. Longest streak is persisted as a high-water mark on the habit document. Clients write `longestStreak` directly to Firestore (no API mutation) — same trust model as completion logging.
- **Rationale:** Current streak is cheap to compute (walk backwards from today). Longest streak requires scanning full history — persisting it avoids expensive recomputation on app reinstall or new device. Removing the `updateLongestStreak` mutation simplifies the API. Since it's the user's own data, the client trust model is acceptable for v1.

### AD-6: Client-side reminder notifications with server-synced schedules
- **Decision:** Reminder schedules are stored in Firestore. Each client subscribes to schedule changes via real-time listeners and independently schedules local notifications (iOS: UNUserNotificationCenter, Web: Notification API / Service Worker).
- **Rationale:** Guarantees reminders fire even when offline. Avoids FCM and Cloud Scheduler infrastructure. When one client updates a reminder, all connected clients receive the change via Firestore and reschedule. Offline clients continue firing the last-synced schedule until reconnected — acceptable tradeoff for v1.
- **Alternatives Considered:** Server-side FCM push — reliable when online but fails offline; pure client-side with no sync — reminders diverge across devices.

### AD-7: Completions as map on habit document
- **Decision:** Store completions as a map (date string → UTC timestamp) directly on the habit document instead of a separate subcollection.
- **Rationale:** Single read returns the habit + all its completions. Natural deduplication — same date key = overwrite. Stats computation is trivial (count map keys). Eliminates the completions subcollection, completion repository, and N+1 query problem. At ~40 bytes per entry, supports ~25,000 completions per habit (~68 years daily) within Firestore's 1MB document limit.
- **Alternatives Considered:** Subcollection per completion — more reads, more cost, more complex queries; separate completions collection — loses data locality.

### AD-8: UTC storage, client-side timezone conversion
- **Decision:** All dates and timestamps are stored as UTC. The server is timezone-agnostic. Clients convert to the user's local timezone for display and scheduling.
- **Rationale:** Simplifies the server — no timezone fields on user or habit documents, no timezone logic in the API. Clients already know the device's timezone. Reminder times are stored in UTC; clients convert to local time when scheduling notifications. Completion date keys (e.g., `"2026-03-11"`) are determined by the client based on UTC + local timezone offset.

## 6. Data Architecture

### Collections

**users/{userId}**
```
{
  displayName: string,
  email: string,
  createdAt: timestamp                 // UTC
}
```

**users/{userId}/habits/{habitId}**
```
{
  name: string,
  frequency: {
    type: "daily" | "weekly" | "custom",
    daysPerWeek: number | null,        // for weekly: e.g., 3
    specificDays: string[] | null       // for custom: e.g., ["monday", "wednesday"]
  },
  reminder: {
    enabled: boolean,
    time: string                       // UTC time, e.g., "13:00" (client converts to local)
  },
  longestStreak: number,               // high-water mark, written directly by clients
  completions: {                       // map: date string → UTC timestamp
    "2026-03-11": "2026-03-11T13:30:00Z",
    "2026-03-12": "2026-03-12T14:15:00Z"
  },
  createdAt: timestamp,                // UTC
  updatedAt: timestamp                 // UTC
}
```

### Data Flow

**Completion:**
1. User completes a habit → client calls `logCompletion` mutation
2. API sets the date key in the habit's `completions` map with the UTC timestamp
3. Firestore real-time listener pushes the updated habit document to all connected clients
4. Each client recalculates streak locally from the completions map + current date (in local timezone)
5. If new streak exceeds `longestStreak`, client writes the new value directly to the habit document via Firestore

**Reminder sync:**
1. User creates/updates a reminder schedule → client calls mutation → API writes to Firestore
2. Firestore real-time listener pushes updated schedule to all connected clients
3. Each client reschedules its own local notifications from the updated data
4. Offline clients continue with last-synced schedule until reconnected

## 7. Security & Access Control

- Firebase Auth ID tokens required on all GraphQL requests (passed as `Authorization: Bearer <token>`)
- Cloud Function validates token and injects `userId` into resolver context
- Firestore security rules restrict all reads/writes to `users/{userId}/**` where `userId == request.auth.uid`
- No admin/public endpoints in v1

## 8. Infrastructure & Deployment Overview

- **Compute:** Cloud Functions for Firebase (Python 3.12 runtime)
- **Database:** Firestore (Native mode, multi-region)
- **Auth:** Firebase Auth
- **Notifications:** Client-side local notifications (iOS: UNUserNotificationCenter, Web: Service Worker). Server stores schedules only.
- **Local Dev / CI:** Docker + docker-compose (Firebase Emulators, Python, Node in a single image)
- **CI/CD:** GitHub Actions using Docker for build/test/deploy
- **Environments:** dev, staging, prod (separate Firebase projects)

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Cold start latency for Cloud Functions (Python) — may impact p95 latency | Accepted — monitor after initial deployment |
| 2 | Firestore cost at scale — mitigated by storing completions on the habit document (1 read per habit) | Resolved |
| 3 | Offline conflict resolution for completions logged on multiple devices while offline | Deferred — Firestore last-write-wins acceptable for v1 |
| 4 | Offline clients firing stale reminder schedules until reconnected | Accepted — better than no reminder at all |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Discovery/Iteration | Initial draft |
| 2026-03-11 | Iteration | Moved streaks to client-side calculation, reminders to client-side local notifications with server-synced schedules, removed FCM/Cloud Scheduler dependency |
| 2026-03-11 | Iteration | Added longestStreak high-water mark, date-as-doc-ID for completion dedup, user timezone for date boundaries, sync status indicator, server-side stats for cross-device queries |
| 2026-03-11 | Documentation | All dates UTC (server timezone-agnostic), completions as map on habit doc (eliminated subcollection), removed updateLongestStreak mutation (clients write directly), added firebase.json |
