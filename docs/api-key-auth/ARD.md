# Architecture Requirements Document (ARD) — API Key Authentication

## 1. Overview

- **Project Name:** API Key Authentication for Indego API
- **Purpose:** Add a persistent API key authentication path alongside Firebase Auth, enabling server-to-server integrations (e.g., MCP servers) to authenticate without browser-based OAuth flows.
- **Scope:** API key generation, storage, validation, revocation, expiration, rate limiting, and permission flags on the allowlist. Does not change existing Firebase Auth flow.

## 2. System Context

### High-Level Architecture

```
          Clients (Firebase Auth)            Integrations (API Key)
        ┌──────────────────────────┐       ┌──────────────┐
        │   iOS App  │   Web App   │       │  MCP Server  │
        │        Bearer token      │       │  X-API-Key   │
        └────────────┬─────────────┘       └──────┬───────┘
                     │   Authorization: Bearer     │  X-API-Key
                     └──────────────┬──────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Cloud Run          │
                         │   Auth Middleware     │
                         │   Bearer OR API Key   │
                         └──────────┬──────────┘
                                    │
                       ┌────────────┼────────────┐
                       ▼            ▼             ▼
                  ┌────────┐  ┌────────┐  ┌──────────────┐
                  │Firestore│  │Firebase │  │  Artifact    │
                  │  (DB)   │  │  Auth   │  │  Registry    │
                  └────────┘  └────────┘  └──────────────┘
```

### External Systems & Integrations

- **Existing:** Cloud Run, Firestore, Firebase Auth (unchanged)
- **New consumer:** MCP server at `~/Developer/stratix/indego-mcp` authenticating via `X-API-Key` header

### Actors

- **End User:** Uses Firebase Auth (unchanged)
- **Admin User:** Manages allowlist and permission flags (new: `canGenerateApiKey`, `canRevokeApiKey`)
- **MCP Server / API Client:** Authenticates via persistent API key tied to a user account

## 3. Functional Requirements

### API Key Lifecycle
- Users with `canManageApiKeys` permission can create API keys (max 2 per user)
- Each key has a user-provided name (e.g., "MCP Server") and an expiration date
- On creation, the full key is returned exactly once; only metadata is stored/returned afterward
- Users with `canManageApiKeys` permission can revoke their own keys
- Expired keys are rejected at auth time (no background cleanup required)

### Authentication Middleware
- Accept either `Authorization: Bearer <token>` (existing) OR `X-API-Key: <key>` (new)
- If both headers are present, prefer `Authorization: Bearer`
- API key auth: hash the provided key, look up the hash in Firestore, verify not expired, resolve to user context
- API key users go through the same allowlist check as Bearer token users
- Resolvers are unaware of which auth method was used — same context shape

### Permission Flags
- One new boolean field on `allowedEmails/{email}` documents:
  - `canManageApiKeys` (default: `false`) — allows creating, viewing, and revoking own API keys
- Admin sets this flag via a new GraphQL mutation
- Existing admin mutations (`setAdminStatus`) are unaffected

### Rate Limiting
- Per-user rate limit applied to API key-authenticated requests only
- 60 requests per minute per user (configurable)
- Counter stored in Firestore with TTL-based expiration
- Bearer token requests are not rate-limited (unchanged)

## 4. Non-Functional Requirements

- **Security:** API keys hashed with SHA-256 before storage. Plaintext never persisted. Key prefix `indego_` for secret scanning tools.
- **Latency:** API key lookup adds one Firestore read per request. Target: < 50ms overhead. Future optimization: in-memory TTL cache (see Open Questions).
- **Backwards Compatibility:** Zero changes to existing Bearer token flow. Existing resolvers, services, and repositories are unaffected. New `allowedEmails` fields default to `false`.
- **Portability:** API key logic follows the existing layered architecture (Transport -> Service -> Repository) for future Scala migration.

## 5. Architecture Decisions

### AD-AK1: SHA-256 hashing for API keys
- **Decision:** Hash API keys with SHA-256 before storing in Firestore. Return plaintext once on creation.
- **Rationale:** Industry standard (AWS, Stripe, GitHub). SHA-256 is fast enough for per-request lookups. No salt needed — keys are high-entropy random strings, not user-chosen passwords.
- **Alternatives Considered:** bcrypt — too slow for per-request verification; plaintext storage — unacceptable security posture.

### AD-AK2: Key format with `indego_` prefix
- **Decision:** Key format: `indego_<32 bytes hex>` (total ~73 chars).
- **Rationale:** Prefix enables GitHub secret scanning, grep-ability, and immediate identification. 32 bytes of randomness provides 256 bits of entropy — sufficient against brute force.

### AD-AK3: Lookup by hash, not by key ID
- **Decision:** Store a top-level `apiKeys/{sha256_hash}` document. Look up by hashing the incoming key.
- **Rationale:** Single Firestore read per auth check (no scan/query needed). The hash is the document ID. Efficient and simple.
- **Alternatives Considered:** Subcollection under user doc — requires knowing the user first, which defeats the purpose; query by prefix — Firestore doesn't support prefix queries on encrypted data.

