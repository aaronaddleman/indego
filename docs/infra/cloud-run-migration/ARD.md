# Architecture Requirements Document (ARD) — Cloud Run Migration

## 1. Overview

- **Project Name:** Migrate API from Cloud Functions to Cloud Run
- **Purpose:** Enable versioned API deployments with PR preview environments. Replace Firebase Cloud Functions with Cloud Run for better deployment control, revision management, and traffic splitting.
- **Goals:**
  - API deploys as Cloud Run revisions with tagged URLs for PR previews
  - Web preview builds point at the PR's API revision
  - Production traffic served by the latest production revision
  - PR cleanup on close (delete tagged revision)
  - Unblock features requiring API schema changes (#9)
  - Full removal of Cloud Functions
- **Scope:** API deployment infrastructure, CI/CD pipeline, web client GraphQL URL configuration.

## 2. System Context

### Current Architecture

```
GitHub Actions
  └── firebase deploy --only functions
        └── Cloud Functions (graphql)
              └── Firestore

Web Client → https://us-central1-indego-bc76b.cloudfunctions.net/graphql
```

### Target Architecture

```
GitHub Actions
  ├── docker build + push → Artifact Registry
  └── gcloud run deploy → Cloud Run (graphql)
        └── Firestore

Production:
  Web Client → https://graphql-{hash}-uc.a.run.app  (or custom domain)

PR Preview:
  Web Preview → https://pr-123---graphql-{hash}-uc.a.run.app  (tagged revision)
```

### Affected Components

```
api/
├── Dockerfile.cloudrun          ← New: lightweight production image
├── main.py (or app_server.py)   ← New: Flask/Gunicorn entry point (replaces Cloud Functions handler)
├── functions/                   ← Rename to app source (no longer "functions")
│   ├── main.py                  ← Modify: remove firebase_functions dependency
│   └── requirements.txt         ← Modify: replace firebase-functions with flask/gunicorn
├── firebase.json                ← Modify: remove functions config, keep firestore rules only
└── docker-compose.yml           ← Modify: update for new image

.github/workflows/
├── deploy.yml                   ← Rewrite: Cloud Run deploy instead of firebase deploy
└── cleanup.yml                  ← New: delete PR revision on PR close

web/
└── (VITE_GRAPHQL_URL updated to Cloud Run URL)
```

## 3. Functional Requirements

### API Server
- Replace `@https_fn.on_request()` with a standard Flask WSGI app
- Serve on port 8080 (Cloud Run default)
- Same CORS, GraphiQL, and GraphQL handling
- Firebase Admin SDK initialized on startup
- Version info from environment variables (injected at deploy time)

### Cloud Run Service
- Service name: `indego-api`
- Region: `us-central1` (co-located with Firestore)
- Allow unauthenticated invocations (app handles auth via Firebase tokens)
- Min instances: 0 (scale to zero when idle)
- Max instances: 10 (sufficient for current scale)
- Memory: 256MB
- CPU: 1

### PR Preview Revisions
- On PR: deploy a tagged revision (tag: `pr-{number}`)
- Tagged revision gets a unique URL: `https://pr-{number}---indego-api-{hash}-uc.a.run.app`
- Web preview build receives this URL as `VITE_GRAPHQL_URL`
- Tagged revisions receive 0% of production traffic (only accessible via tag URL)

### Production Deploy
- On merge to main: deploy a new revision with 100% traffic
- Previous revisions kept for rollback (Cloud Run retains them)

### Cleanup
- On PR close: delete the tagged revision
- Separate workflow triggered by `pull_request: closed`

### Firestore Rules
- Deployed separately via Firebase CLI (lightweight step, no functions)
- Only runs on push to main (same as current behavior)

## 4. Non-Functional Requirements

- **Cold start:** Cloud Run cold starts ~1-2s for Python. Acceptable for current usage.
- **Latency:** Co-located with Firestore in us-central1. No increase vs Cloud Functions.
- **Cost:** Within free tier at current scale. Idle revisions cost nothing.
- **Availability:** Cloud Run provides 99.95% SLA.
- **Security:** Same Firebase Auth token verification. Service account for Firestore access.

## 5. Architecture Decisions

### AD-CR1: Flask + Gunicorn for WSGI
- **Decision:** Replace `firebase_functions` with Flask for the HTTP layer, served by Gunicorn in production.
- **Rationale:** Flask is lightweight, well-supported, and Ariadne has built-in Flask integration. Gunicorn handles concurrent requests efficiently. The existing GraphQL handler maps directly to a Flask route.

### AD-CR2: Artifact Registry for Docker images
- **Decision:** Store production Docker images in GCP Artifact Registry (us-central1).
- **Rationale:** Native integration with Cloud Run. Faster pulls than external registries. IAM-based access control.

### AD-CR3: Tagged revisions for PR previews
- **Decision:** Use Cloud Run revision tags (not separate services) for PR previews.
- **Rationale:** Tags share the same service configuration, use the same Firestore database, and cost nothing when idle. Each tag gets a unique URL. Simple to create and delete.

### AD-CR4: Full removal of Cloud Functions
- **Decision:** Remove the `firebase_functions` dependency and Cloud Functions deployment entirely.
- **Rationale:** Maintaining two deployment targets adds complexity. Cloud Run is strictly better for our needs.

### AD-CR5: Firestore rules deployed separately
- **Decision:** Keep `firebase deploy --only firestore:rules` as a separate CI step on merge to main.
- **Rationale:** Firestore rules are independent of the API runtime. Firebase CLI is the only way to deploy them. Lightweight step, no Docker needed.

### AD-CR6: Build in GitHub Actions, not Cloud Build
- **Decision:** Build Docker images in GitHub Actions and push to Artifact Registry.
- **Rationale:** Already have CI infrastructure in GitHub Actions. Avoids adding Cloud Build as another GCP service. Docker Buildx caching works well in Actions.

## 6. Data Architecture

No data model changes. Same Firestore database, same collections, same security rules.

## 7. Security & Access Control

- Cloud Run service allows unauthenticated HTTP requests (CORS + Firebase Auth handled in app)
- Service account used by Cloud Run to access Firestore (same permissions as Cloud Functions)
- Artifact Registry access controlled via IAM
- No secrets in Docker images — injected as Cloud Run environment variables or via Secret Manager

## 8. Infrastructure & Deployment Overview

### GCP Resources (new)
- Artifact Registry repository: `us-central1-docker.pkg.dev/indego-bc76b/indego`
- Cloud Run service: `indego-api` in `us-central1`

### GCP Resources (removed)
- Cloud Function: `graphql` (deleted after migration verified)

### GitHub Secrets (updated)
- `GCP_SERVICE_ACCOUNT_KEY` — needs additional roles (Cloud Run Admin, Artifact Registry Writer)

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | Custom domain for Cloud Run API? | Deferred — use default .run.app URL for v1 |
| 2 | Cloud Run cold start latency | Accepted — ~1-2s for Python, sufficient for current scale |
| 3 | Migration window — brief period where old URL stops working | Mitigated — update web client URL in same deploy |
| 4 | Emulators for local dev — still use Firebase emulators? | Yes — emulators still work for Firestore/Auth. Local Flask dev server replaces functions emulator |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-17 | Discovery/Iteration | Initial draft |
