# Deployment / Rollout Plan — Indago Habits API

## 1. Overview & Goals

Deploy the Indago Habits GraphQL API as a Cloud Function for Firebase, backed by Firestore and Firebase Auth. The deployment strategy prioritizes simplicity for v1 with clear separation between environments.

**Goals:**
- Reproducible, automated deployments via CI/CD
- Dockerized local development and CI for environment parity
- Environment isolation (dev/staging/prod are separate Firebase projects)
- Zero-downtime deploys (Cloud Functions handles this natively)
- Easy rollback

## 2. Environments

| Environment | Firebase Project | Purpose | Access |
|-------------|-----------------|---------|--------|
| **dev** | `indago-dev` | Local development + shared dev testing | Developers only |
| **staging** | `indago-staging` | Pre-production validation, integration tests | Developers + QA |
| **prod** | `indago-prod` | Live user traffic | All users |

### Environment Configuration

Each environment uses a separate Firebase project with its own:
- Firestore database
- Firebase Auth tenant
- Cloud Functions deployment
- `.firebaserc` aliases

```json
// .firebaserc
{
  "projects": {
    "dev": "indago-dev",
    "staging": "indago-staging",
    "prod": "indago-prod"
  }
}
```

### Environment Variables

Managed via Firebase Functions config (not committed to git):

| Variable | Description |
|----------|------------|
| `ENVIRONMENT` | `dev`, `staging`, or `prod` |
| `MIN_INSTANCES` | `0` for dev/staging, `1` for prod |
| `LOG_LEVEL` | `DEBUG` for dev, `INFO` for staging/prod |

## 3. Deployment Steps

### Prerequisites
- Docker and Docker Compose installed
- Access to all three Firebase projects
- Firebase token for CI (`firebase login:ci` → store as `FIREBASE_TOKEN` secret)

### Local Development (Docker)

```bash
# Start Firebase Emulators with hot reload (Firestore + Auth + Functions)
docker compose up emulators

# Emulator UI available at http://localhost:4000
# GraphQL endpoint at http://localhost:5001/demo-indago/us-central1/graphql

# Run tests in isolated container
docker compose run --rm test
```

### Local Development (without Docker)

```bash
# Install dependencies
cd functions && pip install -r requirements.txt

# Start Firebase Emulators (Firestore + Auth + Functions)
firebase emulators:start

# Run tests against emulators
pytest tests/
```

### Deploy to Dev

```bash
firebase use dev
firebase deploy --only functions,firestore:rules
```

### Deploy to Staging

```bash
firebase use staging
firebase deploy --only functions,firestore:rules
```

### Deploy to Production

```bash
firebase use prod
firebase deploy --only functions,firestore:rules
```

### Deploy from Docker (manual)

```bash
# Deploy to staging
docker compose run --rm -e FIREBASE_TOKEN=$FIREBASE_TOKEN emulators \
  firebase deploy --only functions,firestore:rules --project staging

# Deploy to production
docker compose run --rm -e FIREBASE_TOKEN=$FIREBASE_TOKEN emulators \
  firebase deploy --only functions,firestore:rules --project prod
```

### CI/CD Pipeline (GitHub Actions + Docker)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose run --rm test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose run --rm -e FIREBASE_TOKEN=${{ secrets.FIREBASE_TOKEN }} emulators firebase deploy --only functions,firestore:rules --project staging

  deploy-prod:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub
    steps:
      - uses: actions/checkout@v4
      - run: docker compose run --rm -e FIREBASE_TOKEN=${{ secrets.FIREBASE_TOKEN }} emulators firebase deploy --only functions,firestore:rules --project prod
```

### Firestore Security Rules

Deployed alongside functions. Rules enforce per-user data isolation:

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4. Rollback Plan

### Cloud Functions Rollback

Cloud Functions keeps previous versions. To rollback:

```bash
# List recent deployments
gcloud functions list --project=indago-prod

# Rollback to previous version via redeployment
git checkout <previous-commit>
docker compose run --rm -e FIREBASE_TOKEN=$FIREBASE_TOKEN emulators \
  firebase deploy --only functions --project prod
```

### Firestore Rules Rollback

```bash
# Revert to previous rules
git checkout <previous-commit> -- firestore.rules
docker compose run --rm -e FIREBASE_TOKEN=$FIREBASE_TOKEN emulators \
  firebase deploy --only firestore:rules --project prod
```

### Data Rollback

Firestore supports point-in-time recovery (PITR) for up to 7 days:

```bash
# Export Firestore data (backup before risky operations)
gcloud firestore export gs://indago-prod-backups/$(date +%Y%m%d)
```

## 5. Feature Flags / Gradual Rollout Strategy

For v1, no feature flags — the API ships as a complete unit. Future considerations:

- **Firebase Remote Config** can be used for client-side feature flags
- **Gradual rollout** is not applicable to a single Cloud Function endpoint (all-or-nothing deploy)
- If needed, version the API via the GraphQL schema (additive changes only — new fields, new queries)

## 6. Monitoring & Alerting

### Built-in Firebase Monitoring

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| Function errors | Cloud Functions logs | > 5% error rate over 5 min |
| Function latency | Cloud Functions logs | p95 > 500ms |
| Firestore reads/writes | Firebase Console | > 10,000 reads/day (cost alert) |
| Auth sign-ups | Firebase Auth dashboard | Anomaly detection (spike = potential abuse) |

### Logging

- **Structured logging** via Python `logging` module → Cloud Logging
- Log level: `DEBUG` in dev, `INFO` in staging/prod
- All errors logged with request context (user_id, operation, timestamp)
- **No PII in logs** — log user IDs, not emails or display names

### Dashboards

- **Firebase Console:** Built-in function metrics, Firestore usage, Auth stats
- **Cloud Logging:** Custom log-based metrics for business events (habit created, completion logged)
- **Alerts:** Configure via Cloud Monitoring → email/Slack notifications

## 7. Go/No-Go Criteria

### Before deploying to production:

- [ ] All tests pass (unit + integration against emulator)
- [ ] Staging deployment verified — manual smoke test of all queries/mutations
- [ ] Firestore security rules tested (cannot access other users' data)
- [ ] Auth flow tested with all providers (email/password, Apple, Google)
- [ ] Error handling verified (invalid inputs return correct error codes)
- [ ] Cloud Function memory/timeout configured (256MB, 60s timeout)
- [ ] `min_instances=1` set for prod to mitigate cold starts
- [ ] Firestore indexes created for date-range queries on completions
- [ ] PITR enabled on prod Firestore

## 8. Communication Plan

| Event | Channel | Audience |
|-------|---------|---------|
| Deployment to staging | GitHub PR / commit message | Dev team |
| Deployment to production | GitHub release + changelog | Dev team |
| Incident / rollback | TBD (Slack / email) | Dev team |
| API changes (breaking) | Changelog + client team notification | All stakeholders |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Documentation | Initial draft |
| 2026-03-11 | Documentation | Added Docker support: Dockerfile, docker-compose.yml, Docker-based CI/CD and deploy commands |