### AD-AK4: Max 2 keys per user for rotation
- **Decision:** Each user can have at most 2 active (non-expired, non-revoked) API keys.
- **Rationale:** Enables zero-downtime key rotation: create a new key, migrate the client, revoke the old key. More than 2 adds management complexity with no clear benefit.

### AD-AK5: Single permission flag on allowedEmails (not RBAC)
- **Decision:** Add a single `canManageApiKeys` boolean flag to `allowedEmails/{email}` documents. Admin sets it via a GraphQL mutation. Controls creation, viewing, and revocation of the user's own keys.
- **Rationale:** Minimal change to existing auth model. A single flag avoids the footgun of granting create-without-revoke (user can't respond to a compromised key). Can be migrated to RBAC later if needed.
- **Alternatives Considered:** Full RBAC — evaluated and deferred as too large a scope change for this feature. Two flags (`canGenerateApiKey`, `canRevokeApiKey`) — rejected as over-engineered with no clear use case for split permissions.

### AD-AK6: Rate limiting via Firestore counters
- **Decision:** Per-user rate limiting using a `rateLimits/{userId}` document with a counter and window timestamp.
- **Rationale:** No additional infrastructure (Redis, Memcached). Firestore transactions ensure atomicity. Acceptable at current scale.
- **Alternatives Considered:** Redis — better performance but adds infrastructure; Cloud Armor — too coarse (IP-based, not user-based).

### AD-AK7: Bearer token takes precedence
- **Decision:** If both `Authorization: Bearer` and `X-API-Key` headers are present, use Bearer.
- **Rationale:** Bearer tokens are verified by Firebase Auth (higher trust). Prevents confusion about which identity is active. Simple, predictable behavior.

## 6. Data Architecture

### New Collection: `apiKeys/{sha256_hash}`

```json
{
  "userId": "string (Firebase UID)",
  "email": "string (user's email, for allowlist check)",
  "name": "string (user-provided label, e.g. 'MCP Server')",
  "keyPrefix": "string (first 8 chars of key, e.g. 'indego_a3')",
  "createdAt": "timestamp (UTC)",
  "expiresAt": "timestamp (UTC)",
  "revokedAt": "timestamp (UTC) | null"
}
```

### New Collection: `rateLimits/{userId}`

```json
{
  "count": "number",
  "windowStart": "timestamp (UTC)"
}
```

### Modified Document: `allowedEmails/{email}`

```json
{
  "isAdmin": "boolean",
  "canManageApiKeys": "boolean (default: false)"
}
```

### Data Flow: API Key Authentication

```
Request with X-API-Key header
  → Hash key with SHA-256
  → Firestore read: apiKeys/{hash}
  → Check: exists? not revoked? not expired?
  → Check: rateLimits/{userId} within limit?
  → Check: allowedEmails/{email} exists?
  → Inject user_id + email into context (same shape as Bearer)
  → Resolver executes normally
```

### Data Flow: Key Creation

```
Authenticated user calls createApiKey mutation
  → require_auth (must be logged in via Bearer)
  → Check canManageApiKeys permission on allowedEmails doc
  → Check active key count < 2
  → Generate random key with indego_ prefix
  → Hash with SHA-256
  → Store apiKeys/{hash} document
  → Return full plaintext key + metadata (once only)
```

## 7. Security & Access Control

### API Key Security
- Keys hashed with SHA-256 — plaintext never stored
- `indego_` prefix enables automated secret scanning (GitHub, GitGuardian)
- Key prefix (first 8 chars) stored for identification in UI — not enough to reconstruct the key
- Expired and revoked keys rejected at auth time

### Permission Model
- Key creation, viewing, and revocation require `canManageApiKeys` flag (admin-granted)
- Admin mutation to set this flag follows existing `require_admin` pattern
- Users can only manage their own keys (enforced by `userId` match)

### Rate Limiting
- Per-user, per-minute counter prevents abuse via API keys
- Does not affect Bearer token auth (existing trust model unchanged)

### Firestore Security Rules
- `apiKeys/{hash}`: no client read/write (server-only via Admin SDK)
- `rateLimits/{userId}`: no client read/write (server-only via Admin SDK)

## 8. Infrastructure & Deployment Overview

- No new infrastructure — uses existing Cloud Run + Firestore
- New Firestore collections: `apiKeys`, `rateLimits`
- No index requirements (lookups by document ID only)
- Deploy via existing CI/CD pipeline (no changes needed)
- Firestore security rules updated to deny client access to new collections

## 9. Open Questions / Risks

| # | Question / Risk | Status |
|---|----------------|--------|
| 1 | In-memory TTL cache for API key lookups to reduce Firestore reads per request | Deferred to post-v1 — one read per request is acceptable at current scale |
| 2 | Should expired keys be auto-deleted (TTL policy) or kept for audit trail? | Open — recommend keeping for audit, no storage concern at current scale |
| 3 | Should rate limit (100 req/min) be configurable per user or global? | Recommend global for v1, per-user override deferred |
| 4 | Key creation requires Bearer token auth (not API key) to prevent bootstrapping | Decision: Yes — keys can only be created via Bearer auth |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-05 | -- | Initial ARD for API Key Authentication feature |
