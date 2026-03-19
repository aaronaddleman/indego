# Architecture Requirements Document (ARD) — Indego API

## 1. Overview

- **Project Name:** Indego Habits Tracker API
- **Purpose:** A GraphQL API for habit tracking that allows users to create, manage, and track habits with reminders, completion logging, streak tracking, and admin access control.
- **Stack:** GraphQL API on Cloud Run (migrated from Cloud Functions), Flask + Gunicorn, Ariadne (schema-first), Firebase Admin SDK
- **Goals:**
  - Provide a reliable, real-time synced habit tracking experience across iOS and web clients
  - Calculate streaks client-side from completion history; persist longest streak server-side
  - Sync reminder schedules across devices; clients handle local notification delivery
  - Start with Python for rapid development; architect for future migration to Scala
  - Enable versioned API deployments with PR preview environments via Cloud Run
- **Scope:** Backend API, authentication, email allowlist access control, data storage, reminder schedule syncing, admin operations, CI/CD infrastructure. Native iOS and web clients are out of scope for this document but inform architectural decisions.

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
                       │   Cloud Run          │
                       │   (indego-api)       │
                       │   Flask + Gunicorn   │
                       │   us-central1        │
                       └──────────┬──────────┘
                                  │
                     ┌────────────┼────────────┐
                     ▼            ▼             ▼
                ┌────────┐  ┌────────┐  ┌──────────────┐
                │Firestore│  │Firebase │  │  Artifact    │
                │  (DB)   │  │  Auth   │  │  Registry    │
                └────────┘  └────────┘  └──────────────┘
