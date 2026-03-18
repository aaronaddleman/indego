# Admin Allowlist UI — Changelog

## What's New

Admins can now manage the email allowlist from within the app.

### Added
- Admin page at `/admin` for viewing, adding, and removing allowed emails
- Admin link in Settings (visible only to admins)
- Self-removal protection (cannot remove your own email)
- Last-admin protection (cannot remove the last admin)
- GraphQL: `allowedEmails` query, `addAllowedEmail` and `removeAllowedEmail` mutations
- `require_admin` API middleware

---

# Changelog

## [Unreleased]
### Added
- Admin allowlist management page (`/admin`)
- AdminGuard route protection
- useIsAdmin hook (Firestore client SDK)
- Admin link in Settings for admin users
- GraphQL schema: AllowedEmail type, admin query and mutations
- require_admin middleware with isAdmin check
- admin_service with email validation, self-removal and last-admin protection
