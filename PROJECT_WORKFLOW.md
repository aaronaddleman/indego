# Project Workflow Instructions

## Overview

This project follows a **4-phase linear workflow** for software development, with feedback loops and two hard approval gates. The phases are:

**Discovery → Iteration → Documentation → Implementation**

---

## Phase 1: Discovery

**Goal:** Understand the problem space, define requirements at a high level, and establish enough clarity to begin building.

**Activities:**
- Gather requirements and constraints
- Define success criteria
- Identify stakeholders and risks
- Scope the project

**Exit:** When there is sufficient clarity to begin Iteration. No hard gate — judgment call by the project lead.

---

## Phase 2: Iteration

**Goal:** Build, explore, and decide on the core architecture and product direction. Produce the ARD and PRD.

**Activities:**
- **Read the consolidated ARD and PRD first** (`docs/web/ARD.md`, `docs/api/ARD.md`, etc.) to understand existing architecture and requirements
- **Check for conflicts** between the new feature and existing decisions
- Develop and refine the **Architecture Requirements Document (ARD)** using the industry-standard ARD template (see below)
- Develop and refine the **Product Requirements Document (PRD)** using the industry-standard PRD template (see below)
- Prototype, spike, and validate technical and product assumptions
- Resolve open questions surfaced during Discovery

**Exit:** 🔒 **Hard Gate — Approval Required (Gate 1)**
- The project lead reviews the completed ARD and PRD
- Approval is recorded in the **Approvals Log** (see below)
- If not approved, team continues iterating or returns to Discovery as needed

---

## Phase 3: Documentation

**Goal:** Produce the full documentation suite required before implementation begins.

**Deliverables:**
- ✅ Architecture Requirements Document (ARD) — finalized from Iteration
- ✅ Product Requirements Document (PRD) — finalized from Iteration
- ✅ Technical Spec / System Design Doc
- ✅ Deployment / Rollout Plan
- ✅ User-Facing Docs / Changelog

All deliverables use the defined templates (see Templates section below).

**Exit:** 🔒 **Hard Gate — Approval Required (Gate 2)**
- The project lead reviews all documentation deliverables against the Gate 2 checklist
- Approval is recorded in the **Approvals Log**
- If not approved, team returns to Documentation or Iteration as needed

---

## Phase 4: Implementation

**Goal:** Build and ship the software based on the approved documentation.

**Activities:**
- Execute against the technical spec and deployment plan
- Keep user-facing docs and changelog current
- Surface issues that require looping back (see Feedback Loops)

**Testing Requirement: Red/Green TDD**

All implementation work follows a strict **Red/Green TDD** process:

1. **Red** — Write tests BEFORE implementation. Tests must fail (proving they test real behavior, not passing by accident). Run the test suite and confirm all new tests fail with expected errors (import errors, missing functions, unknown tools, etc.).

2. **Green** — Implement the minimum code to make all tests pass. Do not write production code without a failing test driving it.

3. **Coverage** — Every test run includes coverage reporting:
   - Terminal output with `--cov` and `--cov-report=term-missing`
   - Persistent HTML + JSON reports saved to `/data/coverage/` for tracking growth across phases
   - Coverage should trend upward or remain stable. Drops are acceptable only when adding new modules with untestable external dependencies (API calls, live services).

4. **Test Isolation** — All tests use temp directories for database state. No test depends on another test's side effects. External services (Claude API, Home Assistant, Ntfy) are mocked.

5. **Phase Boundaries** — Each implementation phase is a commit boundary. Record test count and coverage at each phase to track growth:

   | Phase | Tests | Coverage |
   |-------|-------|----------|
   | (fill in as phases complete) | | |

6. **Docker-First Testing** — Tests run inside Docker containers to match the production environment. Never install dependencies on the host for testing.

**On merge:**
- **Update the consolidated ARD and PRD** (`docs/web/ARD.md`, `docs/api/ARD.md`, etc.) with the feature's architecture decisions and requirements
- Do not just append — resolve conflicts and update existing sections affected by the new feature
- Remove the per-feature ARD.md and PRD.md files (keep tech specs, deployment plans, changelogs as historical records)

**Exit:** Shipping / delivery of the project.

---

## Feedback Loops