```

### External Systems & Integrations

- **Cloud Run:** Container runtime for the GraphQL API (`indego-api`, `us-central1`)
- **Artifact Registry:** Docker image storage (`us-central1-docker.pkg.dev/indego-bc76b/indego`)
- **Firestore:** Primary data store (Native mode) with offline support and real-time listeners
- **Firebase Auth:** Identity provider (email/password, Apple Sign-In, Google Sign-In)
- **Firebase Hosting:** Web client hosting
- **GitHub Actions:** CI/CD pipeline for build, test, and deploy

### Actors

- **End User:** Creates and tracks habits via iOS or web client
- **Admin User:** Manages the email allowlist and admin status via the admin UI

## 3. Functional Requirements

### Authentication
- Firebase Auth ID tokens verified on every GraphQL request (except `version` query)
- Email allowlist enforcement: only emails present in the `allowedEmails` collection may access the API (fail-closed)
- Admin check: resolvers gated by `require_admin` verify `isAdmin: true` on the caller's allowlist entry
- `require_auth` and `require_admin` middleware inject `user_id` and `email` into resolver context

### Habit CRUD
- Create habits with name, frequency (daily/weekly/custom), and optional reminder schedule
- Read all habits for the authenticated user, or a single habit by ID
- Update habit name, frequency, and reminder schedule
- Delete habits (hard delete)

### Completion Tracking
- `logCompletion`: idempotent -- sets a date key in the completions map on the habit document with a UTC timestamp
- `undoCompletion`: removes the date key from the completions map
- Completions stored as a map on the habit document (date string to UTC timestamp)

### Stats
- Date range queries via `stats(dateRange: DateRangeInput!)` returning per-habit and aggregate statistics
- Per-habit stats: total completions, longest streak, completion rate
- Aggregate stats: total habits, total completions across all habits

### Admin
- `allowedEmails` query: list all allowed emails with admin status (admin only)
- `addAllowedEmail`: add an email to the allowlist (admin only)
- `removeAllowedEmail`: remove an email from the allowlist (admin only, self-removal and last-admin protection)
- `setAdminStatus`: toggle admin flag on an allowlist entry (admin only, last-admin protection)

### Health Check
- `GET /health` returns `{"status": "ok"}` for Cloud Run health probes
- `GET /version` returns commit hash and deploy timestamp from environment variables

## 4. Non-Functional Requirements

- **Latency:** API responses < 500ms p95. Streak calculations must not block API responses.
- **Availability:** 99.95% (Cloud Run SLA, co-located with Firestore in `us-central1`).
- **Scale:** Support 100 habits per user, 365 days of completions per habit. Completions map supports ~25,000 entries (~68 years daily) within Firestore's 1MB document limit.
- **Sync:** Real-time cross-device sync < 3s via Firestore listeners.
- **Cold start:** Cloud Run cold starts ~1-2s for Python. Acceptable for current usage. Min instances: 0 (scale to zero).
- **Cost:** Within free tier at current scale. Idle revisions cost nothing.
- **Security:** All API requests authenticated via Firebase Auth ID tokens. Firestore security rules enforce per-user data isolation. Email allowlist enforced fail-closed.
- **Compliance:** User data deletion on account deletion (GDPR-friendly).
- **Portability:** Business logic separated from framework/transport layer to enable Python to Scala migration.

## 5. Architecture Decisions

### AD-1: GraphQL over REST
- **Decision:** Use GraphQL as the API protocol.
- **Rationale:** Better fit for mobile clients (fetch exactly what's needed, reduce over-fetching), single endpoint simplifies client configuration, strongly typed schema serves as API documentation.
- **Alternatives Considered:** REST -- simpler but leads to over/under-fetching for mobile; gRPC -- better performance but poor browser support for web client.

### AD-2: Python with Ariadne (schema-first GraphQL)
- **Decision:** Use Python with Ariadne for the initial implementation.
- **Rationale:** Fast development, schema-first approach means the GraphQL schema is language-agnostic and survives a language migration. Resolvers are thin wrappers around service-layer logic. `api/functions/schema.graphql` is the single source of truth for the API contract.
- **Alternatives Considered:** Strawberry (code-first) -- ties schema to Python types, harder to migrate; Apollo Server (Node.js) -- strong ecosystem but user prefers Python.

### AD-3: Firestore as primary database
- **Decision:** Use Firestore (Native mode), not Realtime Database.
- **Rationale:** Structured document model fits the data well, built-in offline support for iOS/web, real-time listeners for cross-device sync, scales automatically.
- **Alternatives Considered:** Realtime Database -- simpler but less structured, weaker querying; external DB (Postgres) -- more powerful but loses Firebase offline sync benefits.

### AD-4: Layered architecture (Transport -> Service -> Repository)
- **Decision:** Separate code into Transport (GraphQL resolvers) -> Service (business logic) -> Repository (Firestore access) layers.
- **Rationale:** When migrating to Scala, only the implementation changes -- the GraphQL schema and business rules remain the same. Repository pattern abstracts Firestore access. Each layer has a single responsibility and can be tested independently.

### AD-5: Client-side streak calculation, server-persisted longest streak
- **Decision:** Current streaks are calculated client-side from the completions map and the current date. Longest streak is persisted as a high-water mark (`longestStreak` field) on the habit document. Clients write `longestStreak` directly to Firestore -- same trust model as completion logging.
- **Rationale:** Current streak is cheap to compute (walk backwards from today). Longest streak requires scanning full history -- persisting it avoids expensive recomputation on app reinstall or new device. Since it's the user's own data, the client trust model is acceptable.

### AD-6: Client-side reminders with server-synced schedules
- **Decision:** Reminder schedules are stored in Firestore (UTC). Each client subscribes to schedule changes via real-time listeners and independently schedules local notifications (iOS: UNUserNotificationCenter, Web: Notification API / Service Worker).
- **Rationale:** Guarantees reminders fire even when offline. Avoids FCM and Cloud Scheduler infrastructure. When one client updates a reminder, all connected clients receive the change via Firestore and reschedule.
- **Alternatives Considered:** Server-side FCM push -- reliable when online but fails offline; pure client-side with no sync -- reminders diverge across devices.

### AD-7: Completions as map on habit document
- **Decision:** Store completions as a map (date string -> UTC timestamp) directly on the habit document instead of a separate subcollection.
- **Rationale:** Single read returns the habit and all its completions. Natural deduplication -- same date key overwrites. Stats computation is trivial (count map keys). Eliminates the completions subcollection, completion repository, and N+1 query problem. At ~40 bytes per entry, supports ~25,000 completions per habit (~68 years daily) within Firestore's 1MB document limit.
- **Alternatives Considered:** Subcollection per completion -- more reads, more cost, more complex queries; separate completions collection -- loses data locality.

### AD-8: UTC storage, client-side timezone conversion
- **Decision:** All dates and timestamps are stored as UTC. The server is timezone-agnostic. Clients convert to the user's local timezone for display and scheduling.
- **Rationale:** Simplifies the server -- no timezone fields on user or habit documents, no timezone logic in the API. Clients already know the device's timezone. Reminder times are stored in UTC; clients convert to local time when scheduling notifications. Completion date keys (e.g., `"2026-03-11"`) are determined by the client based on UTC + local timezone offset.

### AD-CR1: Flask + Gunicorn for Cloud Run
- **Decision:** Replace `firebase_functions` with Flask for the HTTP layer, served by Gunicorn in production.
- **Rationale:** Flask is lightweight, well-supported, and Ariadne has built-in Flask integration. Gunicorn handles concurrent requests efficiently. The existing GraphQL handler maps directly to a Flask route. Cloud Run serves the container on port 8080.

### AD-CR2: Artifact Registry for Docker images
- **Decision:** Store production Docker images in GCP Artifact Registry (`us-central1`).
- **Rationale:** Native integration with Cloud Run. Faster pulls than external registries. IAM-based access control.

### AD-CR3: Tagged revisions for PR previews
- **Decision:** Use Cloud Run revision tags (not separate services) for PR previews.
- **Rationale:** Tags share the same service configuration, use the same Firestore database, and cost nothing when idle. Each tag gets a unique URL (`https://pr-{number}---indego-api-{hash}-uc.a.run.app`). Simple to create and delete.

