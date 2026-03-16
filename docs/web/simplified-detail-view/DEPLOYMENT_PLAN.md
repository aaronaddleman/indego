# Deployment / Rollout Plan — Simplified Detail View

## 1. Overview & Goals

Simplify the habit detail view. Web client only — no API or infrastructure changes.

## 2. Deployment Steps

1. Merge PR to main
2. CI deploys web client to production
3. Verify tabbed modal: Settings and History tabs work
6. Verify calendar: tappable month/year navigation

## 3. Rollback Plan

Revert merge commit. Previous layout (separate action bar, history page) returns.

## 4. Go/No-Go Criteria

- [ ] Complete button works (click/tap)
- [ ] Edit icon opens modal on Settings tab
- [ ] History icon opens modal on History tab
- [ ] Calendar month name tappable → month picker
- [ ] Calendar year tappable → year picker
- [ ] Backfill completions → close modal → longest streak updates
- [ ] `/habit/:id/history` route removed (404 or redirect)
- [ ] Lint and build pass

## 5. Communication Plan

| Event | Channel |
|-------|---------|
| Preview deployed | GitHub PR comment |
| Merged to prod | GitHub merge notification |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Documentation | Initial draft |
