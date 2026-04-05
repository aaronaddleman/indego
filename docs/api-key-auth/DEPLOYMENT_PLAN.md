# Deployment / Rollout Plan — API Key Authentication

## 1. Overview & Goals

Deploy API key authentication support to the Indego API. This is a backend-only change — no web or iOS client changes required. The MCP server at `~/Developer/stratix/indego-mcp` will be configured to use the new API key after deployment.

**Goal:** Enable the MCP server to authenticate via `X-API-Key` header without breaking existing Bearer token auth.

## 2. Environments

| Environment | Description |
|-------------|-------------|
| Local (Docker emulators) | Full test suite runs against Firestore emulator |
| PR Preview (Cloud Run tag) | Deployed automatically on PR; verifiable via tag URL |
| Production (Cloud Run) | Deployed on merge to main; 100% traffic |

## 3. Pre-Deployment Steps

1. **Grant `canManageApiKeys` to your email** via Firebase Console:
   - Navigate to Firestore > `allowedEmails/{your-email}`
   - Add field: `canManageApiKeys: true` (boolean)
   - This must be done before you can create API keys after deploy

2. **No schema migration needed** — new Firestore collections (`apiKeys`, `rateLimits`) are created on first write. The new `canManageApiKeys` field on `allowedEmails` defaults to `false` when absent.

## 4. Deployment Steps

1. **Run tests locally:**
   ```bash
   cd api/
   docker compose run --rm test
   ```

2. **Create PR** — CI runs tests + builds Docker image + deploys PR preview

3. **Verify on PR preview:**
   - Existing Bearer auth still works (habits, tasks, etc.)
   - `X-API-Key` header with invalid key returns `UNAUTHENTICATED`
   - CORS preflight returns `X-API-Key` in allowed headers
   - Create API key via GraphQL (after granting permission in Firestore)
   - Verify key works for auth via `X-API-Key` header
   - Verify rate limiting triggers after 60 requests

4. **Merge to main** — production deploy

5. **Post-deploy verification:**
   - Run the same checks against production URL
   - Create an API key for MCP server use
   - Configure MCP server with the key
   - Verify MCP server can query the API

## 5. Rollback Plan

| Scenario | Action |
|----------|--------|
| Bearer auth broken | Immediate rollback: `gcloud run services update-traffic indego-api --to-revisions=PREVIOUS_REVISION=100 --region=us-central1` |
| API key auth not working | No rollback needed — existing auth unaffected. Debug and fix forward. |
| Rate limiting too aggressive | Update the limit constant and redeploy. Or disable rate limiting temporarily by setting a high limit. |

The feature is additive — it does not modify existing auth behavior. The only change to the existing code path is the CORS header addition and the fallback to API key check when no Bearer token is present. Both are low-risk.

## 6. Feature Flags / Gradual Rollout Strategy

No feature flags needed. The feature is opt-in:
- API key auth only activates when `X-API-Key` header is present
- Key creation only available to users with `canManageApiKeys: true`
- Rate limiting only applies to API key-authenticated requests

To disable the feature entirely without rollback: remove `canManageApiKeys: true` from all `allowedEmails` docs (prevents new key creation; existing keys continue to work until expiry).

## 7. Monitoring & Alerting

| Signal | How to Monitor |
|--------|---------------|
| API key auth errors | Cloud Run logs: filter for "Invalid API key", "expired", "revoked" |
| Rate limiting triggers | Cloud Run logs: filter for "Rate limit exceeded" |
| Firestore read/write volume | GCP Console > Firestore > Usage tab — watch for unexpected spikes from `apiKeys` and `rateLimits` collections |
| Latency impact | Cloud Run metrics — compare p50/p95 before and after deploy |

No new alerting infrastructure needed for v1. Rely on existing Cloud Run metrics and logs.

## 8. Go/No-Go Criteria

### Go
- [ ] All tests pass (unit + integration)
- [ ] Bearer auth verified unchanged on PR preview
- [ ] API key create/auth/revoke flow verified on PR preview
- [ ] Rate limiting verified on PR preview
- [ ] CORS allows `X-API-Key` header
- [ ] `canManageApiKeys` field added to your `allowedEmails` doc in production Firestore

### No-Go
- Any existing test failures
- Bearer auth flow broken on PR preview
- CORS regression (web client can't reach API)

## 9. Post-Deployment Tasks

1. Create an API key via GraphQL Playground or the web app's GraphiQL
2. Configure the MCP server at `~/Developer/stratix/indego-mcp` with the key:
   - Set `X-API-Key` header in the MCP server's HTTP client config
   - Verify the MCP server can call habits/tasks queries
3. Document the key's name and expiration date for rotation tracking

## 10. Communication Plan

- No user-facing announcement needed (feature is for server integrations only)
- Update the project changelog
- Note in the PR description that `canManageApiKeys` must be set in Firestore before use
