# Deployment / Rollout Plan — Tasks & Lists

## 1. Overview & Goals

Roll out tasks in 4 phases, each as a separate PR. API changes deploy first, then web changes. Each phase is independently deployable and doesn't break existing functionality.

## 2. Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| PR Preview | `indego-bc76b--pr{N}-*.web.app` | Per-PR preview for testing |
| Production | `indego-bc76b.web.app` | Live site |
| API | `https://us-central1-indego-bc76b.cloudfunctions.net/graphql` | Cloud Run |

## 3. Deployment Steps

### Phase 1: API + Data Model
1. Add GraphQL schema types, resolvers, services, repositories
2. Add Firestore security rules for `tasks` and `lists` collections
3. Add API tests
4. PR → preview → test via GraphiQL → merge → auto-deploy

### Phase 2: Navigation Restructure
1. Replace BottomNav with TopNav + HabitSubNav
2. Update routes (/habits/*, /tasks/*, /settings)
3. Verify all existing habit flows still work
4. PR → preview → puppeteer test → merge

### Phase 3: Task Views
1. Add task pages, components, forms
2. Install `react-markdown` dependency
3. Add GraphQL queries and mutations to web client
4. PR → preview → test create/edit/complete/delete → merge

### Phase 4: Subtasks & Organization
1. Add nesting UI, sort controls, list management, move tasks
2. PR → preview → test subtasks, sorting, list operations → merge

## 4. Rollback Plan

Each phase is a separate PR merge. Rollback = revert the merge commit.

- Phase 1 (API): revert removes new schema types. Existing habits unaffected.
- Phase 2 (Nav): revert restores old BottomNav. No data changes.
- Phase 3 (Tasks UI): revert removes task pages. API still has the endpoints (harmless).
- Phase 4 (Subtasks): revert removes nesting/sort UI. Tasks still work flat.

## 5. Feature Flags / Gradual Rollout

No feature flags needed. Each phase is additive:
- Phase 1 adds API endpoints nobody calls yet
- Phase 2 changes nav but all existing routes still work
- Phase 3 adds new pages at new routes
- Phase 4 enhances existing task views

## 6. Monitoring & Alerting

- Cloud Run error rate dashboard (existing)
- Check API logs for new resolver errors after Phase 1
- Puppeteer screenshots after each phase deploys

## 7. Go/No-Go Criteria

| Phase | Go Criteria |
|-------|-------------|
| 1 | API tests pass, GraphiQL queries work, habits unaffected |
| 2 | All habit pages render, nav switching works, puppeteer verification |
| 3 | Task CRUD works end-to-end, markdown renders, themes look correct |
| 4 | Subtasks nest/complete/delete correctly, sort works, lists manageable |

## 8. Communication Plan

- No user-facing announcement until Phase 3 ships (tasks visible in nav)
- Changelog updated after Phase 4 completes
