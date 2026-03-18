# Architecture Requirements Document (ARD) — Admin Allowlist UI

## 1. Overview

- **Project Name:** Admin Interface for Email Allowlist Management
- **Purpose:** Build an admin UI and API endpoints to manage the email allowlist, replacing Firebase Console management.
- **Goals:**
  - Admin-only `/admin` route with list/add/remove email functionality
  - GraphQL mutations and query for allowlist management
  - `require_admin` middleware in the API
  - Self-removal and last-admin protection
  - Admin detection via Firestore `isAdmin` field on client
- **Scope:** API (schema + resolvers + middleware) and web client (admin page + admin guard).

## 2. System Context

### New Components

```
API:
  schema.graphql                    ← Add AllowedEmail type, query, mutations
  app/auth.py                       ← Add require_admin middleware
  app/transport/resolvers/admin.py  ← New: admin resolvers
  app/services/admin_service.py     ← New: allowlist business logic
  app/repositories/allowlist_repo.py ← Extend: list, add, remove, count admins

Web:
  src/pages/AdminPage.tsx           ← New: admin UI
  src/pages/AdminPage.module.css    ← New: styles
  src/hooks/useIsAdmin.ts           ← New: check isAdmin from Firestore
  src/auth/AdminGuard.tsx           ← New: protect /admin route
  src/pages/SettingsPage.tsx        ← Modify: show admin link for admins
  src/App.tsx                       ← Modify: add /admin route
```

### Data Flow

```
Admin user → /admin route
  → AdminGuard checks isAdmin via Firestore client SDK
  → AdminPage loads → calls allowedEmails query via GraphQL
  → Add/remove → calls mutations → require_admin middleware validates
  → API checks: not self-removal, not last admin → updates Firestore
```

## 3. Functional Requirements

### API
- **`require_admin(context)`** — extracts user email from token, checks `isAdmin: true` on their `allowedEmails` doc. Raises `AuthError` if not admin.
- **Query `allowedEmails`** — returns all docs in collection with email and isAdmin fields. Admin-only.
- **Mutation `addAllowedEmail(email)`** — validates email format, lowercases, creates doc. Admin-only.
- **Mutation `removeAllowedEmail(email)`** — checks: not self, not last admin. Deletes doc. Admin-only.

### Web Client
- **`useIsAdmin` hook** — reads user's `allowedEmails` doc via Firestore client SDK, returns `isAdmin` boolean
- **`AdminGuard`** — wraps `/admin` route, redirects non-admins to `/`
- **`AdminPage`** — lists emails with admin badge, add email input, remove buttons
- **Settings** — shows "Admin" link if `useIsAdmin` returns true

## 4. Non-Functional Requirements

- Admin check is one Firestore read (same doc as allowlist check, can be combined)
- List query reads entire `allowedEmails` collection (fine for < 100 emails)
- Email validation: basic format check (contains @, has domain)

## 5. Architecture Decisions

### AD-AU1: Admin detection via Firestore client SDK
- **Decision:** Check `isAdmin` by reading the user's `allowedEmails` doc directly, not via GraphQL.
- **Rationale:** We already read this doc in `AuthGuard`. Avoids adding `isAdmin` to the `User` GraphQL type. No extra network call.

### AD-AU2: require_admin middleware
- **Decision:** New `require_admin(context)` function alongside existing `require_auth`.
- **Rationale:** Separates admin authorization from authentication. Resolvers call `require_admin` instead of `require_auth` for admin-only operations.

### AD-AU3: Self-removal and last-admin protection
- **Decision:** API rejects removing your own email AND removing the last admin.
- **Rationale:** Prevents lockout scenarios. Both checks are server-enforced.

### AD-AU4: Admin granting stays in Firebase Console
- **Decision:** No UI to make someone admin. Done manually in Firebase Console.
- **Rationale:** Admin granting is rare and high-trust. Console is sufficient for now.

## 6. Data Architecture

### AllowedEmails Collection (updated)

```
allowedEmails/{email_lowercase}
  └── isAdmin: Boolean (optional, default false)
```

**Pre-deployment:** Add `isAdmin: true` to your email document in Firebase Console.

## 7. Security & Access Control

- `require_admin` checks `isAdmin` field in Firestore via admin SDK
- Non-admin users receive `UNAUTHENTICATED` error (no info leakage)
- Firestore rules unchanged — client SDK can only read own email doc
- Admin mutations go through GraphQL API (server-validated)

## 8. Infrastructure & Deployment Overview

No infrastructure changes. API + web deploy via existing Cloud Run + Firebase Hosting pipeline.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Pre-deployment: must add isAdmin field before merge | Documented in deployment plan |
| 2 | Admin granting only via Firebase Console | Accepted for v1 |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Discovery/Iteration | Initial draft |
