# Deployment / Rollout Plan — Theme Settings

## 1. Overview & Goals

Add dark mode and theme selector. Web client only.

## 2. Deployment Steps

1. Merge PR to main
2. CI deploys web client
3. Verify: Settings shows theme selector
4. Verify: Dark mode renders correctly on all pages
5. Verify: System mode follows OS preference

## 3. Rollback Plan

Revert merge commit. Light-only theme returns.

## 4. Go/No-Go Criteria

- [ ] Light theme unchanged from current
- [ ] Dark theme: correct contrast on all pages
- [ ] System theme: follows OS, updates in real-time
- [ ] No flash of wrong theme on reload
- [ ] Theme persists in localStorage
- [ ] Modals, forms, calendar all correct in dark mode
- [ ] Lint and build pass

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Documentation | Initial draft |
