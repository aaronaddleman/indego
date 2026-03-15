# Email Allowlist — User Documentation

## What's New

App access is now restricted to approved email addresses only.

### Changes
- Only approved users can sign in and use the app
- Non-approved users see a generic "Access Restricted" message
- Access is managed by the app administrator

## How to Use

If you're an approved user, nothing changes — sign in as usual.

If you see "Access Restricted," contact the administrator to request access.

## Known Issues / Limitations

- Google sign-in briefly creates a Firebase Auth account before the allowlist check (the account is signed out immediately and no app data is created)

---

# Changelog

## [Unreleased]
### Added
- Email allowlist enforcement on API (GraphQL) and web client
- Firestore `allowedEmails` collection for access control
- RestrictedPage for non-approved users
- Allowlist check in AuthGuard for session-based access
- Allowlist check in LoginPage before sign-in/sign-up
