# Architecture Requirements Document (ARD) — API Key Management UI

## 1. Overview

- **Project Name:** API Key Management UI
- **Purpose:** Add a Settings section for users to create, view, copy, and revoke API keys — eliminating the need to use GraphiQL or curl for key management.
- **Scope:** Web client only. No API changes — uses existing GraphQL operations from #71.

## 2. Architecture Decisions

### AD-1: Settings section, not a separate page
- **Decision:** Add an "API Keys" section to the existing SettingsPage, visible only to users with `canManageApiKeys` permission.
- **Rationale:** Consistent with how admin access is shown. Not enough content to justify a dedicated route.

### AD-2: Permission check via Firestore (same as useIsAdmin)
- **Decision:** Create a `useCanManageApiKeys()` hook that reads the `canManageApiKeys` field from the user's `allowedEmails` Firestore doc.
- **Rationale:** Same pattern as `useIsAdmin()`. No new GraphQL query needed — Firestore is already queried for allowlist checks.

### AD-3: Apollo Client for GraphQL operations
- **Decision:** Use `useQuery` and `useMutation` from Apollo Client for `apiKeys`, `createApiKey`, and `revokeApiKey`.
- **Rationale:** Consistent with all other data fetching in the app. Apollo cache auto-updates on mutation via `refetchQueries`.

## 3. Data Flow

```
SettingsPage
  → useCanManageApiKeys() checks Firestore allowedEmails/{email}
  → If true, render ApiKeysSection component
    → useQuery(GET_API_KEYS) fetches key metadata
    → Create: useMutation(CREATE_API_KEY) → show plaintext once → copy button
    → Revoke: useMutation(REVOKE_API_KEY) → confirmation → refetch list
```

## 4. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-05 | -- | Initial lightweight ARD |
