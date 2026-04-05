# Product Requirements Document (PRD) — API Key Authentication

## 1. Overview

- **Product:** API Key Authentication for Indego API
- **Problem Statement:** The Indego API only supports Firebase Auth (Bearer tokens), which requires browser-based OAuth flows. Server-to-server integrations like the MCP server cannot obtain tokens without user interaction, blocking automation and tooling use cases.
- **Goals:**
  - Enable persistent API key authentication alongside Firebase Auth
  - Allow admins to grant key management permissions to specific users
  - Support zero-downtime key rotation with 2 keys per user
  - Enforce per-user rate limiting on API key requests
  - Maintain existing Firebase Auth flow with zero changes
- **Non-Goals:**
  - Scoped permissions on API keys (read-only, write-only) — deferred
  - Full RBAC system — deferred
  - API key management UI in the web client — deferred (manage via GraphQL directly or admin UI)
  - Background cleanup of expired keys
  - API key auth for the `version` query (already public)

## 2. Background & Context

The Indego habits tracker API serves web and (planned) iOS clients via GraphQL. Authentication is handled by Firebase Auth — clients obtain short-lived ID tokens via browser OAuth and pass them as `Authorization: Bearer <token>`.

A new MCP server (`~/Developer/stratix/indego-mcp`) needs to interact with the API programmatically. Firebase Auth tokens are impractical for this use case:
- Tokens expire after 1 hour
- Obtaining tokens requires a browser-based sign-in flow
- Refreshing tokens requires the Firebase client SDK

API keys solve this by providing long-lived, persistent credentials that can be stored in environment variables and used in server-to-server calls via an `X-API-Key` header.

The existing `allowedEmails` collection with boolean flags (`isAdmin`) provides a natural extension point for permission flags without introducing a full RBAC system.

## 3. User Stories / Jobs to Be Done

### API Key Management

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AK-1 | User with `canManageApiKeys` | Create an API key with a name and expiration date | I can authenticate my MCP server with the API |
| AK-2 | User with `canManageApiKeys` | See my active API keys (name, prefix, expiry, created date) | I know which keys exist and when they expire |
| AK-3 | User with `canManageApiKeys` | Revoke one of my API keys | I can disable a compromised or unused key |
| AK-4 | User | See the full API key exactly once when I create it | I can copy and store it securely (it cannot be retrieved later) |
| AK-5 | User | Have at most 2 active keys at a time | I can rotate keys without downtime |

### API Key Authentication

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AK-6 | MCP server | Authenticate with an `X-API-Key` header | I don't need browser-based OAuth flows |
| AK-7 | MCP server | Get the same API access as my user account | I can call any query/mutation my user can |
| AK-8 | MCP server | Receive a clear error when my key is expired or revoked | I know to rotate or request a new key |

### Admin Permission Management

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AK-9 | Admin | Grant `canManageApiKeys` to a user | That user can create, view, and revoke their own API keys |
| AK-10 | Admin | Revoke `canManageApiKeys` from a user | I can disable key management for a user without removing their API access |

### Rate Limiting

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| AK-12 | App owner | Have API key requests rate-limited per user (60/min) | No single key can overwhelm the API |
| AK-13 | MCP server | Receive a clear error (429) when rate-limited | I can implement backoff/retry logic |

## 4. Requirements

### Functional Requirements

#### FR-1: API Key Creation
- Requires active Bearer token auth (cannot create keys using an API key)
- Requires `canManageApiKeys` permission on caller's `allowedEmails` doc
- Accepts: key name (string, required), expiration date (required)
- Rejects if user already has 2 active (non-revoked, non-expired) keys
- Returns: full plaintext key (once), key metadata (id, name, prefix, expiresAt, createdAt)
- Key format: `indego_<64 hex chars>` (32 bytes random)

#### FR-2: API Key Listing
- Requires active Bearer token auth
- Requires `canManageApiKeys` permission
- Returns: list of caller's keys with metadata (id, name, prefix, expiresAt, createdAt, revokedAt)
- Never returns the full key

