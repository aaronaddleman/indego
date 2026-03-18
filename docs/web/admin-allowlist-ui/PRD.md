# Product Requirements Document (PRD) — Admin Allowlist UI

## 1. Overview

- **Feature Name:** Admin Interface for Email Allowlist Management
- **Problem Statement:** Managing the email allowlist requires going to Firebase Console. Need an in-app admin interface.
- **Goals:**
  - View, add, and remove allowed emails from within the app
  - Admin-only access
  - Prevent lockout (self-removal and last-admin protection)
- **Non-Goals:**
  - Admin role management UI (stays in Firebase Console)
  - Bulk import/export
  - Audit log of changes

## 2. Background & Context

The email allowlist was implemented in PR #11 with Firebase Console as the management interface. This works but is inconvenient — you have to leave the app, navigate to Firestore, and manually edit documents. With Cloud Run now supporting PR previews, we can safely add the required API schema changes.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AU-1 | Admin | See all allowed emails in one list | I know who has access |
| AU-2 | Admin | Add a new email to the allowlist | I can grant someone access |
| AU-3 | Admin | Remove an email from the allowlist | I can revoke access |
| AU-4 | Admin | See which emails are admins | I know who else can manage access |
| AU-5 | Admin | Be prevented from removing myself | I don't accidentally lock myself out |
| AU-6 | Admin | Be prevented from removing the last admin | The system always has at least one admin |
| AU-7 | Non-admin | Not see or access the admin page | The feature is hidden from regular users |
| AU-8 | Admin | Access admin from Settings | I can find it easily |

## 4. Requirements

### Functional Requirements

#### 4.1 Admin Page (`/admin`)
- List all allowed emails in a table/list
- Each row shows: email address, admin badge (if isAdmin)
- Remove button per row (disabled for self and last admin)
- Add email input at top with submit button
- Basic email format validation on add
- Error messages for failed operations

#### 4.2 Admin Access
- `/admin` route protected by `AdminGuard`
- Non-admins redirected to `/`
- Admin link visible in Settings page only for admins
- Admin detection via `isAdmin` field on user's `allowedEmails` Firestore doc

#### 4.3 API — GraphQL Schema Additions
```graphql
type AllowedEmail {
  email: String!
  isAdmin: Boolean!
}

extend type Query {
  allowedEmails: [AllowedEmail!]!
}

extend type Mutation {
  addAllowedEmail(email: String!): AllowedEmail!
  removeAllowedEmail(email: String!): Boolean!
}
```

#### 4.4 API — Protections
- All admin operations require `require_admin` check
- `removeAllowedEmail`: rejects self-removal (caller's email == target email)
- `removeAllowedEmail`: rejects if target is the last admin (count admins, if only 1 and it's the target, reject)
- `addAllowedEmail`: validates email format, lowercases, rejects duplicates

### Non-Functional Requirements

- Admin page accessible and usable on mobile
- WCAG AA compliance
- Works in all themes (light, dark, IDE themes)

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Admin can list emails | All allowed emails displayed |
| Admin can add email | New email appears in list |
| Admin can remove email | Email removed from list |
| Self-removal blocked | Error message shown |
| Last admin removal blocked | Error message shown |
| Non-admin blocked | Redirected to dashboard |

## 6. Out of Scope

- Admin role management UI
- Bulk operations
- Audit log
- Invitation flow (email notifications)

## 7. Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Must add isAdmin: true to own email before deploy | Document in deployment plan |
| 2 | Schema change to production API | Cloud Run PR preview tests it first |

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Discovery/Iteration | Initial draft |
