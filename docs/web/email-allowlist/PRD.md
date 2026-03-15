# Product Requirements Document (PRD) — Email Allowlist

## 1. Overview

- **Feature Name:** Email Allowlist Access Control
- **Problem Statement:** The app is publicly accessible — anyone can create a Firebase Auth account and access the habit tracker. Access must be restricted to approved users only.
- **Goals:**
  - Only approved email addresses can use the app
  - Non-approved users see a minimal "access restricted" message
  - Allowlist managed via Firebase Console
- **Non-Goals:**
  - Admin UI for managing the allowlist (tracked in issue #9)
  - Rate limiting or IP-based restrictions

## 2. Background & Context

The app is deployed on Firebase Hosting and publicly reachable. Firebase Auth allows anyone to sign up with Google or email/password. While the data is per-user (isolated by Firebase Auth UID), the app should only be available to invited users during this phase.

## 3. User Stories / Jobs to Be Done

### Users
- **Approved user:** Someone whose email is in the allowlist
- **Non-approved user:** Anyone else who visits the app

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AL-1 | App owner | Restrict access to approved emails | Only invited people can use my app |
| AL-2 | Approved user | Sign in and use the app normally | My experience is unchanged |
| AL-3 | Non-approved user | See a clear but minimal message that access is restricted | I understand I can't use the app without being confused |
| AL-4 | App owner | Add/remove emails via Firebase Console | I can manage access without code changes |

## 4. Requirements

### Functional Requirements

#### 4.1 Allowlist Storage
- Firestore collection: `allowedEmails`
- Document ID = email address (lowercase)
- Document existence = access granted
- Managed via Firebase Console

#### 4.2 API Enforcement
- After verifying the Firebase ID token, extract the user's email
- Check if email (lowercased) exists as a document in `allowedEmails`
- If not found: return `UNAUTHENTICATED` error (same as invalid token — no info leakage)
- If found: proceed normally
- The `version` query remains unauthenticated (no allowlist check)

#### 4.3 Client Enforcement
- **Before Firebase Auth sign-in:** Check `allowedEmails` for the entered email address
- If allowed: proceed with Firebase Auth sign-in and `upsertUser` as normal
- If not allowed: show restricted message immediately — do NOT create a Firebase Auth account
- For Google sign-in: check allowlist after Google returns the email but before calling `upsertUser`. If not allowed, sign out the Firebase Auth account and show restricted message.
- Message: "Access is currently restricted."

#### 4.4 Restricted Access Page
- Minimal page — no navigation, no app chrome
- Generic message (does not reveal allowlist exists or how to get access)
- "Sign out" button to return to login page
- User must click to dismiss (no auto-redirect)

### Non-Functional Requirements

- **Security:** Non-allowlisted users get zero information about the system
- **Performance:** One additional Firestore read per authenticated request (API) and one on sign-in (client)
- **Accessibility:** Restricted page meets WCAG AA

## 5. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Non-allowlisted users blocked | 100% of API requests denied | Manual testing |
| Allowlisted users unaffected | Normal app experience | Manual testing |
| No info leakage | Same error for non-allowlisted and unauthenticated | Code review |

## 6. Out of Scope

- Admin UI for allowlist management (issue #9)
- Invitation flow / self-service access requests
- Role-based access control
- IP allowlisting

## 7. Dependencies & Risks

| # | Dependency / Risk | Impact | Mitigation |
|---|-------------------|--------|-----------|
| 1 | Firestore security rules must be updated | Client can't read allowlist without rule | Add rule allowing users to read their own email document |
| 2 | Firestore read per API request | Latency increase | Acceptable for v1; TTL cache tracked in issue #10 |
| 3 | Fail closed — empty collection blocks everyone | Owner locked out if collection missing | Documented in ARD: owner must add email to `allowedEmails` in Firebase Console before deploying |
| 4 | Google sign-in creates Firebase Auth account before allowlist check | Non-allowlisted users accumulate accounts | Sign out immediately after check fails; no Firestore user doc created since `upsertUser` is skipped |

## 8. Timeline / Milestones

| Milestone | Description |
|-----------|------------|
| M1 | ARD + PRD approved (Gate 1) |
| M2 | Technical Spec (Gate 2) |
| M3 | Implementation: API allowlist check |
| M4 | Implementation: Client allowlist check + restricted page |
| M5 | Firestore rules update, testing, deploy |

## 9. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | Should API cache allowlist results in-memory? | Deferred — tracked in issue #10 |
| 2 | Google sign-in unavoidably creates a Firebase Auth account before we can check the allowlist | Accepted — we sign out immediately and skip `upsertUser`, so no app data is created. The orphan Auth account is minimal. |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
