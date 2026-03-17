# Deployment / Rollout Plan — Cloud Run Migration

## 1. Overview & Goals

Migrate the GraphQL API from Firebase Cloud Functions to Cloud Run. Enable PR preview environments for API changes.

## 2. Pre-Deployment GCP Setup (REQUIRED — manual steps)

### Step 1: Enable APIs

Go to GCP Console → APIs & Services → Library. Enable:
- **Cloud Run API** (`run.googleapis.com`)
- **Artifact Registry API** (`artifactregistry.googleapis.com`)

### Step 2: Create Artifact Registry Repository

GCP Console → Artifact Registry → Create Repository:
- **Name:** `indego`
- **Format:** Docker
- **Region:** `us-central1`
- **Description:** Indego API Docker images

Or via CLI:
```bash
gcloud artifacts repositories create indego \
  --repository-format=docker \
  --location=us-central1 \
  --project=indego-bc76b
```

### Step 3: Update Service Account Permissions

GCP Console → IAM & Admin → IAM. Find the service account used by GitHub Actions and add these roles:
- **Cloud Run Admin** (`roles/run.admin`)
- **Artifact Registry Writer** (`roles/artifactregistry.writer`)
- **Service Account User** (`roles/iam.serviceAccountUser`)

It should already have:
- Firebase Admin
- Service Usage Consumer

### Step 4: Create Cloud Run Service (first deploy creates it, or manually)

The first `gcloud run deploy` will create the service. Alternatively, create manually:

GCP Console → Cloud Run → Create Service:
- **Service name:** `indego-api`
- **Region:** `us-central1`
- **Allow unauthenticated invocations:** Yes
- **Min instances:** 0
- **Max instances:** 10
- **Memory:** 256MB

## 3. Deployment Steps

### Phase 1: Merge PR
1. Complete all GCP setup steps above
2. Merge the migration PR to main
3. CI workflow runs:
   - Tests pass (using existing emulator-based tests)
   - Docker image built and pushed to Artifact Registry
   - Cloud Run revision deployed with 100% traffic
   - Firestore rules deployed via Firebase CLI
   - Web client deployed with new `VITE_GRAPHQL_URL`

### Phase 2: Verify
1. Visit production web app — verify all features work
2. Check Settings → Version Info — API version should show new commit
3. Test: create habit, complete habit, view stats
4. Check Cloud Run Console — revision is serving traffic

### Phase 3: Cleanup Old Cloud Function
1. Firebase Console → Functions → `graphql` → Delete
2. Or via CLI: `firebase functions:delete graphql --project indego-bc76b`
3. **Do this only after verifying Cloud Run is working**

## 4. Rollback Plan

### If Cloud Run deploy fails:
- The old Cloud Function is still running (we haven't deleted it yet)
- Revert the web client `VITE_GRAPHQL_URL` to the Cloud Functions URL
- Or revert the merge commit entirely

### If Cloud Run works but has issues:
- Cloud Run Console → Revisions → Route 100% traffic to previous revision
- Or: `gcloud run services update-traffic indego-api --to-revisions=REVISION=100 --region us-central1`

## 5. Go/No-Go Criteria

**Before merging:**
- [ ] All GCP setup steps completed (APIs enabled, Artifact Registry created, IAM roles added)
- [ ] All 26 API tests pass
- [ ] Web lint and build pass
- [ ] Local Flask server tested manually

**After merging (before deleting Cloud Function):**
- [ ] Cloud Run revision deployed and serving traffic
- [ ] Web app loads and authenticates
- [ ] Habit CRUD works
- [ ] Completion toggle works
- [ ] Stats page loads
- [ ] Version info shows correct commit

**PR preview test (after first PR against main):**
- [ ] Tagged Cloud Run revision deployed
- [ ] Web preview uses the tagged API URL
- [ ] Both preview environments work together
- [ ] PR close triggers tag cleanup

## 6. Communication Plan

| Event | Channel |
|-------|---------|
| GCP setup complete | Team notification |
| Migration PR merged | GitHub merge notification |
| Cloud Run verified working | Team notification |
| Old Cloud Function deleted | Team notification |

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-17 | Documentation | Initial draft |
