# Technical Spec — Cloud Run Migration

## 1. Summary

Migrate the GraphQL API from Firebase Cloud Functions to Cloud Run. Replace the `firebase_functions` entry point with Flask/Gunicorn. Deploy via GitHub Actions to Artifact Registry → Cloud Run. PR previews via tagged revisions.

## 2. Goals & Non-Goals

### Goals
- Flask/Gunicorn entry point replacing Cloud Functions
- Lightweight production Dockerfile
- CI/CD: build, push, deploy to Cloud Run
- PR tagged revisions with preview URLs
- Cleanup on PR close
- Firestore rules deployed separately

### Non-Goals
- Custom domain
- Cloud Build
- API path versioning

## 3. API Server Changes

### New Entry Point: `api/server.py`

Replace the Cloud Functions handler with a Flask app:

```python
"""Cloud Run entry point for the Indago Habits GraphQL API."""

import json
import os

from flask import Flask, request, jsonify
from firebase_admin import initialize_app
from ariadne import graphql_sync
from ariadne.explorer import ExplorerGraphiQL

from app import create_schema
from app.auth import get_context_value

initialize_app()
schema = create_schema()
explorer = ExplorerGraphiQL()

app = Flask(__name__)

@app.route("/", methods=["GET", "POST", "OPTIONS"])
def graphql_endpoint():
    # CORS preflight
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
        return "", 204, headers

    # GraphiQL
    if request.method == "GET":
        return explorer.html(None), 200, {"Content-Type": "text/html"}

    # GraphQL
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"errors": [{"message": "Invalid JSON"}]}), 400

    context = get_context_value(request)
    success, result = graphql_sync(schema, data, context_value=context)

    headers = {"Access-Control-Allow-Origin": "*"}
    status = 200 if success else 400
    return json.dumps(result), status, {**headers, "Content-Type": "application/json"}

@app.route("/version", methods=["GET"])
def version():
    return jsonify({
        "commit": os.environ.get("GIT_COMMIT", "unknown"),
        "deployedAt": os.environ.get("DEPLOYED_AT", "unknown"),
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
```

### Changes to auth.py

The `get_context_value` function currently accepts a Firebase `https_fn.Request`. Flask uses `werkzeug.Request` which has the same `.headers` interface. The function should work without changes, but we'll type it more generically.

### requirements.txt Changes

```diff
- firebase-functions>=0.1.0
+ flask>=3.0.0
+ gunicorn>=22.0.0
  firebase-admin>=6.4.0
  ariadne>=0.23.0
  pytest>=8.0.0
  pytest-cov>=4.1.0
```

## 4. Dockerfile

### New: `api/Dockerfile.cloudrun`

Lightweight production image (no Firebase CLI, no Java, no emulators):

```dockerfile
# ── Stage 1: Dependencies ──
FROM python:3.12-slim AS deps

WORKDIR /app
COPY functions/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: App ──
FROM deps AS app

COPY functions/ .

ARG GIT_COMMIT=unknown
ARG DEPLOYED_AT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV DEPLOYED_AT=${DEPLOYED_AT}

EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "30", "server:app"]
```

**Size comparison:**
- Current Dockerfile (with Firebase CLI + Java): ~800MB
- New Dockerfile (Python slim + deps): ~150MB

### Existing Dockerfile

Keep the existing `Dockerfile` for local dev and testing (it has Firebase emulators). Rename to `Dockerfile` (keep as-is) — used by `docker compose` for local dev/test.

## 5. CI/CD Workflow

### deploy.yml (rewritten)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  checks: write
  contents: read
  pull-requests: write

env:
  GCP_PROJECT: indego-bc76b
  GCP_REGION: us-central1
  CLOUD_RUN_SERVICE: indego-api
  AR_REPO: us-central1-docker.pkg.dev/indego-bc76b/indego

