# Architecture Requirements Document (ARD) — Email Allowlist

## 1. Overview

- **Project Name:** Email Allowlist Access Control
- **Purpose:** Restrict app access to approved email addresses only. Both the GraphQL API and web client enforce the allowlist.
- **Goals:**
  - Only users whose email is in the Firestore `allowedEmails` collection can access the app
  - API rejects requests from non-allowlisted users with a generic auth error
  - Web client checks the allowlist after sign-in and shows a minimal "access restricted" message for unauthorized users
  - Allowlist managed via Firebase Console (no admin UI in v1)
- **Scope:** API (Python/Cloud Functions) and web client (React). No schema changes.

## 2. System Context

### Affected Components

```
API (enforcement):
  api/functions/app/auth.py          ← Add allowlist check after token verification
  api/functions/app/repositories/    ← New: allowlist_repo.py (read allowedEmails collection)

Web Client (enforcement):
  web/src/auth/AuthGuard.tsx         ← Check allowlist after Firebase Auth
  web/src/pages/RestrictedPage.tsx   ← New: "Access restricted" message page

Firestore (storage):
  allowedEmails/{email}              ← Collection with email as document ID
```

### Data Flow

```
User signs in (Firebase Auth)
  │
  ├─ Web Client:
  │   AuthGuard → check allowedEmails collection → allowed? → show app
  │                                               → denied? → show restricted page, sign out
  │
  └─ API:
      get_context_value() → verify token → get email from token
        → check allowedEmails collection → allowed? → proceed
                                         → denied? → raise AuthError
```

## 3. Functional Requirements

- **Firestore collection:** `allowedEmails` at root level, document ID is the email address (lowercase)
- **API enforcement:** After verifying the Firebase ID token, check if the user's email exists in `allowedEmails`. If not, raise `AuthError` (same as unauthenticated — minimal info).
- **Client enforcement:** After Firebase Auth sign-in, query `allowedEmails` collection for the user's email. If not found, display a restricted access page and sign the user out.
- **Case insensitive:** Emails normalized to lowercase before lookup
- **No registration blocking:** Firebase Auth still allows account creation, but non-allowlisted users can't access any data

## 4. Non-Functional Requirements

- **Security:** Non-allowlisted users receive the same generic error as unauthenticated users (no information leakage)
- **Performance:** Allowlist check adds one Firestore read per API request. Acceptable for current scale. Can be cached later if needed.
- **Availability:** If the allowlist collection is empty or unreachable, deny all access (fail closed)

## 5. Architecture Decisions

### AD-AL1: Firestore collection with email as document ID
- **Decision:** Store allowed emails as document IDs in an `allowedEmails` collection
- **Rationale:** O(1) lookup by document ID. No query needed. Easy to manage via Firebase Console.
- **Alternatives:** Array in a config document — harder to manage at scale; Firebase Auth custom claims — requires admin SDK calls to set per user.

### AD-AL2: Enforce at both API and client
- **Decision:** Check allowlist in both the API auth middleware and the web client AuthGuard
- **Rationale:** API enforcement is the security boundary (can't be bypassed). Client enforcement provides a good UX (immediate feedback instead of broken API calls).

### AD-AL3: Same error as unauthenticated
- **Decision:** Non-allowlisted users receive the same `UNAUTHENTICATED` error as users with no/invalid tokens
- **Rationale:** Reveals no information about whether the email exists in the system or the allowlist.

### AD-AL4: Fail closed
- **Decision:** If the allowlist check fails (Firestore error, empty collection), deny access
- **Rationale:** Security-first — a misconfiguration should lock the app down, not open it up.

## 6. Data Architecture

### Firestore Collection

```
allowedEmails/
  └─ {email_lowercase}/        ← Document ID is the email (e.g., "user@example.com")
      └─ (no fields required, document existence is the check)
```

Optionally, documents can include metadata fields:
- `addedAt: DateTime` — when the email was added
- `note: String` — optional label (e.g., "admin", "beta tester")

## 7. Security & Access Control

- Firestore security rules should restrict `allowedEmails` to admin-only read/write
- API reads `allowedEmails` via admin SDK (bypasses security rules)
- Client reads `allowedEmails` via client SDK — needs a Firestore rule allowing authenticated users to read their own email document only

### Firestore Rule Addition

```
match /allowedEmails/{email} {
  allow read: if request.auth != null && request.auth.token.email == email;
}
```

## 8. Infrastructure & Deployment Overview

No infrastructure changes. Deploy API and web client via existing pipeline.

## 9. Setup Requirements

### Firebase Console Setup (one-time, before deploying)

1. Go to Firebase Console → Firestore → Create collection `allowedEmails`
2. Add a document with ID = your email address (lowercase, e.g., `user@example.com`)
3. No fields required (document existence is the check), but optionally add `addedAt` timestamp
4. **Important:** You must add your own email before deploying, otherwise fail-closed behavior locks everyone out

### Firestore Security Rules

Add to `firestore.rules`:
```
match /allowedEmails/{email} {
  allow read: if request.auth != null && request.auth.token.email == email;
}
```

## 10. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Firestore read per API request — performance at scale? | Accepted for v1. TTL cache tracked in issue #10. |
| 2 | Should the `version` query (no auth) also be restricted? | No — keep it public for health checks |

## 11. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
