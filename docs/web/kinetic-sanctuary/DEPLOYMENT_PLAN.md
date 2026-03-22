# Deployment / Rollout Plan — Kinetic Sanctuary Redesign

## 1. Overview

Complete UI redesign deployed in 5 sequential PRs. Each phase builds on the previous.

## 2. Phase Order

| Phase | PR | Description | Dependencies |
|-------|-----|-------------|-------------|
| A | Foundation | Tokens, fonts, bottom nav, surface layering | None |
| B | Today | Dashboard redesign with progress ring + day filter | Phase A |
| C | History | Heatmap, stats, habit breakdown | Phase A |
| D | Streaks | Streak detail, chain visualization | Phase A, streak calc |
| E | Settings + Polish | Settings redesign, final polish, dark mode pass | Phase A |

## 3. Per-Phase Deployment

Each phase:
1. PR with preview deploy
2. Test on mobile (primary target)
3. Verify dark mode + IDE themes
4. Merge → production deploy
5. Clear cache & verify

## 4. Rollback

Each phase is a separate PR. Revert the specific merge commit to roll back that phase.

## 5. Go/No-Go (Phase A)

- [ ] Green palette renders correctly
- [ ] Plus Jakarta Sans loads
- [ ] Bottom nav works (Today/History/Streaks/Settings)
- [ ] Material Symbols icons display
- [ ] No borders on cards (tonal layering only)
- [ ] Dark mode works with green palette
- [ ] IDE themes unaffected
- [ ] Existing functionality unchanged

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-22 | Documentation | Initial draft |
