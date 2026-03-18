# Deployment / Rollout Plan — Admin Allowlist UI

## 1. Overview & Goals

Add admin interface for managing the email allowlist. API + web client changes.

## 2. Pre-Deployment (REQUIRED)

**Before merging:** In Firebase Console → Firestore → `allowedEmails` → your email document:
1. Click the document
2. Add field: `isAdmin` (boolean) = `true`
3. Save

Without this, no one has admin access.

## 3. Deployment Steps

1. Complete pre-deployment step above
2. Merge PR to main
3. CI deploys Cloud Run (API with new schema) + web client
4. Verify: Settings shows "Manage Allowlist" link
5. Verify: `/admin` page loads with email list
6. Verify: can add and remove emails

## 4. Rollback Plan

Revert merge commit. Admin page disappears, allowlist managed via Firebase Console again.

## 5. Go/No-Go Criteria

- [ ] `isAdmin: true` added to own email in Firebase Console
- [ ] Admin page lists all allowed emails
- [ ] Can add a new email
- [ ] Can remove an email
- [ ] Self-removal blocked with error
- [ ] Non-admin cannot access /admin
- [ ] Settings shows admin link only for admins
- [ ] Works in dark mode and themed modes
- [ ] API tests pass

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Documentation | Initial draft |
