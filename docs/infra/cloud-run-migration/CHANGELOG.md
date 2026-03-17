# Cloud Run Migration — Changelog

## What's New

The GraphQL API has been migrated from Firebase Cloud Functions to Google Cloud Run.

### Changed
- API runtime: Cloud Functions → Cloud Run (Flask + Gunicorn)
- API URL: Cloud Functions endpoint → Cloud Run service URL
- CI/CD: Firebase deploy → Docker build + Cloud Run deploy
- Docker image: lightweight production image (~150MB vs ~800MB)

### Added
- PR preview API environments via Cloud Run tagged revisions
- Automatic cleanup of PR revisions on PR close
- Firestore rules deployed separately via Firebase CLI
- Flask-based WSGI server with Gunicorn

### Removed
- Firebase Cloud Functions (`firebase-functions` Python package)
- Cloud Functions deployment in CI/CD
- Functions emulator in local dev (replaced by Flask dev server)

---

# Changelog

## [Unreleased]
### Changed
- API migrated from Cloud Functions to Cloud Run
- CI/CD pipeline rewritten for Cloud Run deployments
### Added
- PR preview environments (tagged Cloud Run revisions)
- Cleanup workflow for PR close
- Flask + Gunicorn entry point
- Lightweight production Dockerfile
### Removed
- firebase-functions dependency
- Cloud Functions deploy step
