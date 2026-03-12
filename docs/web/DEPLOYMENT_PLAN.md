# Deployment / Rollout Plan — Indago Web Client

## 1. Overview & Goals

Deploy the Indago web client as a static PWA on Firebase Hosting, sharing the same Firebase project (`indego-bc76b`) as the API. The web client is built with Vite and deployed as static files (HTML, JS, CSS).

**Goals:**
- Static file deployment via Firebase Hosting with CDN
- Automated builds and deploys via CI/CD
- Preview deployments for pull requests
- PWA with offline support and installability
- Zero-downtime deploys (Firebase Hosting handles this natively)

## 2. Environments

| Environment | Hosting | Purpose |
|-------------|---------|---------|
| **local** | Vite dev server (`localhost:5173`) | Development with HMR |
| **preview** | Firebase Hosting preview channel | PR review — auto-deployed, auto-expired |
| **prod** | Firebase Hosting (`indego-bc76b`) | Live user traffic |

### Environment Variables

Managed via `.env` files (not committed) and Vite's `import.meta.env`:

| Variable | Local | Preview | Prod |
|----------|-------|---------|------|
| `VITE_GRAPHQL_URL` | `http://localhost:5001/demo-indago/us-central1/graphql` | `https://us-central1-indego-bc76b.cloudfunctions.net/graphql` | `https://us-central1-indego-bc76b.cloudfunctions.net/graphql` |
| `VITE_FIREBASE_API_KEY` | (from Firebase Console) | Same | Same |
| `VITE_FIREBASE_AUTH_DOMAIN` | `indego-bc76b.firebaseapp.com` | Same | Same |
| `VITE_FIREBASE_PROJECT_ID` | `demo-indago` (emulator) | `indego-bc76b` | `indego-bc76b` |

Note: Firebase config values are safe to expose in client code — they are identifiers, not secrets. Security is enforced by Firestore rules and Auth.

## 3. Deployment Steps

### Prerequisites
- Node.js 20+ installed locally (or use Docker)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Access to Firebase project `indego-bc76b`
- Firebase Hosting configured in the project

### Firebase Hosting Setup (one-time)

Add hosting config to the project's `firebase.json` (in `api/` directory, or create a root-level one):

```json
{
  "hosting": {
    "public": "web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|map)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" }
        ]
      }
    ]
  }
}
```

### Local Development

```bash
cd web/

# Install dependencies
npm install

# Start dev server with HMR
npm run dev
# → http://localhost:5173

# Run against local API emulators (start from api/ directory first)
# cd ../api && docker compose up emulators
```

### Build

```bash
cd web/

# Production build
npm run build
# → outputs to web/dist/

# Preview production build locally
npm run preview
```

### Deploy to Production

```bash
# From repo root
cd web && npm run build
firebase deploy --only hosting --project indego-bc76b
```

### Deploy Preview (for PRs)

```bash
firebase hosting:channel:deploy pr-$(git branch --show-current) --project indego-bc76b --expires 7d
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/web.yml
name: Web Client

on:
  push:
    branches: [main]
    paths: ['web/**']
  pull_request:
    branches: [main]
    paths: ['web/**']

jobs:
  test:
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
      - run: npm run test
      - run: npm run build

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
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
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: indego-bc76b
          entryPoint: web

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
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
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: indego-bc76b
          channelId: live
          entryPoint: web
```

## 4. Rollback Plan

Firebase Hosting keeps previous deployments. To rollback:

### Via Firebase Console
1. Go to Firebase Console → Hosting
2. Click "Release history"
3. Select the previous release → "Rollback"

### Via CLI
```bash
# List recent releases
firebase hosting:releases:list --project indego-bc76b

# Rollback by redeploying previous build
git checkout <previous-commit>
cd web && npm run build
firebase deploy --only hosting --project indego-bc76b
```

Rollback is instant — Firebase Hosting switches the CDN to serve the previous release.

## 5. Feature Flags / Gradual Rollout Strategy

For v1, no feature flags. Future considerations:

- **Firebase Remote Config** for client-side feature flags (e.g., enable/disable notifications, new UI components)
- **Preview channels** for testing new features with stakeholders before production

## 6. Monitoring & Alerting

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| Lighthouse scores | Lighthouse CI in GitHub Actions | PWA score < 90 |
| JavaScript errors | Browser console + future error tracking (Sentry) | Setup in v2 |
| Hosting bandwidth | Firebase Console | Monitor — no alert for v1 |
| Page load performance | Firebase Performance Monitoring SDK (optional) | FCP > 3s |

### Logging
- Client-side errors logged to console in v1
- Future: integrate error reporting service (Sentry, Firebase Crashlytics for web)

## 7. Go/No-Go Criteria

### Before deploying to production:

- [ ] All tests pass (unit + component + E2E)
- [ ] Lighthouse PWA score > 90
- [ ] Lighthouse Accessibility score > 90
- [ ] App installs as PWA on Chrome, Safari
- [ ] Auth flow works (Google Sign-In, email/password)
- [ ] All CRUD operations work against production API
- [ ] Offline reads work (disconnect → habits still visible)
- [ ] Streak calculation matches expected values
- [ ] Calendar views (month + week) render correctly
- [ ] Mobile responsive — tested on 375px and 768px viewports
- [ ] Service Worker caches app shell
- [ ] API schema change deployed (`logCompletion`/`undoCompletion` return `Habit!`)
- [ ] Firebase Hosting headers configured (caching, security)
- [ ] No secrets in client bundle

## 8. Communication Plan

| Event | Channel | Audience |
|-------|---------|---------|
| PR preview deployed | GitHub PR comment (automatic) | Reviewers |
| Production deploy | GitHub release | Dev team |
| Incident / rollback | TBD (Slack / email) | Dev team |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Documentation | Initial draft |