jobs:
  # ── API: Test ──
  api-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: docker-api-${{ hashFiles('api/Dockerfile', 'api/functions/requirements.txt') }}
          restore-keys: docker-api-
      - name: Build test image
        uses: docker/build-push-action@v6
        with:
          context: api
          load: true
          tags: indago-api:test
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
      - name: Run tests
        run: |
          docker run --rm indago-api:test \
            firebase emulators:exec \
              "pytest functions/tests/ -v" \
              --project demo-indago
      - name: Move cache
        if: always()
        run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache

  # ── API: Build + Push Image ──
  api-build:
    needs: api-test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.meta.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
      - name: Set image tag
        id: meta
        run: |
          SHORT_SHA=$(echo ${{ github.sha }} | cut -c1-7)
          echo "image=${{ env.AR_REPO }}/api:${SHORT_SHA}" >> $GITHUB_OUTPUT
      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: api
          file: api/Dockerfile.cloudrun
          push: true
          tags: ${{ steps.meta.outputs.image }}
          build-args: |
            GIT_COMMIT=${{ github.sha }}
            DEPLOYED_AT=${{ github.event.head_commit.timestamp || github.event.pull_request.updated_at }}

  # ── API: Deploy to Cloud Run ──
  api-deploy:
    needs: api-build
    runs-on: ubuntu-latest
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
      - name: Deploy to Cloud Run (production)
        if: github.event_name == 'push'
        id: deploy
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ env.CLOUD_RUN_SERVICE }}
          region: ${{ env.GCP_REGION }}
          image: ${{ needs.api-build.outputs.image }}
      - name: Deploy to Cloud Run (PR preview)
        if: github.event_name == 'pull_request'
        id: deploy-preview
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ env.CLOUD_RUN_SERVICE }}
          region: ${{ env.GCP_REGION }}
          image: ${{ needs.api-build.outputs.image }}
          tag: pr-${{ github.event.pull_request.number }}
          no_traffic: true
      - name: Output preview URL
        if: github.event_name == 'pull_request'
        run: |
          echo "API Preview URL: ${{ steps.deploy-preview.outputs.url }}" >> $GITHUB_STEP_SUMMARY

  # ── Firestore Rules (production only) ──
  firestore-rules:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api
    steps:
      - uses: actions/checkout@v4
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g firebase-tools
      - run: firebase deploy --only firestore:rules --project indego-bc76b

  # ── Web: Lint + Build ──
  web-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          VITE_GRAPHQL_URL: https://indego-api-PLACEHOLDER-uc.a.run.app
          VITE_FIREBASE_AUTH_DOMAIN: indego-bc76b.firebaseapp.com
          VITE_FIREBASE_PROJECT_ID: indego-bc76b
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_APP_COMMIT: ${{ github.sha }}
          VITE_APP_BRANCH: ${{ github.head_ref || github.ref_name }}

  # ── Web: Deploy ──
  web-deploy:
    needs: [web-test, api-deploy]
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - name: Build for production
        if: github.event_name == 'push'
        run: npm run build
        env:
          VITE_GRAPHQL_URL: ${{ needs.api-deploy.outputs.url }}
          VITE_FIREBASE_AUTH_DOMAIN: indego-bc76b.firebaseapp.com
          VITE_FIREBASE_PROJECT_ID: indego-bc76b
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_APP_COMMIT: ${{ github.sha }}
          VITE_APP_BRANCH: main
      - name: Build for preview
        if: github.event_name == 'pull_request'
        run: npm run build
        env:
          VITE_GRAPHQL_URL: ${{ needs.api-deploy.outputs.url }}
          VITE_FIREBASE_AUTH_DOMAIN: indego-bc76b.firebaseapp.com
          VITE_FIREBASE_PROJECT_ID: indego-bc76b
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_APP_COMMIT: ${{ github.sha }}
          VITE_APP_BRANCH: ${{ github.head_ref }}
      - name: Deploy to Firebase Hosting (production)
        if: github.event_name == 'push'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
          projectId: indego-bc76b
          entryPoint: web
          channelId: live
      - name: Deploy to Firebase Hosting (preview)
        if: github.event_name == 'pull_request'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
          projectId: indego-bc76b
          entryPoint: web
          expires: 7d
```

### cleanup.yml (new)

```yaml
name: Cleanup PR

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
      - name: Delete Cloud Run revision tag
        run: |
          gcloud run services update-traffic indego-api \
            --region us-central1 \
            --remove-tags pr-${{ github.event.pull_request.number }} \
            || true
