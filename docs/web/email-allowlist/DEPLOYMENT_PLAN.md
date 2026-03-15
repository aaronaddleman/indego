# Deployment / Rollout Plan — Email Allowlist

## 1. Overview & Goals

Deploy email allowlist enforcement to both the API and web client. This is a security change that restricts app access to approved email addresses.

**Critical:** The allowlist must be populated in Firebase Console BEFORE deploying the code, otherwise all users (including the owner) will be locked out.

## 2. Environments

Same environments as existing (no changes):

| Environment | Purpose |
|-------------|---------|
| **local** | Dev with emulators |
| **preview** | PR preview via Firebase Hosting |
| **prod** | Live |

## 3. Deployment Steps

### Pre-deployment (REQUIRED)

1. **Go to Firebase Console → Firestore**
2. **Create collection** `allowedEmails` (if it doesn't exist)
3. **Add a document** with ID = your email address (lowercase)
   - e.g., document ID: `user@example.com`
   - No fields required
4. **Repeat** for each email you want to allow
5. **Update Firestore security rules:**
   - Add the `allowedEmails` read rule to `api/firestore.rules`
   - Deploy rules: `docker compose run --rm firebase deploy --only firestore:rules --project indego-bc76b`

### Code Deployment

1. Push to `feature/email-allowlist` branch
2. Open PR against `main`
3. CI runs: API tests + web lint/build
4. Preview deploy for testing
5. **Test on preview URL:**
   - Sign in with an allowed email → should work
   - Sign in with a non-allowed email → should see restricted page
6. Merge to main → production deploy

### Post-deployment Verification

1. Visit production URL
2. Sign in with your allowed email → confirm app works
3. Test with a non-allowed email (or incognito) → confirm restricted page shows
4. Verify API rejects non-allowed users (check network tab for `UNAUTHENTICATED` error)

## 4. Rollback Plan

If the allowlist breaks access:

- **Quick fix:** Add missing emails to `allowedEmails` collection in Firebase Console (takes effect immediately, no redeploy needed)
- **Full rollback:** Revert the merge commit on main → auto-deploys previous version
- **Emergency:** Firebase Console → Hosting → Rollback to previous release

## 5. Feature Flags / Gradual Rollout Strategy

Not applicable — this is a security restriction, not a feature. It's either on or off.

## 6. Monitoring & Alerting

- Monitor for increased `UNAUTHENTICATED` errors in Cloud Functions logs (may indicate legitimate users not in allowlist)
- No new alerting needed

## 7. Go/No-Go Criteria

Before merging to main:

- [ ] `allowedEmails` collection exists in Firestore with at least the owner's email
- [ ] Firestore security rules updated and deployed
- [ ] API tests pass (including allowlist tests)
- [ ] Web lint and build pass
- [ ] Tested on preview URL: allowed email works, non-allowed email blocked
- [ ] Restricted page displays correctly on mobile

## 8. Communication Plan

| Event | Channel |
|-------|---------|
| Allowlist deployed | Notify allowed users that no action needed on their part |
| User reports access issue | Check `allowedEmails` collection in Firebase Console |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
