# Indago

## Project Workflow

This project follows a **4-phase linear workflow**: Discovery → Iteration → Documentation → Implementation.

See [PROJECT_WORKFLOW.md](PROJECT_WORKFLOW.md) for the full workflow definition, templates, gate checklists, and approvals log.

### Key Rules
- **Gate 1** (Iteration → Documentation): ARD + PRD must be approved before documentation phase begins.
- **Gate 2** (Documentation → Implementation): Full doc suite must be approved before coding begins.
- Feedback loops allow returning to earlier phases without restarting them.
- All approvals are recorded in the Approvals Log section of PROJECT_WORKFLOW.md.

## Document Storage

All project documents (ARD, PRD, Technical Spec, Deployment Plan, User Docs, Changelog) are stored in [`docs/`](docs/).

| Document | Path |
|----------|------|
| Architecture Requirements Document | `docs/ARD.md` |
| Product Requirements Document | `docs/PRD.md` |
| Technical Spec / System Design | `docs/TECHNICAL_SPEC.md` |
| Deployment / Rollout Plan | `docs/DEPLOYMENT_PLAN.md` |
| User-Facing Docs / Changelog | `docs/CHANGELOG.md` |

## Conventions
- Follow templates defined in PROJECT_WORKFLOW.md when creating documents.
- Do not begin implementation without Gate 2 approval.
- When generating or updating docs, always write to the `docs/` directory.
