# Product Requirements Document (PRD) — Indego API

## 1. Overview

- **Product:** Indego Habits Tracker API
- **Problem Statement:** Users need a reliable backend to track habits, log completions, compute streaks, and manage access control -- all accessible from web and mobile clients via a single GraphQL endpoint.
- **Goals:**
  - Full habit tracking: CRUD, completions, streaks, stats
  - Email allowlist access control with admin management
  - Versioned deployments with PR preview support and rollback
  - Health and version endpoints for monitoring
- **Non-Goals:**
  - Social features (sharing, leaderboards, accountability partners)
  - Gamification beyond streaks (badges, points, rewards)
  - Habit suggestions or AI-powered recommendations
  - Apple Watch / wearable support
  - RBAC beyond admin/non-admin (tracked for v4.0)
  - Custom domains

## 2. Background & Context

Indego is a focused, cross-device habit tracker. The API is a schema-first GraphQL service built with Ariadne (Python) and backed by Firestore. It was originally deployed on Firebase Cloud Functions and has been migrated to Cloud Run to support PR preview environments and versioned deployments with rollback.

The API is consumed by:
- **Web client** (React, deployed to Firebase Hosting)
- **iOS client** (SwiftUI, planned)

The architecture follows a layered pattern (Transport -> Service -> Repository) to support a future migration to Scala/Cloud Run. All dates are stored in UTC; the server is timezone-agnostic.

The GraphQL schema (`api/functions/schema.graphql`) is the single source of truth for the API contract. Changes flow: schema first, then resolvers, then clients.

## 3. User Stories

### Authentication

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AUTH-1 | User | Sign in with Google or email/password | My data is private and tied to my account |
| AUTH-2 | User | Have my token verified on every request | Unauthorized users cannot access my data |
| AUTH-3 | App owner | Restrict access to allowlisted emails only | Only invited people can use the app |
| AUTH-4 | App owner | Have non-allowlisted requests fail with the same error as invalid tokens | No information is leaked about the allowlist |

### Habit CRUD

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| HAB-1 | User | Create a habit with a name, frequency, and optional reminder | I can define what I want to track |
| HAB-2 | User | Edit any field on an existing habit | I can adjust habits as my goals change |
| HAB-3 | User | Delete a habit | I can remove habits I no longer track |
| HAB-4 | User | List all my habits with their completions | I get a quick overview of progress |
| HAB-5 | User | Retrieve a single habit by ID | I can view details for one habit |

### Completion Tracking

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| CMP-1 | User | Log a completion for a habit on a given date | My progress is recorded |
| CMP-2 | User | Undo a completion for a given date | My streak data stays accurate if I logged by mistake |
| CMP-3 | User | Log the same date twice without duplication | Idempotent completions prevent double-counting |

### Streaks

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| STK-1 | User | Have my current streak computed client-side from completions | Streaks reflect my local timezone accurately |
| STK-2 | User | Have my longest streak persisted on the habit document | My record survives app reinstall or new device |

### Stats

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| STA-1 | User | Query my stats for a date range | I can understand my long-term patterns |
| STA-2 | User | See completion rate and total completions per habit | I can compare habits against each other |
| STA-3 | User | See aggregate stats across all habits | I get an overall picture of my consistency |

### Admin

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| ADM-1 | Admin | List all allowed emails and see who is an admin | I know who has access and who can manage it |
| ADM-2 | Admin | Add an email to the allowlist | I can grant someone access |
| ADM-3 | Admin | Remove an email from the allowlist | I can revoke access |
| ADM-4 | Admin | Set or revoke admin status for an email | I can delegate or restrict management |
| ADM-5 | Admin | Be prevented from removing my own email | I don't accidentally lock myself out |
| ADM-6 | Admin | Be prevented from removing or demoting the last admin | The system always has at least one admin |

### Developer

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| DEV-1 | Developer | Preview API changes on a PR-tagged Cloud Run revision | I can test schema changes before production |
| DEV-2 | Developer | Roll back the API to a previous revision | I can recover quickly from a bad deploy |
| DEV-3 | Developer | Query the version (commit + deploy timestamp) | I can verify which code is running |
| DEV-4 | Developer | Hit a /health endpoint without authentication | Monitoring and load balancers can check availability |

## 4. Requirements

### Functional Requirements

#### 4.1 Authentication

- Firebase Auth for identity (Google Sign-In, email/password)
- Every authenticated request: verify Firebase ID token, extract email, check `allowedEmails` collection in Firestore
- If email not in allowlist: return `UNAUTHENTICATED` (same error as invalid token -- fail-closed, no info leakage)
- If `allowedEmails` collection is empty or missing: all users blocked (fail-closed by design)
- The `version` query, `/health` endpoint, and `/version` endpoint are exempt from authentication

#### 4.2 Habit CRUD