At any point during **Iteration**, **Documentation**, or **Implementation**, the team may loop back to:

- **Discovery** — if fundamental assumptions or requirements change
- **Iteration** — if new technical or product decisions need to be made

Looping back does **not** restart a phase from scratch — the team resumes from the point relevant to the issue at hand. However, if changes are substantial enough to affect previously approved gate deliverables, a new approval must be obtained before proceeding forward again.

---

## Approval Process

Both gates use the **same approval process**:

1. **Approver:** Project lead / owner (single approver)
2. **Process:**
   - Review all phase deliverables against the relevant gate checklist (below)
   - Leave written approval or written feedback in the **Approvals Log**
   - Explicitly state any conditions or concerns before greenlighting
3. **Record:** All approvals are recorded in this project's **Approvals Log doc**

### Gate 1 Checklist (Iteration → Documentation)
- [ ] ARD is complete and reviewed
- [ ] PRD is complete and reviewed
- [ ] All open questions from Discovery and Iteration are resolved or documented
- [ ] Technical approach is agreed upon

### Gate 2 Checklist (Documentation → Implementation)
- [ ] Technical Spec / System Design Doc is complete
- [ ] Deployment / Rollout Plan is complete
- [ ] User-Facing Docs / Changelog draft is complete
- [ ] ARD and PRD reflect any changes made during Documentation
- [ ] No unresolved blockers

---

## Templates

### ARD — Architecture Requirements Document (Industry Standard)

```
# Architecture Requirements Document (ARD)

## 1. Overview
- Project name
- Purpose and goals
- Scope

## 2. System Context
- High-level architecture diagram
- External systems and integrations
- Actors / users

## 3. Functional Requirements
- Core capabilities the system must support

## 4. Non-Functional Requirements
- Performance, scalability, availability, security, compliance

## 5. Architecture Decisions
- Key decisions made and rationale (use ADR format where applicable)
- Alternatives considered and why they were rejected

## 6. Data Architecture
- Data models, storage, flows

## 7. Security & Access Control

## 8. Infrastructure & Deployment Overview

## 9. Open Questions / Risks

## 10. Revision History
```

---

### PRD — Product Requirements Document (Industry Standard)

```
# Product Requirements Document (PRD)

## 1. Overview
- Product / feature name
- Problem statement
- Goals and non-goals

## 2. Background & Context
- Why now? What led to this?

## 3. User Stories / Jobs to Be Done
- Who are the users?
- What are they trying to accomplish?

## 4. Requirements
### Functional Requirements
- Feature-by-feature breakdown

### Non-Functional Requirements
- UX, accessibility, performance expectations

## 5. Success Metrics
- How will success be measured?

## 6. Out of Scope

## 7. Dependencies & Risks

## 8. Timeline / Milestones (if known)

## 9. Open Questions

## 10. Revision History
```

---

### Technical Spec / System Design Doc

```
# Technical Spec

## 1. Summary
## 2. Goals & Non-Goals
## 3. Design / Architecture
## 4. API Contracts
## 5. Data Models
## 6. Error Handling & Edge Cases
## 7. Testing Strategy
## 8. Performance Considerations
## 9. Open Questions
## 10. Revision History
```

---

### Deployment / Rollout Plan

```
# Deployment / Rollout Plan

## 1. Overview & Goals
## 2. Environments (dev, staging, prod)
## 3. Deployment Steps
## 4. Rollback Plan
## 5. Feature Flags / Gradual Rollout Strategy
## 6. Monitoring & Alerting
## 7. Go/No-Go Criteria
## 8. Communication Plan
```

---

### User-Facing Docs / Changelog

```
# [Feature / Release Name] — User Documentation

## What's New
- Summary of changes for end users

## How to Use
- Step-by-step instructions

## Known Issues / Limitations

---

# Changelog

## [Version] — [Date]
### Added
### Changed
### Fixed
### Removed
```

---

## Approvals Log

> All gate approvals are recorded here by the project lead.

