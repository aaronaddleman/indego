# Deployment / Rollout Plan — Habit Detail Fullscreen

## 1. Overview & Goals

Deploy the habit detail fullscreen redesign as a client-side-only change via the existing Firebase Hosting pipeline. No API or infrastructure changes needed.

**Goals:**
- Iterate on the feature via PR preview deployments
- Test on real devices via preview URLs before merging
- Ship to production by merging to main

## 2. Environments

Same environments as the web client (no changes):

| Environment | Purpose | URL |
|-------------|---------|-----|
| **local** | Development with HMR | `localhost:5173` |
| **preview** | PR review via Firebase Hosting preview channel | Auto-generated per PR (expires 7d) |
| **prod** | Live users | Firebase Hosting production |

## 3. Deployment Steps

### Development & Iteration

1. Implement on `feature/habit-detail-fullscreen` branch
2. Push commits to trigger CI — lint + build verification
3. Open PR against `main` when ready for review
4. PR triggers the existing `deploy.yml` workflow:
   - `web-test`: lint + build
   - `web-deploy`: deploys to Firebase Hosting preview channel
5. Preview URL posted as a PR comment — test on mobile devices
6. Iterate: push more commits → new preview deploys automatically

### Production Deploy

1. PR approved and merged to `main`
2. Existing CI/CD deploys to Firebase Hosting production
3. Verify on production URL

## 4. Rollback Plan

This is a client-side UI change with no data model or API changes.

- **Rollback via Firebase Console:** Hosting → Release history → select previous release → Rollback
- **Rollback via revert:** `git revert <merge-commit>` → push to main → auto-deploys previous UI
- **Risk level:** Low — no backend changes, no data migration, instant rollback

## 5. Feature Flags / Gradual Rollout Strategy

Not needed for this change. The fullscreen view replaces the existing detail page entirely. If issues are found, rollback is instant.

## 6. Monitoring & Alerting

Use existing monitoring (no new setup):

- Lighthouse CI in GitHub Actions (PWA score, accessibility)
- Browser console for JavaScript errors
- Manual testing on preview URL before merge

## 7. Go/No-Go Criteria

Before merging to main:

- [ ] Fullscreen view renders correctly on mobile (375px viewport)
- [ ] Complete button toggles completion with optimistic update
- [ ] Week strip shows correct 7-day window with completion states
- [ ] Future days are not tappable
- [ ] Edit form opens and includes delete action
- [ ] History view shows calendar with backfill capability
- [ ] Back button returns to dashboard
- [ ] No regressions on dashboard or other pages
- [ ] Lint and build pass in CI
- [ ] Tested on preview URL on a real phone

## 8. Communication Plan

| Event | Channel |
|-------|---------|
| Preview deployed | GitHub PR comment (automatic) |
| Ready for review | GitHub PR review request |
| Merged to prod | GitHub merge notification |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
