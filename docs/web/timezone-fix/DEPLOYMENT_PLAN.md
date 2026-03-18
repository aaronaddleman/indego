# Deployment / Rollout Plan — Timezone Fix

## 1. Overview

Fix UTC date bug and add unit tests to CI.

## 2. Deployment Steps

1. Merge PR to main
2. CI runs tests + lint + build + deploy
3. Verify: complete a habit late at night → correct date

## 3. Go/No-Go Criteria

- [ ] All unit tests pass
- [ ] Lint passes
- [ ] Build passes
- [ ] HabitCard uses getLocalDate()
- [ ] All date computations use getLocalDate()
- [ ] CI web-test job includes npm test

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Documentation | Initial draft |
