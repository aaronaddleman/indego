# Product Requirements Document (PRD) — Cloud Run Migration

## 1. Overview

- **Feature Name:** Cloud Run Migration
- **Problem Statement:** API deploys go straight to production with no preview environment. This blocks any feature requiring API schema changes. Cloud Functions offers no revision management or traffic splitting.
- **Goals:**
  - PR preview environments for the API
  - Versioned deployments with rollback capability
  - Unblock features requiring schema changes (#9 admin UI)
  - Remove Cloud Functions dependency
- **Non-Goals:**
  - Custom domain (deferred)
  - Auto-scaling configuration tuning
  - Multi-region deployment
  - API versioning (v1/v2 paths)

## 2. Background & Context

The project uses Firebase Cloud Functions for the GraphQL API. Cloud Functions deploys overwrite the production function immediately, with no way to preview changes. This became a blocker when implementing the admin allowlist UI (#9), which requires new GraphQL schema additions.

Cloud Run supports tagged revisions, giving each PR its own API URL while production traffic is unaffected.

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| CR-1 | Developer | Preview API changes on a PR | I can test schema changes before they hit production |
| CR-2 | Developer | Roll back the API to a previous version | I can recover quickly from a bad deploy |
| CR-3 | Developer | See PR preview with both web + API changes | I can test the full stack before merging |
| CR-4 | Developer | Have PR API revisions cleaned up automatically | I don't accumulate unused revisions |

## 4. Requirements

### Functional Requirements

#### 4.1 API Server Migration
- Replace Cloud Functions handler with Flask/Gunicorn WSGI app
- Same GraphQL behavior (POST, GET for GraphiQL, CORS)
- Same auth middleware (Firebase token verification + allowlist)
- Serve on port 8080

#### 4.2 Docker Image
- Lightweight production image (Python slim, no Firebase CLI/Java)
- Multi-stage build for caching
- Version info injected as build args or env vars

#### 4.3 CI/CD — PR Workflow
- Build Docker image
- Push to Artifact Registry
- Deploy Cloud Run revision with tag `pr-{number}`
- Pass tagged revision URL to web preview build as `VITE_GRAPHQL_URL`
- Web preview + API preview work together

#### 4.4 CI/CD — Production Workflow (merge to main)
- Build Docker image
- Push to Artifact Registry
- Deploy Cloud Run revision with 100% traffic
- Deploy Firestore rules via Firebase CLI
- Deploy web client to Firebase Hosting (production)

#### 4.5 CI/CD — Cleanup Workflow (PR close)
- Delete the tagged Cloud Run revision
- Triggered by `pull_request: closed`

#### 4.6 Local Development
- Flask dev server with hot reload (replaces Cloud Functions emulator for the API)
- Firebase emulators still used for Firestore and Auth
- Docker Compose updated for new setup

### Non-Functional Requirements

- Cold start < 3s
- Same Firestore latency (co-located in us-central1)
- Free tier cost at current scale
- 99.95% availability (Cloud Run SLA)

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| PR preview API accessible | Tagged revision URL returns GraphQL response |
| Production deploy | New revision serves 100% traffic |
| Rollback | Previous revision can be promoted in < 1 minute |
| PR cleanup | Tagged revision deleted on PR close |
| Existing tests pass | All 26 API tests pass against new server |

## 6. Out of Scope

- Custom domain
- Multi-region
- API path versioning (v1/v2)
- Cloud Build (using GitHub Actions)
- Scaling tuning

## 7. Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | GCP service account missing permissions | Document required roles, verify before deploy |
| 2 | Cold start latency | Acceptable at current scale. Can add min instances later. |
| 3 | Brief downtime during URL switchover | Deploy web + API in same workflow, update URL atomically |
| 4 | Old Cloud Function still running | Delete after migration verified |

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-17 | Discovery/Iteration | Initial draft |
