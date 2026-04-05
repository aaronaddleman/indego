# Indago — Habits Tracker

## Project Structure (Monorepo)

```
indago/
├── api/                       # Firebase backend
│   ├── functions/             # GraphQL API (Python/Ariadne on Firebase Cloud Functions)
│   │   ├── schema.graphql     # ← Single source of truth for the API contract
│   │   ├── main.py            # Cloud Function entry point
│   │   └── app/               # Layered: transport → services → repositories
│   ├── Dockerfile             # Build/test/deploy image
│   ├── docker-compose.yml     # Local dev (emulators), tests, Firebase CLI
│   ├── firebase.json          # Firebase config
│   └── firestore.rules        # Firestore security rules
├── ios/                       # iOS client (SwiftUI) — planned
├── web/                       # Web client — planned
├── docs/                      # Project documentation (ARD, PRD, specs)
└── PROJECT_WORKFLOW.md        # Workflow definition and gate approvals
```

## Key Architecture Decisions

- **GraphQL API** (schema-first with Ariadne) — `api/functions/schema.graphql` is the contract
- **Firebase**: Cloud Functions (Python 3.12), Firestore (Native mode), Firebase Auth
- **All dates UTC** — server is timezone-agnostic, clients handle conversion
- **Completions** stored as a map on the habit document (date string → UTC timestamp)
- **Streaks**: current streak computed client-side, longest streak written directly to Firestore by clients
- **Reminders**: schedules stored in Firestore (UTC), clients schedule local notifications
- **Layered architecture** (Transport → Service → Repository) for future Scala/Cloud Run migration
- **Docker** for all local dev, testing, and deployment

## Firebase Project

- Project ID: `indego-bc76b`
- Region: `us-central1`
- GraphQL endpoint: `https://us-central1-indego-bc76b.cloudfunctions.net/graphql`

## Docker Commands

All Docker commands run from the `api/` directory:

```bash
cd api/

# Run tests
docker compose run --rm test

# Start local emulators (hot reload)
docker compose up emulators

# Firebase CLI (login, deploy, etc.)
docker compose run --rm firebase login --no-localhost
docker compose run --rm firebase deploy --only functions,firestore:rules --project indego-bc76b

# Deploy with version tracking
echo '{"commit":"'$(git -C .. rev-parse --short HEAD)'","deployedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > functions/version.json
docker compose build firebase
docker compose run --rm firebase deploy --only functions --project indego-bc76b
```

## Document Storage

All project documents are in [`docs/`](docs/):

| Document | Path |
|----------|------|
| Architecture Requirements Document | `docs/ARD.md` |
| Product Requirements Document | `docs/PRD.md` |
| Technical Spec / System Design | `docs/TECHNICAL_SPEC.md` |
| Deployment / Rollout Plan | `docs/DEPLOYMENT_PLAN.md` |
| User-Facing Docs / Changelog | `docs/CHANGELOG.md` |

## Project Workflow

This project follows a **4-phase linear workflow**: Discovery → Iteration → Documentation → Implementation.

See [PROJECT_WORKFLOW.md](PROJECT_WORKFLOW.md) for the full workflow definition, templates, gate checklists, and approvals log. Both Gate 1 and Gate 2 have been approved.

## Conventions

- `api/functions/schema.graphql` is the single source of truth — update it first, then resolvers, then clients
- When adding or changing GraphQL queries/mutations, update the GraphiQL default tabs in `api/functions/server.py` (`_DEFAULT_TABS`) so the explorer stays current with the API
- After schema or resolver changes, run the GraphQL validation tests: `docker compose run --rm test bash -c "python -m pytest functions/tests/test_validate_graphql.py -v"` — these are wiring tests that confirm schema, resolvers, and services are connected end-to-end via the Flask test client
- All client projects (iOS, web) should reference the shared schema
- Follow templates defined in PROJECT_WORKFLOW.md when creating documents
- When generating or updating docs, always write to the `docs/` directory
- Use Docker for all build/test/deploy operations (run from `api/`)