- **Create:** name (required, non-empty), frequency (DAILY | WEEKLY with daysPerWeek | CUSTOM with specificDays), reminder (optional: enabled flag + HH:MM UTC time)
- **Update:** any subset of fields (name, frequency, reminder)
- **Delete:** hard delete (no soft-delete in current version)
- **List:** returns all habits for the authenticated user, including completions array and longestStreak
- **Get:** returns a single habit by ID, or null if not found
- **Validation:** name required; reminder time required when enabled=true; frequency type must match provided fields (daysPerWeek for WEEKLY, specificDays for CUSTOM)

#### 4.3 Completions

- **Log completion:** `logCompletion(habitId, date)` -- adds date key to completions map on the habit document with UTC timestamp value. Idempotent: logging the same date twice overwrites silently.
- **Undo completion:** `undoCompletion(habitId, date)` -- removes the date key from the completions map.
- **Date validation:** date must be a valid date string. Future dates are rejected (with timezone tolerance to account for clients ahead of UTC).
- Both mutations return the updated Habit object.

#### 4.4 Stats

- **Query:** `stats(dateRange: DateRangeInput!)` with required startDate and endDate
- **Response:** `UserStats` containing totalHabits, totalCompletions, and per-habit `HabitStats` (habitId, habitName, totalCompletions, longestStreak, completionRate as 0.0-1.0)
- Computed from the completions map on each habit document (single Firestore read per habit)

#### 4.5 Admin

- All admin operations gated by `require_admin` check (caller must have `isAdmin: true` in their `allowedEmails` document)
- **`allowedEmails` query:** returns all documents in the `allowedEmails` collection with email and isAdmin fields
- **`addAllowedEmail(email)`:** validates email format, lowercases, rejects duplicates (error: "This email is already in the allowlist"), creates document with `isAdmin: false`
- **`removeAllowedEmail(email)`:** rejects self-removal (caller's email == target), rejects removal of the last admin, deletes the document
- **`setAdminStatus(email, isAdmin)`:** updates isAdmin field; rejects revoking admin from the last admin
- All error messages defined in centralized `messages.py` for future localization

#### 4.6 Version & Health

- **`version` query (GraphQL):** returns `{ commit, deployedAt }` from `version.json` injected at build time. No authentication required.
- **`/health` endpoint (HTTP GET):** returns 200 OK. No authentication required. Used by Cloud Run health checks and monitoring.
- **`/version` endpoint (HTTP GET):** returns version JSON. No authentication required.

### Non-Functional Requirements

- **Latency:** API responses < 500ms at p95
- **Availability:** 99.95% (Cloud Run SLA)
- **CORS:** Appropriate headers for web client origins (production and PR previews)
- **Error messages:** Centralized in `api/functions/app/messages.py` for consistency and future localization
- **Performance:** Support up to 100 habits per user, up to 365 days of completion history per habit without degradation
- **Sync:** Real-time changes appear on other devices within seconds (via Firestore listeners on clients)
- **Cold start:** < 3 seconds (Cloud Run)

## 5. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| API availability | 99.95% uptime | Cloud Run monitoring |
| API latency | < 500ms p95 | Cloud Run request logs |
| Streak accuracy | 100% match with completion history | Automated tests |
| Sync latency | < 3 seconds cross-device | Manual testing |
| Rollback time | < 1 minute to previous revision | Cloud Run revision promotion |

## 6. Out of Scope

- Social features (sharing, leaderboards, accountability partners)
- Gamification beyond streaks (badges, points, rewards)
- Habit templates or suggestions
- Apple Watch / wearable support
- Role-based access control beyond admin/non-admin (tracked for v4.0)
- Custom domains for the API
- API path versioning (v1/v2)
- Multi-region deployment
- Bulk import/export of allowlist
- Audit log of admin actions

## 7. Dependencies & Risks

| # | Dependency / Risk | Impact | Mitigation |
|---|-------------------|--------|-----------|
| 1 | Cloud Run cold starts | First request after idle may be slow (up to 3s) | Acceptable at current scale; can add min instances later |
| 2 | Firestore read per request for allowlist check | Adds latency to every authenticated request | Acceptable for current scale; TTL cache tracked in issue #10 |
| 3 | GCP service account permissions | Deploy fails or API cannot access Firestore | Document required roles; verify before deploy |
| 4 | Firebase Auth availability | Users cannot sign in | Firebase SLA 99.95%; no additional mitigation needed |
| 5 | Fail-closed allowlist | Empty or missing `allowedEmails` collection blocks all users | Documented: owner must add their email before deploying |
| 6 | Firestore per-read pricing at scale | Cost increase with user growth | Mitigated: completions stored on habit doc (1 read per habit, not per completion) |

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Documentation | Consolidated from per-feature PRDs (core API, email allowlist, admin allowlist UI, Cloud Run migration) |