### AD-CR4: Full removal of Cloud Functions
- **Decision:** Remove the `firebase_functions` dependency and Cloud Functions deployment entirely.
- **Rationale:** Maintaining two deployment targets adds complexity. Cloud Run is strictly better for deployment control, revision management, and traffic splitting.

### AD-CR5: Firestore rules deployed separately
- **Decision:** Keep `firebase deploy --only firestore:rules` as a separate CI step on merge to main.
- **Rationale:** Firestore rules are independent of the API runtime. Firebase CLI is the only way to deploy them. Lightweight step, no Docker needed.

### AD-CR6: Build in GitHub Actions, not Cloud Build
- **Decision:** Build Docker images in GitHub Actions and push to Artifact Registry.
- **Rationale:** Already have CI infrastructure in GitHub Actions. Avoids adding Cloud Build as another GCP service. Docker Buildx caching works well in Actions.

## 6. Data Architecture

### Collections

**users/{userId}**
```json
{
  "displayName": "string",
  "email": "string",
  "createdAt": "timestamp (UTC)"
}
```

**users/{userId}/habits/{habitId}**
```json
{
  "name": "string",
  "frequency": {
    "type": "daily | weekly | custom",
    "daysPerWeek": "number | null",
    "specificDays": ["monday", "wednesday"]
  },
  "reminder": {
    "enabled": "boolean",
    "time": "HH:MM (UTC)"
  },
  "longestStreak": "number (high-water mark, written by clients)",
  "completions": {
    "2026-03-11": "2026-03-11T13:30:00Z",
    "2026-03-12": "2026-03-12T14:15:00Z"
  },
  "createdAt": "timestamp (UTC)",
  "updatedAt": "timestamp (UTC)"
}
```

**allowedEmails/{email}**
```json
{
  "isAdmin": "boolean (default: false)"
}
```

### Data Flow

**Completion:**
1. User completes a habit -> client calls `logCompletion` mutation
2. API sets the date key in the habit's `completions` map with the UTC timestamp
3. Firestore real-time listener pushes the updated habit document to all connected clients
4. Each client recalculates streak locally from the completions map + current date (in local timezone)
5. If new streak exceeds `longestStreak`, client writes the new value directly to the habit document via Firestore

