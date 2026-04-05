# Technical Spec — API Key Authentication

## 1. Summary

Add a persistent API key authentication path to the Indego GraphQL API. The auth middleware will accept either a Firebase Auth Bearer token or an `X-API-Key` header, resolving both to the same context shape. API keys are SHA-256 hashed at rest, stored in a top-level Firestore collection, managed via GraphQL mutations, and subject to per-user rate limiting.

## 2. Goals & Non-Goals

### Goals
- Dual-path auth middleware (Bearer OR API key) with identical resolver context
- API key CRUD: create (returns plaintext once), list (metadata only), revoke
- Max 2 active keys per user with mandatory expiration dates
- `canManageApiKeys` permission flag on `allowedEmails` docs, admin-managed
- Per-user rate limiting (60 req/min) for API key-authenticated requests
- CORS updated to allow `X-API-Key` header

### Non-Goals
- Scoped key permissions (read-only, write-only)
- Admin operations via API key
- Background cleanup of expired keys
- In-memory caching of key lookups
- Web UI for key management

## 3. Design / Architecture

### Auth Middleware Changes (`app/auth.py`)

Current flow:
```
get_context_value(request)
  → _verify_token(request)     # Firebase Bearer
  → allowlist check
  → return {request, user_id, email}
```

New flow:
```
get_context_value(request)
  → Try _verify_token(request)          # Firebase Bearer (existing)
  → If no Bearer, try _verify_api_key(request)  # API key (new)
  → allowlist check
  → If API key: rate limit check
  → return {request, user_id, email, auth_method}
```

`auth_method` is added to context (`"bearer"` or `"api_key"`) so admin resolvers can reject API key auth if needed in the future. Existing resolvers ignore this field.

### New Middleware: `require_api_key_permission(context)`

Checks that the caller's `allowedEmails` doc has `canManageApiKeys: true`. Used by API key management resolvers. Requires Bearer auth (not API key) — key management is a web app operation.

### Layered Architecture

```
Transport (resolvers)
  └── app/transport/resolvers/apikey.py
       - resolve_api_keys (query)
       - resolve_create_api_key (mutation)
       - resolve_revoke_api_key (mutation)

Service (business logic)
  └── app/services/apikey_service.py
       - list_keys(user_id)
       - create_key(user_id, email, name, expires_at)
       - revoke_key(user_id, key_id)

Repository (data access)
  └── app/repositories/apikey_repo.py
       - get_key_by_hash(hash) -> dict | None
       - list_keys_by_user(user_id) -> list
       - create_key(hash, data) -> dict
       - revoke_key(hash) -> bool
       - count_active_keys(user_id) -> int

Repository (rate limiting)
  └── app/repositories/ratelimit_repo.py
       - check_and_increment(user_id, limit, window_seconds) -> bool
```

### Rate Limiting Implementation

Uses a Firestore document per user at `rateLimits/{userId}`:

```python
def check_and_increment(user_id: str, limit: int = 60, window_seconds: int = 60) -> bool:
    """Returns True if request is allowed, False if rate limited."""
    # Firestore transaction:
    # 1. Read rateLimits/{userId}
    # 2. If windowStart is older than window_seconds ago, reset counter to 1
    # 3. Else increment counter
    # 4. Return counter <= limit
```

Transaction ensures atomicity. Window is rolling — resets when the window elapses.

## 4. API Contracts

### Schema Additions (`schema.graphql`)

