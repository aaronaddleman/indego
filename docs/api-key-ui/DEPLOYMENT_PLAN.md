# Deployment / Rollout Plan — API Key Management UI

## 1. Overview & Goals

Deploy the API key management UI section in Settings. Web client-only change — no API deployment needed.

## 2. Pre-Deployment

- API key auth (#71) must be merged (done)
- `canManageApiKeys: true` must be set on at least one `allowedEmails` doc (done from #71)

## 3. Deployment Steps

1. Create PR — CI builds web preview
2. Verify on PR preview:
   - Settings page loads without errors
   - API Keys section visible for users with `canManageApiKeys`
   - API Keys section hidden for users without permission
   - Create key → plaintext shown → copy works
   - Key list shows created keys
   - Revoke key → confirmation → key disappears
   - Max 2 keys enforcement (create form hidden)
3. Merge to main — production deploy via Firebase Hosting

## 4. Rollback Plan

Revert the web deploy via Firebase Hosting:
```bash
firebase hosting:rollback --project indego-bc76b
```
No API changes to roll back.

## 5. Go/No-Go Criteria

- [ ] Settings page renders without errors
- [ ] Permission gating works (visible/hidden based on `canManageApiKeys`)
- [ ] Full create/copy/revoke flow works
- [ ] Existing Settings sections unchanged