**Reminder sync:**
1. User creates/updates a reminder schedule -> client calls mutation -> API writes to Firestore
2. Firestore real-time listener pushes updated schedule to all connected clients
3. Each client reschedules its own local notifications from the updated data
4. Offline clients continue with last-synced schedule until reconnected

## 7. Security & Access Control

### Authentication
- Firebase Auth ID tokens required on all GraphQL requests (passed as `Authorization: Bearer <token>`)
- Token verified via `firebase_admin.auth.verify_id_token()`; decoded token provides `uid` and `email`
- Unauthenticated requests receive context with `user_id: None`; resolvers that call `require_auth` raise `UNAUTHENTICATED` error

### Email Allowlist
- Every authenticated request checks the caller's email against the `allowedEmails` collection
- Fail-closed: if the email is not found or the check fails, access is denied
- Only emails present in the allowlist can access any authenticated endpoint

### Admin Access
- Admin resolvers gated by `require_admin`, which checks `isAdmin: true` on the caller's allowlist entry
- Self-removal protection: admins cannot remove their own email from the allowlist
- Last-admin protection: the last remaining admin cannot have their admin status revoked

### Firestore Security Rules
- `users/{userId}/**`: read/write only if `request.auth.uid == userId`
- `allowedEmails/{email}`: read only if `request.auth.token.email == email`; write denied (managed server-side by admin resolvers)

### Cloud Run
- Service allows unauthenticated HTTP requests (app handles auth via Firebase tokens)
- Service account used by Cloud Run to access Firestore (same permissions as former Cloud Functions)
- No secrets in Docker images -- injected as Cloud Run environment variables

## 8. Infrastructure & Deployment

### Cloud Run Service
- **Service:** `indego-api`
- **Region:** `us-central1` (co-located with Firestore)
- **Min instances:** 0 (scale to zero when idle)
- **Max instances:** 10 (sufficient for current scale)
- **Memory:** 256MB
- **CPU:** 1
- **Port:** 8080

### Artifact Registry
- **Repository:** `us-central1-docker.pkg.dev/indego-bc76b/indego`
- **Image tags:** `prod-{commit}` for production, `pr-{number}` for PR previews

### PR Preview Deploys
- On PR: build Docker image, push with `pr-{number}` tag, deploy as a tagged Cloud Run revision
- Tagged revision receives 0% of production traffic; accessible only via tag URL
- Web preview build receives the tag URL as `VITE_GRAPHQL_URL`

### Production Deploy
- On merge to main: build Docker image, push with `prod-{commit}` tag, deploy as new revision with 100% traffic
- Previous revisions retained by Cloud Run for rollback

### Cleanup
- On PR close: separate workflow deletes the tagged revision and associated image

### Firestore Rules
- Deployed via Firebase CLI (`firebase deploy --only firestore:rules`) on merge to main
- Separate from API deployment; uses `firebase.json` with functions config removed

### GitHub Actions Secrets
- `GCP_SERVICE_ACCOUNT_KEY`: roles include Cloud Run Admin, Artifact Registry Writer, Firebase Admin

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Cloud Run cold start (~1-2s Python) | Accepted -- monitor after deployment, consider min instances if needed |
| 2 | Custom domain for Cloud Run API | Deferred -- use default `.run.app` URL for now |
| 3 | TTL cache for allowlist lookups to reduce Firestore reads | Open (issue #10) |
| 4 | CORS restricted to production domain instead of wildcard `*` | Open (issue #24) |
| 5 | Structured logging for Cloud Run (JSON logs to Cloud Logging) | Open (issue #23) |
| 6 | Offline conflict resolution for completions logged on multiple devices | Accepted -- Firestore last-write-wins for now |
| 7 | Offline clients firing stale reminder schedules until reconnected | Accepted -- better than no reminder at all |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | -- | Consolidated from per-feature ARDs (original API ARD, Cloud Run migration ARD, email allowlist, admin) into single document |
