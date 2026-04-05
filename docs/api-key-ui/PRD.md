# Product Requirements Document (PRD) — API Key Management UI

## 1. Overview

- **Product:** API Key Management UI in Settings
- **Problem:** Users must use GraphiQL or curl to manage API keys. The plaintext key was confused with the document ID (#71), leading to auth failures.
- **Goals:** Simple UI to create, view, copy, and revoke API keys
- **Non-Goals:** Admin management of other users' keys, key scoping UI, key usage analytics

## 2. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| UI-1 | User with `canManageApiKeys` | See an "API Keys" section in Settings | I can manage my keys without GraphiQL |
| UI-2 | User | Create a key with a name and expiration | I can authenticate my MCP server |
| UI-3 | User | Copy the plaintext key with one click | I don't have to select/copy manually and risk missing characters |
| UI-4 | User | See my active keys (name, prefix, expiry) | I know which keys exist and when they expire |
| UI-5 | User | Revoke a key with confirmation | I can disable compromised keys without accidental revocation |
| UI-6 | User without permission | Not see the API Keys section | The UI isn't cluttered with inaccessible features |

## 3. Requirements

### UI Components

1. **ApiKeysSection** — conditional section in SettingsPage (hidden without permission)
2. **Key list** — shows name, prefix (`indego_a3...`), expiry date, created date for each active key
3. **Create form** — name input + date picker for expiration + "Create Key" button
4. **Key reveal** — after creation, show full plaintext key with prominent copy button and warning ("Save this key — it won't be shown again")
5. **Revoke button** — per-key, with confirmation dialog ("Revoke key [name]? This cannot be undone.")
6. **Empty state** — "No API keys yet" message with create prompt
7. **Max keys notice** — when 2 active keys exist, hide create form and show "Maximum of 2 active keys reached"

### Styling
- Follow existing SettingsPage patterns (CSS Modules, design tokens)
- Key list styled similar to Account info rows
- Create form inline (not modal)
- Copy button with success feedback ("Copied!")

## 4. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-05 | -- | Initial lightweight PRD |
