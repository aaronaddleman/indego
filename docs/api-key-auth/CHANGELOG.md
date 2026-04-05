# API Key Authentication — User Documentation

## What's New

The Indego API now supports **API key authentication** alongside Firebase Auth. This enables server-to-server integrations (like MCP servers) to authenticate without browser-based OAuth flows.

- **API keys** — Generate persistent keys tied to your user account
- **Dual auth** — API accepts either `Authorization: Bearer <token>` or `X-API-Key: <key>`
- **Key rotation** — Up to 2 active keys per user for zero-downtime rotation
- **Expiration** — Keys have a mandatory expiration date
- **Rate limiting** — API key requests are limited to 60 per minute per user

## How to Use

### Prerequisites

An admin must grant you `canManageApiKeys` permission before you can create API keys.

### Create an API Key

Authenticate with a Bearer token and call:

```graphql
mutation {
  createApiKey(input: {
    name: "MCP Server"
    expiresAt: "2027-04-05T00:00:00Z"
  }) {
    key          # Save this! It will NOT be shown again.
    apiKey {
      id
      name
      keyPrefix
      expiresAt
    }
  }
}
```

**Important:** Copy and store the `key` value securely. It is only returned once.

### Authenticate with an API Key

Include the key in the `X-API-Key` header:

```
POST https://indego-api-<hash>-uc.a.run.app/
Content-Type: application/json
X-API-Key: indego_a3b4c5d6...

{
  "query": "{ habits { id name } }"
}
```

The API key grants the same access as your user account.

### List Your API Keys

```graphql
query {
  apiKeys {
    id
    name
    keyPrefix
    expiresAt
    revokedAt
    createdAt
  }
}
```

### Revoke an API Key

```graphql
mutation {
  revokeApiKey(id: "<key_id>") {
    id
    revokedAt
  }
}
```

### Key Rotation

1. Create a new key (you can have 2 active keys)
2. Update your MCP server / integration to use the new key
3. Verify the new key works
4. Revoke the old key

### Admin: Grant API Key Permission

```graphql
mutation {
  setApiKeyPermission(email: "user@example.com", enabled: true) {
    email
    canManageApiKeys
  }
}
```

## Known Issues / Limitations

- **Show once:** The full API key is only returned at creation time. If lost, revoke and create a new one.
- **No scoped permissions:** API keys have the same access level as the user's Bearer token. Read-only keys are not supported in v1.
- **Key management requires Bearer auth:** You cannot create or revoke keys using an API key — you must use a Firebase Auth Bearer token.
- **Admin operations:** Admin-only mutations (allowlist management) cannot be called via API key auth.
- **Rate limiting:** API key requests are limited to 60/minute per user. Bearer token requests are not rate-limited.

---

# Changelog

## [Unreleased]

### Added
- API key authentication via `X-API-Key` header (alongside existing Firebase Auth Bearer tokens)
- `createApiKey` mutation — generate a named API key with expiration (max 2 per user)
- `revokeApiKey` mutation — immediately disable an API key
- `apiKeys` query — list own API keys (metadata only, no plaintext)
- `setApiKeyPermission` admin mutation — grant/revoke `canManageApiKeys` flag on allowlist entries
- `canManageApiKeys` boolean field on `allowedEmails` documents
- Per-user rate limiting (60 req/min) for API key-authenticated requests
- `RATE_LIMITED` error code for rate limit responses
- `apiKeys` and `rateLimits` Firestore collections
- CORS support for `X-API-Key` header

### Changed
- Auth middleware now checks for `X-API-Key` header when no Bearer token is present
- `AllowedEmail` type now includes `canManageApiKeys` field
