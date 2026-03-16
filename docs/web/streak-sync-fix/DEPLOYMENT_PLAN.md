# Deployment / Rollout Plan — Streak Sync Fix

## 1. Overview & Goals

Fix longest streak sync after history page backfill. Web client only.

## 2. Deployment Steps

1. Merge PR to main
2. CI deploys web client
3. Verify: backfill dates on history page → return to detail → longest streak updated

## 3. Rollback Plan

Revert merge commit. Previous behavior (stale longest streak after backfill) returns.

## 4. Go/No-Go Criteria

- [ ] Backfill past completions on history page → longest streak updates on return
- [ ] Complete button on detail page → longest streak updates immediately
- [ ] No unnecessary Firestore writes on repeated renders
- [ ] Lint and build pass

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Documentation | Initial draft |
