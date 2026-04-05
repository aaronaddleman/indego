# Technical Spec — API Key Management UI

## 1. Summary

Add an "API Keys" section to the Settings page that lets users create, view, copy, and revoke API keys. Web client-only — no API changes needed.

## 2. Goals & Non-Goals

### Goals
- API key CRUD in Settings (create, list, revoke)
- Copy-to-clipboard with one click on key creation
- Permission-gated (only visible with `canManageApiKeys`)
- Follows existing SettingsPage patterns

### Non-Goals
- Admin management of other users' keys
- Key usage analytics display
- Key scoping UI

## 3. Design / Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useCanManageApiKeys.ts` | Firestore permission check (mirrors `useIsAdmin`) |
| `src/components/settings/ApiKeysSection.tsx` | API keys section component |
| `src/components/settings/ApiKeysSection.module.css` | Styles |

### Modified Files

| File | Change |
|------|--------|
| `src/graphql/queries.ts` | Add `GET_API_KEYS` query |
| `src/graphql/mutations.ts` | Add `CREATE_API_KEY`, `REVOKE_API_KEY` mutations |
| `src/pages/SettingsPage.tsx` | Import and render `ApiKeysSection` conditionally |

### Component Structure

```
SettingsPage
  └── ApiKeysSection (shown if useCanManageApiKeys() returns true)
      ├── Key list (mapped from GET_API_KEYS query)
      │   └── Per-key row: name, prefix, expiry, revoke button
      ├── Create form (hidden if 2 active keys)
      │   └── Name input + date picker + Create button
      ├── Key reveal (shown once after creation)
      │   └── Plaintext key + Copy button + warning
      └── Empty state ("No API keys yet")
```

### State Management

```
ApiKeysSection state:
  - newKeyName: string (create form input)
  - newKeyExpiry: string (date picker)
  - createdKey: string | null (plaintext, shown once)
  - copied: boolean (copy feedback)
  - revokeConfirmId: string | null (which key is pending revoke confirmation)
```

## 4. GraphQL Operations

### Query: GET_API_KEYS

```graphql
query GetApiKeys {
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

### Mutation: CREATE_API_KEY

```graphql
mutation CreateApiKey($input: CreateApiKeyInput!) {
  createApiKey(input: $input) {
    key
    apiKey {
      id
      name
      keyPrefix
      expiresAt
      createdAt
    }
  }
}
```

### Mutation: REVOKE_API_KEY

```graphql
mutation RevokeApiKey($id: ID!) {
  revokeApiKey(id: $id) {
    id
    revokedAt
  }
}
```

Both mutations use `refetchQueries: [{ query: GET_API_KEYS }]` to refresh the list.

## 5. UI Behavior

| State | Display |
|-------|---------|
| No permission | Section hidden entirely |
| Loading | Spinner or skeleton |
| No keys | "No API keys yet. Create one to get started." |
| Keys exist | List of keys with metadata + revoke buttons |
| 2 active keys | Hide create form, show "Maximum of 2 active keys" |
| Just created | Show plaintext key with copy button + "Save this key — it won't be shown again" |
| Copy clicked | Button text changes to "Copied!" for 3 seconds |
| Revoke clicked | Inline confirmation: "Revoke [name]?" with Confirm/Cancel |
| Revoked key | Filtered out of display (show only non-revoked) |

## 6. Styling

Follows existing SettingsPage patterns:
- Section uses `.section` + `.sectionTitle` classes
- Key rows use `.infoRow` pattern (icon + content + action)
- Create form uses inline layout (no modal)
- Copy button: accent color with success feedback
- Revoke button: danger color, small
- Key reveal: monospace font, bordered box, warning text in muted color

## 7. Testing Strategy

This is a frontend-only change. Testing:
- Manual verification on PR preview
- Verify permission gating (section hidden without `canManageApiKeys`)
- Verify create → copy → revoke flow
- Verify max keys limit (create form hidden at 2)
- Verify key reveal only shown once (dismissed on second create or page reload)

No unit tests for this phase — it's a presentational component wired to existing GraphQL operations that are already tested on the API side.

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-05 | -- | Initial Technical Spec |