#### FR-3: API Key Revocation
- Requires active Bearer token auth (cannot revoke keys using an API key)
- Requires `canManageApiKeys` permission
- Sets `revokedAt` timestamp on the key document
- Revoked keys are immediately rejected on subsequent API key auth attempts
- Idempotent: revoking an already-revoked key is a no-op (returns success)

#### FR-4: API Key Authentication
- Middleware checks for `X-API-Key` header if no valid `Authorization: Bearer` header is present
- Hashes the key with SHA-256 and looks up `apiKeys/{hash}`
- Rejects if: key not found, key revoked, key expired
- Checks user's email against `allowedEmails` (same as Bearer flow)
- Injects `user_id` and `email` into resolver context (identical shape to Bearer auth)
- Rate limit check: increments per-user counter, rejects with 429 if over limit

#### FR-5: Admin Permission Mutation
- `setApiKeyPermission(email: String!, enabled: Boolean!): AllowedEmail!`
- Requires `require_admin`
- Sets `canManageApiKeys` on the target email's `allowedEmails` doc
- Returns updated `AllowedEmail` object

#### FR-6: Rate Limiting
- Applies only to requests authenticated via API key
- 60 requests per rolling 1-minute window per user
- Returns HTTP 429 with a `RATE_LIMITED` GraphQL error when exceeded
- Counter resets when the 1-minute window elapses

### Non-Functional Requirements

- **Security:** Keys hashed at rest, plaintext shown once, `indego_` prefix for secret scanning
- **Performance:** API key auth adds at most 2 Firestore reads (key lookup + rate limit check) per request
- **UX:** Clear error messages distinguish between expired, revoked, rate-limited, and invalid keys
- **Backwards Compatibility:** All existing behavior unchanged. New `allowedEmails` fields default to `false`.

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| MCP server can authenticate and call all queries/mutations | Pass |
| Key rotation with zero downtime (create new, migrate, revoke old) | Pass |
| Expired keys are rejected immediately | Pass |
| Rate limiting blocks excessive requests with 429 | Pass |
| Existing Bearer token auth continues to work identically | Pass |

## 6. Out of Scope

- Scoped API key permissions (e.g., read-only keys) — add later as non-breaking change
- Full RBAC — deferred, evaluated during Discovery
- Web UI for key management — users manage keys via GraphQL (Playground, MCP, or future admin UI)
- Background TTL cleanup of expired keys — no storage concern at current scale
- Rate limiting for Bearer token auth — existing trust model is sufficient
- API key auth for admin-only operations — admin mutations still require Bearer + `isAdmin`

## 7. Dependencies & Risks

| Dependency / Risk | Mitigation |
|-------------------|-----------|
| MCP server must be updated to send `X-API-Key` header | Coordinate deployment: API first, then MCP server config |
| Admin must grant permissions before users can create keys | Document in changelog; populate flags before announcing feature |
| Firestore read per API key request adds latency | Acceptable at current scale; in-memory cache deferred to post-v1 |
| Compromised API key grants full user access | Rate limiting bounds damage; revocation is immediate; keys expire |
| Rate limit counter in Firestore adds write per request | Acceptable at current scale; can batch or move to Redis later |

## 8. Timeline / Milestones

| Phase | Description |
|-------|-------------|
| Gate 1 | ARD + PRD approval (this document) |
| Gate 2 | Technical Spec + Deployment Plan + Changelog approval |
| Implementation Phase 1 | Schema + data layer (apiKeys collection, repository) |
| Implementation Phase 2 | Auth middleware (dual-path: Bearer OR API key) |
| Implementation Phase 3 | Key management mutations + permission flags |
| Implementation Phase 4 | Rate limiting |
| Implementation Phase 5 | Tests (Red/Green TDD per workflow) |

## 9. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should key creation be restricted to Bearer auth only (no bootstrapping via API key)? | Resolved: Yes |
| 2 | Should admin mutations (allowlist management) be callable via API key? | Recommend: No — admin ops require Bearer + isAdmin |
| 3 | Should expired key metadata be kept for audit or auto-deleted? | Open — recommend keeping |
| 4 | Maximum key expiration period (e.g., 1 year)? | Open — recommend no max for v1, user decides |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-05 | -- | Initial PRD for API Key Authentication feature |