```

## 6. Local Development

### Updated docker-compose.yml

```yaml
services:
  # Local API server (Flask with hot reload)
  dev:
    build:
      context: .
      dockerfile: Dockerfile.cloudrun
    command: python server.py
    ports:
      - "8080:8080"
    volumes:
      - ./functions:/app
    environment:
      - FLASK_DEBUG=1
      - GIT_COMMIT=local
      - DEPLOYED_AT=local

  # Firebase emulators (Firestore + Auth only, no Functions)
  emulators:
    build: .
    command: firebase emulators:start --only auth,firestore
    ports:
      - "4000:4000"
      - "8081:8080"
      - "9099:9099"
    volumes:
      - ./firebase.json:/app/firebase.json
      - ./firestore.rules:/app/firestore.rules

  # Tests (still use emulators)
  test:
    build: .
    command: firebase emulators:exec "pytest functions/tests/ -v" --project demo-indago
    profiles: ["test"]

  # Lint
  lint:
    build:
      context: .
      dockerfile: Dockerfile.cloudrun
    command: python -m pytest --co -q functions/tests/
    profiles: ["lint"]

  # Firebase CLI (for rules deploy, login, etc.)
  firebase:
    build: .
    entrypoint: firebase
    volumes:
      - ./.firebaserc:/app/.firebaserc
      - firebase-config:/root/.config
    profiles: ["cli"]

volumes:
  firebase-config:
```

## 7. Migration Steps (Ordered)

1. Create `api/server.py` (Flask entry point)
2. Create `api/Dockerfile.cloudrun` (lightweight image)
3. Update `api/functions/requirements.txt` (flask + gunicorn, remove firebase-functions)
4. Update `api/firebase.json` (remove functions config)
5. Verify tests still pass with existing Dockerfile/emulators
6. Update `.github/workflows/deploy.yml` (Cloud Run deploy)
7. Create `.github/workflows/cleanup.yml` (PR revision cleanup)
8. Update web client `VITE_GRAPHQL_URL` (dynamically from CI)
9. **GCP Setup (manual, before merge):**
   - Enable Cloud Run API, Artifact Registry API
   - Create Artifact Registry repo
   - Add IAM roles to service account
10. Merge to main → deploys to Cloud Run
11. Verify production works
12. Delete old Cloud Function via Firebase Console

## 8. Files Changed / Created / Deleted

| Action | File |
|--------|------|
| **Create** | `api/server.py` |
| **Create** | `api/Dockerfile.cloudrun` |
| **Create** | `.github/workflows/cleanup.yml` |
| **Modify** | `api/functions/requirements.txt` |
| **Modify** | `api/functions/main.py` (keep for backwards compat during transition, then delete) |
| **Modify** | `api/firebase.json` (remove functions config) |
| **Modify** | `api/docker-compose.yml` |
| **Modify** | `.github/workflows/deploy.yml` |
| **Modify** | Web client (VITE_GRAPHQL_URL — dynamic from CI) |

## 9. Testing Strategy

- All 26 existing API tests must pass (they test services/repos, not the HTTP layer)
- New integration test: hit the Flask server with a GraphQL query, verify response
- Manual: deploy to Cloud Run, verify GraphQL endpoint works
- Manual: create a test PR, verify tagged revision is accessible
- Manual: close PR, verify tag is cleaned up

## 10. Rollback Plan

- Cloud Run keeps previous revisions. Rollback via:
  ```
  gcloud run services update-traffic indego-api --to-revisions=PREVIOUS_REVISION=100 --region us-central1
  ```
- Or via GCP Console: Cloud Run → indego-api → Revisions → Route traffic

## 11. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | `VITE_GRAPHQL_URL` placeholder in web-test build | Use a dummy URL for lint/build check — actual URL injected in web-deploy |
| 2 | Should `server.py` live at `api/server.py` or `api/functions/server.py`? | `api/functions/server.py` — keeps it alongside the app code that Dockerfile.cloudrun copies |

## 12. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-17 | Documentation | Initial draft |