| Gate | Date | Approver | Decision | Notes |
|------|------|----------|----------|-------|
| Gate 1 (Iteration → Documentation) | 2026-03-11 | Project Lead | Approved | ARD and PRD approved. Key decisions: client-side streaks with server-persisted longest streak, client-side local notifications with server-synced schedules, date-as-doc-ID dedup, user-selected timezone, server-side stats. |
| Gate 2 (Documentation → Implementation) | 2026-03-11 | Project Lead | Approved | Full doc suite approved. Technical Spec, Deployment Plan, and Changelog all consistent with ARD/PRD. Final architecture: all dates UTC, completions as map on habit doc, no updateLongestStreak mutation, simplified project structure, Docker for dev/CI/CD, firebase.json config. |
| Web Client — Gate 1 (Iteration → Documentation) | 2026-03-11 | Project Lead | Approved | Web client ARD and PRD approved. React+Vite PWA, Apollo Client, indigo design, Firebase Hosting. Offline reads only in v1. API schema change planned: logCompletion/undoCompletion return Habit!. Firestore listener invalidates Apollo cache (simple approach for v1). |
| Web Client — Gate 2 (Documentation → Implementation) | 2026-03-11 | Project Lead | Approved | Technical Spec, Deployment Plan, and Changelog complete. Full project structure defined. API schema change (logCompletion/undoCompletion → Habit!) must be deployed first. |
| Habit Detail Fullscreen — Gate 1 (Iteration → Documentation) | 2026-03-15 | Project Lead | Approved | ARD and PRD approved. Fullscreen replaces existing HabitDetailPage. Key decisions: no future-date tapping, history via separate view, delete inside edit form only, no dual nav bar. |
| Habit Detail Fullscreen — Gate 2 (Documentation → Implementation) | 2026-03-15 | Project Lead | Approved | Technical Spec, Deployment Plan, and Changelog complete. New components: WeekStrip, CompleteButton. New route: /habit/:id/history. Delete moved inside HabitForm. |
| Email Allowlist — Gate 1 (Iteration → Documentation) | 2026-03-15 | Project Lead | Approved | ARD and PRD approved. Firestore allowedEmails collection, enforce at API + client, fail closed, allowlist check before upsertUser, Firebase Console management. |
| Email Allowlist — Gate 2 (Documentation → Implementation) | 2026-03-15 | Project Lead | Approved | Technical Spec, Deployment Plan, and Changelog complete. API auth refactor, client AuthGuard + LoginPage checks, RestrictedPage, Firestore rules. Must populate allowedEmails before deploy. |
| Allowlist Signup Fix — Gate 1 (Iteration → Documentation) | 2026-03-15 | Project Lead | Approved | ARD and PRD approved. Fix allowlist check ordering: check after auth, delete account for non-allowed email/password sign-ups. |
| Allowlist Signup Fix — Gate 2 (Documentation → Implementation) | 2026-03-15 | Project Lead | Approved | Technical Spec, Deployment Plan, and Changelog complete. Single file change: LoginPage.tsx. |
| Longest Streak Fix — Gate 1 (Iteration → Documentation) | 2026-03-15 | Project Lead | Approved | ARD and PRD approved. Fix streak calc for all frequency types, persist longestStreak via Firestore transaction, backfill on load, deferred write on history page, always accurate (recompute on undo). |
| Longest Streak Fix — Gate 2 (Documentation → Implementation) | 2026-03-15 | Project Lead | Approved | Technical Spec, Deployment Plan, and Changelog complete. New streakCalc.ts (pure functions), useStreak returns {current, longest}, useLongestStreakSync hook, deferred write via ref on history page. |
| Streak Sync Fix — Gate 1 (Iteration → Documentation) | 2026-03-16 | Project Lead | Approved | Fix stale Apollo cache comparison in useLongestStreakSync. Use local ref tracking instead. |
| Streak Sync Fix — Gate 2 (Documentation → Implementation) | 2026-03-16 | Project Lead | Approved | 2 files changed. Local ref tracks last written value, skip unnecessary Firestore calls. |
| Simplified Detail View — Gate 1 (Iteration → Documentation) | 2026-03-16 | Project Lead | Approved | ARD and PRD approved. Tabbed modal (Settings + History), tappable month/year pickers, remove history page route. Slide-to-complete deferred to iOS. |
| Simplified Detail View — Gate 2 (Documentation → Implementation) | 2026-03-16 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. TabbedModal, MonthPicker, YearPicker components. HabitForm extracted for tab use. Delete HabitHistoryPage. |
| Theme Settings — Gate 1 (Iteration → Documentation) | 2026-03-16 | Project Lead | Approved | ARD and PRD approved. Light/Dark/System themes, CSS variable overrides, localStorage, System default. |
| Theme Settings — Gate 2 (Documentation → Implementation) | 2026-03-16 | Project Lead | Approved | Technical Spec complete. Dark token overrides, useTheme hook, inline script for no-flash, theme selector in Settings. |
| Cloud Run Migration — Gate 1 (Iteration → Documentation) | 2026-03-17 | Project Lead | Approved | ARD and PRD approved. Cloud Functions → Cloud Run, Flask + Gunicorn, tagged revisions for PR previews, Artifact Registry, cleanup workflow. |
| Cloud Run Migration — Gate 2 (Documentation → Implementation) | 2026-03-17 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. server.py entry point, Dockerfile.cloudrun, CI/CD rewrite, /health endpoint, GCP setup steps documented. |
| Admin Allowlist UI — Gate 1 (Iteration → Documentation) | 2026-03-18 | Project Lead | Approved | ARD and PRD approved. /admin route, require_admin middleware, GraphQL schema additions, self-removal + last-admin protection, admin detection via Firestore isAdmin. |
| Admin Allowlist UI — Gate 2 (Documentation → Implementation) | 2026-03-18 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. 14 files total. Pre-deploy: add isAdmin to own email doc. |
| Timezone Fix — Gate 1 (Iteration → Documentation) | 2026-03-18 | Project Lead | Approved | ARD and PRD approved. Fix UTC date bug in HabitCard, centralize getLocalDate() helper, add unit tests for dates and streaks, CI integration. |
| Timezone Fix — Gate 2 (Documentation → Implementation) | 2026-03-18 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. New utils/date.ts, unit tests, CI npm test step. |
| Frequency Redesign — Gate 1 (Iteration → Documentation) | 2026-03-19 | Project Lead | Approved | Merge WEEKLY+CUSTOM, computed dueDays, shared frequency service, backwards compatible, CUSTOM deprecated. |
| Frequency Redesign — Gate 2 (Documentation → Implementation) | 2026-03-19 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. 11 files. Schema additive, no forced migration. |
| Kinetic Sanctuary Redesign — Gate 1 (Iteration → Documentation) | 2026-03-22 | Project Lead | Approved | Full UI redesign. 5 phases: A (foundation), B (today), C (history), D (streaks), E (settings). Green palette, Plus Jakarta Sans, bottom nav, tonal layering. |
| Kinetic Sanctuary Redesign — Gate 2 (Documentation → Implementation) | 2026-03-22 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. Phase A ready for implementation. |
| Reminders v1 — Gate 1 (Iteration → Documentation) | 2026-03-28 | Project Lead | Approved | Client-side only via Service Worker. No server cost. Re-schedule on app load. Permission on first toggle. |
| Reminders v1 — Gate 2 (Documentation → Implementation) | 2026-03-28 | Project Lead | Approved | Technical Spec complete. SW notifications via importScripts, useReminderScheduler hook, PermissionWarning. |
| Tasks & Lists — Gate 1 (Iteration → Documentation) | 2026-03-28 | Project Lead | Approved | ARD and PRD approved. Flat parentId model, GQL-friendly schema, P1-P4 priority, Inbox + custom lists, markdown descriptions. |
| Tasks & Lists — Gate 2 (Documentation → Implementation) | 2026-03-28 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. 4 phases: API, nav restructure, task views, subtasks. |
| API Key Auth — Gate 1 (Iteration → Documentation) | 2026-04-05 | Project Lead | Approved | ARD and PRD approved. SHA-256 hashed keys, indego_ prefix, apiKeys/{hash} collection, single canManageApiKeys permission flag, 60 req/min rate limit, Bearer OR X-API-Key middleware, max 2 keys per user with expiration. RBAC deferred (issue #29). |
| API Key Auth — Gate 2 (Documentation → Implementation) | 2026-04-05 | Project Lead | Approved | Technical Spec, Deployment Plan, Changelog complete. Dual-path auth middleware, 3 new layered files (resolver/service/repo) + rate limit repo, 15 unit + 8 integration tests planned, CORS update, pre-deploy Firestore flag required. |
