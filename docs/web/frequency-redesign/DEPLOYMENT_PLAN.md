# Deployment / Rollout Plan — Frequency Redesign

## 1. Overview

Redesign frequency types. API schema change (additive) + web client updates. Backwards compatible — no forced migration.

## 2. Deployment Steps

1. PR deploys API to Cloud Run preview (new schema with dueDays)
2. PR deploys web preview pointing at preview API
3. Test: create new WEEKLY habit with specific days
4. Test: existing habits still display and work
5. Merge → production deploy
6. Verify production

## 3. Rollback Plan

Schema changes are additive (new fields). Revert merge commit — old fields still work.

## 4. Go/No-Go Criteria

- [ ] New WEEKLY habit with daysOfWeek creates and displays correctly
- [ ] Existing DAILY habits unaffected
- [ ] Existing CUSTOM habits work with legacy fields
- [ ] Existing WEEKLY (daysPerWeek) habits work with legacy fields
- [ ] dueDays computed correctly for all types
- [ ] HabitForm day picker works (select, deselect, minimum 1)
- [ ] Streak calculations correct for new and legacy models
- [ ] All unit tests pass
- [ ] Lint and build pass

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-19 | Documentation | Initial draft |
