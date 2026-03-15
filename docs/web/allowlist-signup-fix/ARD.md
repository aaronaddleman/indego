# Architecture Requirements Document (ARD) — Allowlist Signup Fix

## 1. Overview

- **Project Name:** Allowlist Signup Flow Fix
- **Purpose:** Fix the email allowlist check ordering so email/password sign-up and sign-in work correctly, and clean up Firebase Auth accounts for non-allowed sign-ups.
- **Goals:**
  - Move allowlist check to after Firebase Auth authentication (required by Firestore security rules)
  - Delete Firebase Auth accounts immediately for non-allowed email/password sign-ups
  - Prevent orphan accounts from accumulating
- **Scope:** Web client `LoginPage.tsx` only. No API changes.

## 2. System Context

### Problem

The Firestore security rule for `allowedEmails` requires `request.auth != null`:
```
allow read: if request.auth != null && request.auth.token.email == email;
```

The original implementation checked the allowlist **before** Firebase Auth sign-in/sign-up. Unauthenticated users couldn't read the collection, so all email/password users were rejected.

### Fix

Check the allowlist **after** authentication, then:
- **Email/password sign-up (not allowed):** Delete the just-created Firebase Auth account via `deleteUser()`, navigate to restricted page
- **Email/password sign-in (not allowed):** Sign out, navigate to restricted page
- **Google sign-in (not allowed):** Sign out (can't delete external OAuth accounts), navigate to restricted page
- **All flows (allowed):** Proceed with `upsertUser` and navigate to dashboard

## 3. Functional Requirements

- Allowlist check must occur after Firebase Auth authentication
- Non-allowed email/password sign-ups: Firebase Auth account deleted immediately
- Non-allowed sign-ins (email or Google): signed out immediately
- `upsertUser` mutation only called for allowed users
- No API changes required

## 4. Non-Functional Requirements

- No additional latency for allowed users
- No orphan Firebase Auth accounts for email/password sign-ups

## 5. Architecture Decisions

### AD-ASF1: Check allowlist after auth, not before
- **Decision:** Move the allowlist check to after Firebase Auth completes
- **Rationale:** Firestore security rules require authentication to read `allowedEmails`. This is a constraint of the security model — can't be changed without weakening the rules.

### AD-ASF2: Delete account for email/password sign-ups
- **Decision:** Call `deleteUser()` for non-allowed email/password sign-ups
- **Rationale:** We created the account, so we can delete it. Prevents orphans. Google sign-in can't delete because the OAuth account is external.

## 6. Data Architecture

No changes.

## 7. Security & Access Control

- Firestore rules unchanged — `allowedEmails` still requires auth to read
- Non-allowed users never reach `upsertUser`, so no Firestore user document is created
- Email/password accounts deleted immediately — no lingering access

## 8. Infrastructure & Deployment Overview

No infrastructure changes. Web client deploy only.

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Google sign-in creates an orphan Firebase Auth account for non-allowed users | Accepted — can't delete OAuth accounts client-side. Minimal impact. |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
