# Product Requirements Document (PRD) — Allowlist Signup Fix

## 1. Overview

- **Feature Name:** Allowlist Signup Flow Fix
- **Problem Statement:** Email/password sign-up and sign-in are broken because the allowlist check happens before authentication, but Firestore requires authentication to read the allowlist. Non-allowed sign-ups also leave orphan Firebase Auth accounts.
- **Goals:**
  - Email/password sign-up works for allowed users
  - Non-allowed sign-ups see the restricted page and leave no orphan accounts
  - All sign-in methods (Google, email/password) enforce the allowlist correctly
- **Non-Goals:**
  - Deleting Google OAuth orphan accounts (not possible client-side)
  - Changes to the API or Firestore rules

## 2. Background & Context

The email allowlist feature (PR #11) introduced a Firestore security rule that requires authentication to read the `allowedEmails` collection. The initial implementation checked the allowlist before authentication, which always failed for unauthenticated users.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| ASF-1 | Allowed user | Sign up with email/password | I can create an account and use the app |
| ASF-2 | Allowed user | Sign in with email/password | I can access the app |
| ASF-3 | Non-allowed user | See a restricted message when signing up | I know I can't access the app |
| ASF-4 | App owner | Non-allowed sign-ups not leave orphan accounts | Firebase Auth stays clean |

## 4. Requirements

### Functional Requirements

- **Email/password sign-up:** Create Firebase Auth account → check allowlist → if not allowed, delete account and show restricted page
- **Email/password sign-in:** Sign in → check allowlist → if not allowed, sign out and show restricted page
- **Google sign-in:** Sign in → check allowlist → if not allowed, sign out and show restricted page (account persists)
- **All flows:** Only call `upsertUser` after allowlist check passes

### Non-Functional Requirements

- No user-visible delay for allowed users
- WCAG AA compliance maintained

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Allowed email/password sign-up | Works |
| Non-allowed email/password sign-up | Restricted page, no orphan account |
| Non-allowed sign-in | Restricted page |

## 6. Out of Scope

- Google OAuth orphan account cleanup
- API changes
- Firestore rule changes

## 7. Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | `deleteUser()` could fail | Fail silently — user still sees restricted page, orphan account is minor |

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Discovery/Iteration | Initial draft |