```graphql
# ─── New Enum ───

enum ApiKeyPermission {
  CAN_MANAGE_API_KEYS
}

# ─── New Input ───

input CreateApiKeyInput {
  name: String!
  expiresAt: DateTime!
}

# ─── New Types ───

type ApiKey {
  id: ID!
  name: String!
  keyPrefix: String!         # First 8 chars (e.g., "indego_a")
  expiresAt: DateTime!
  revokedAt: DateTime
  createdAt: DateTime!
}

type CreateApiKeyPayload {
  apiKey: ApiKey!
  key: String!               # Full plaintext key — shown ONCE only
}

# ─── Updated Type ───

type AllowedEmail {
  email: String!
  isAdmin: Boolean!
  canManageApiKeys: Boolean!   # NEW
}

# ─── New Query ───

type Query {
  # ... existing queries ...

  """List the caller's API keys (requires canManageApiKeys)"""
  apiKeys: [ApiKey!]!
}

# ─── New Mutations ───

type Mutation {
  # ... existing mutations ...

  """Create a new API key (requires Bearer auth + canManageApiKeys). Returns full key once."""
  createApiKey(input: CreateApiKeyInput!): CreateApiKeyPayload!

  """Revoke an API key by ID (requires Bearer auth + canManageApiKeys)"""
  revokeApiKey(id: ID!): ApiKey!

  """Set API key management permission for a user (admin only)"""
  setApiKeyPermission(email: String!, enabled: Boolean!): AllowedEmail!
}
```

### CORS Update (`server.py`)

Add `X-API-Key` to allowed headers:

```python
"Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
```

### Error Responses

| Condition | Error Code | Message |
|-----------|-----------|---------|
| Invalid/unknown API key | `UNAUTHENTICATED` | "Invalid API key" |
| Expired API key | `UNAUTHENTICATED` | "API key has expired" |
| Revoked API key | `UNAUTHENTICATED` | "API key has been revoked" |
| Rate limited | `RATE_LIMITED` | "Rate limit exceeded. Try again in X seconds." |
| Missing `canManageApiKeys` | `FORBIDDEN` | "API key management permission required" |
| Max keys reached (2) | `VALIDATION_ERROR` | "Maximum of 2 active API keys allowed" |
| Key not found (revoke) | `NOT_FOUND` | "API key not found" |
| API key used for key management | `FORBIDDEN` | "API key management requires Bearer token auth" |

### Messages (`app/messages.py`)

```python
# ─── API Keys ───────────────────────────────────────────────────────────────
APIKEY_INVALID = "Invalid API key"
APIKEY_EXPIRED = "API key has expired"
APIKEY_REVOKED = "API key has been revoked"
APIKEY_RATE_LIMITED = "Rate limit exceeded. Try again later."
APIKEY_PERMISSION_REQUIRED = "API key management permission required"
APIKEY_MAX_KEYS = "Maximum of 2 active API keys allowed"
APIKEY_NOT_FOUND = "API key not found"
APIKEY_BEARER_REQUIRED = "API key management requires Bearer token authentication"
APIKEY_NAME_REQUIRED = "API key name is required"
APIKEY_EXPIRY_REQUIRED = "API key expiration date is required"
APIKEY_EXPIRY_PAST = "Expiration date must be in the future"
```

## 5. Data Models

### Firestore: `apiKeys/{sha256_hash}`

```json
{
  "userId": "firebase-uid",
  "email": "user@example.com",
  "name": "MCP Server",
  "keyPrefix": "indego_a3",
  "createdAt": "2026-04-05T12:00:00Z",
  "expiresAt": "2027-04-05T12:00:00Z",
  "revokedAt": null
}
```

- Document ID is the SHA-256 hex digest of the full key
- `keyPrefix` is the first 8 characters of the plaintext key (for UI identification)
- `revokedAt` is `null` until revoked, then set to UTC timestamp
- No Firestore indexes needed — all lookups are by document ID or filtered client-side

### Firestore: `rateLimits/{userId}`

```json
{
  "count": 15,
  "windowStart": "2026-04-05T12:00:00Z"
}
```

- Reset when `windowStart` is older than 60 seconds
- Updated via Firestore transaction for atomicity

### Firestore: `allowedEmails/{email}` (updated)

```json
{
  "isAdmin": true,
  "canManageApiKeys": false
}
```

- New field defaults to `false`
- Existing documents without this field are treated as `false`

