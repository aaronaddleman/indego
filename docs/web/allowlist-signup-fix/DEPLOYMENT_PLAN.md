# Deployment / Rollout Plan — Allowlist Signup Fix

## 1. Overview & Goals

Fix the allowlist signup flow. Web client change only — no API or infrastructure changes.

## 2. Deployment Steps

1. Merge PR to main
2. CI deploys web client to production
3. Verify: sign up with allowed email/password works
4. Verify: non-allowed email/password shows restricted page

## 3. Rollback Plan

Revert the merge commit — previous behavior (broken email/password) returns. Google sign-in is unaffected.

## 4. Go/No-Go Criteria

- [ ] Allowed email/password sign-up works
- [ ] Non-allowed sign-up shows restricted page
- [ ] No orphan Firebase Auth account after non-allowed sign-up
- [ ] Google sign-in still works

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
