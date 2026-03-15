# Allowlist Signup Fix — Changelog

## What's New

Email/password sign-up and sign-in now work correctly with the email allowlist.

### Fixed
- Email/password sign-up was blocked for all users due to allowlist check ordering
- Non-allowed email/password sign-ups no longer leave orphan Firebase Auth accounts

---

# Changelog

## [Unreleased]
### Fixed
- Moved allowlist check to after Firebase Auth authentication (required by Firestore security rules)
- Added `deleteUser()` call for non-allowed email/password sign-ups to prevent orphan accounts