## 6. Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Both `Authorization` and `X-API-Key` headers present | Use Bearer token, ignore API key |
| API key valid but email removed from allowlist | Rejected (allowlist check is per-request) |
| API key valid but `allowedEmails` doc deleted | Rejected (fail closed) |
| User revokes key while MCP server is mid-request | Current request completes; next request rejected |
| User creates 3rd key (already has 2 active) | Rejected with `VALIDATION_ERROR` |
| User has 1 active + 1 expired key | Can create a new key (expired doesn't count) |
| User has 1 active + 1 revoked key | Can create a new key (revoked doesn't count) |
| Admin removes `canManageApiKeys` from user | User can no longer create/list/revoke keys; existing keys still work for auth |
| Rate limit counter Firestore write fails | Fail open (allow request) — prefer availability over strict limiting |
| Key creation with past expiration date | Rejected with `VALIDATION_ERROR` |
| Revoke an already-revoked key | Idempotent success (return key metadata) |
| `createApiKey` called via API key auth | Rejected with `FORBIDDEN` — must use Bearer |
| `revokeApiKey` called via API key auth | Rejected with `FORBIDDEN` — must use Bearer |

## 7. Testing Strategy

Red/Green TDD per PROJECT_WORKFLOW.md:

### Unit Tests

| Test | File |
|------|------|
| `_verify_api_key` — valid key resolves to user | `tests/test_auth.py` |
| `_verify_api_key` — expired key raises AuthError | `tests/test_auth.py` |
| `_verify_api_key` — revoked key raises AuthError | `tests/test_auth.py` |
| `_verify_api_key` — unknown key raises AuthError | `tests/test_auth.py` |
| Bearer takes precedence over API key | `tests/test_auth.py` |
| `check_and_increment` — allows within limit | `tests/test_ratelimit_repo.py` |
| `check_and_increment` — rejects over limit | `tests/test_ratelimit_repo.py` |
| `check_and_increment` — resets after window | `tests/test_ratelimit_repo.py` |
| `create_key` — generates valid key format | `tests/test_apikey_service.py` |
| `create_key` — rejects when max keys reached | `tests/test_apikey_service.py` |
| `create_key` — rejects past expiration | `tests/test_apikey_service.py` |
| `revoke_key` — sets revokedAt | `tests/test_apikey_service.py` |
| `revoke_key` — idempotent on already-revoked | `tests/test_apikey_service.py` |
| `revoke_key` — rejects other user's key | `tests/test_apikey_service.py` |
| `list_keys` — returns only caller's keys | `tests/test_apikey_service.py` |

### Integration Tests

| Test | File |
|------|------|
| `createApiKey` mutation — full flow | `tests/test_apikey_resolvers.py` |
| `apiKeys` query — returns metadata, no plaintext | `tests/test_apikey_resolvers.py` |
| `revokeApiKey` mutation — full flow | `tests/test_apikey_resolvers.py` |
| API key auth — valid key in X-API-Key header | `tests/test_apikey_resolvers.py` |
| API key auth — rate limiting triggers at 60 req | `tests/test_apikey_resolvers.py` |
| `setApiKeyPermission` — admin sets flag | `tests/test_admin_resolvers.py` |
| `createApiKey` via API key auth — rejected | `tests/test_apikey_resolvers.py` |
| Existing Bearer auth unchanged | `tests/test_auth.py` |

## 8. Performance Considerations

| Operation | Firestore Ops | Notes |
|-----------|--------------|-------|
| API key auth (per request) | 1 read (key lookup) + 1 read/write (rate limit) | 2-3 ops per request |
| Bearer auth (per request) | 1 read (allowlist) | Unchanged |
| Create key | 1 read (count active) + 1 write (create) | Infrequent |
| List keys | 1 query (by userId) | Infrequent |
| Revoke key | 1 write (update) | Infrequent |

At 60 req/min per user, a single active API key user generates ~3,600 writes/hour for rate limiting. At current scale (few users), this is well within free tier. If multiple API key users are added, consider:
- In-memory TTL cache for key lookups (eliminates 1 read/request)
- Batched rate limit updates or move to Redis

## 9. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should admin be able to revoke any user's API key? | Recommend: defer to v2 — admin can remove `canManageApiKeys` flag, and user's existing keys continue until expiry |
| 2 | Should `auth_method` be exposed in the GraphQL context for resolvers? | Decision: yes, added to context but not exposed in schema. For internal use (blocking admin ops via API key) |
| 3 | Maximum expiration period? | Decision: no max for v1 — user decides |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-05 | -- | Initial Technical Spec |
