# Deployment / Rollout Plan — Longest Streak Fix

## 1. Overview & Goals

Fix streak calculation and persistence. Web client change only — no API or infrastructure changes.

## 2. Deployment Steps

1. Merge PR to main
2. CI deploys web client to production
3. On first load, existing habits with `longestStreak: 0` get backfilled automatically
4. Verify streaks display correctly for all frequency types

## 3. Rollback Plan

Revert the merge commit. Previous behavior (broken longest streak, simplified current streak) returns. No data corruption risk — `longestStreak` values written are always computed from completions.

## 4. Go/No-Go Criteria

- [ ] DAILY habit: current streak matches manual count
- [ ] WEEKLY habit: current streak counts consecutive weeks meeting target
- [ ] CUSTOM habit: current streak counts only scheduled days
- [ ] Longest streak persists after page reload
- [ ] Longest streak backfills on load for existing habits
- [ ] Longest streak decreases after undoing a completion
- [ ] History page: rapid toggles don't cause multiple Firestore writes
- [ ] Lint and build pass

## 5. Communication Plan

| Event | Channel |
|-------|---------|
| Preview deployed | GitHub PR comment |
| Merged to prod | GitHub merge notification |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
