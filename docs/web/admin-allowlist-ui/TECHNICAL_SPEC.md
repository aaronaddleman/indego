# Technical Spec — Admin Allowlist UI

## 1. Summary

Add admin-only GraphQL endpoints for managing the email allowlist and a web admin page. Includes `require_admin` middleware, self-removal protection, and last-admin protection.

## 2. Goals & Non-Goals

### Goals
- GraphQL schema: AllowedEmail type, query, mutations
- require_admin middleware
- Admin page with list/add/remove
- Admin detection via Firestore on client
- Self-removal and last-admin protection

### Non-Goals
- Admin role management UI
- Bulk operations

## 3. API Implementation

### schema.graphql Additions

```graphql
type AllowedEmail {
  email: String!
  isAdmin: Boolean!
}

# Add to Query type:
  """List all allowed emails (admin only)"""
  allowedEmails: [AllowedEmail!]!

# Add to Mutation type:
  """Add an email to the allowlist (admin only)"""
  addAllowedEmail(email: String!): AllowedEmail!

  """Remove an email from the allowlist (admin only)"""
  removeAllowedEmail(email: String!): Boolean!
```

### auth.py — require_admin

```python
from app.repositories.allowlist_repo import is_email_admin

def require_admin(context: dict) -> str:
    """Require admin privileges. Returns user_id or raises AuthError."""
    user_id = require_auth(context)
    email = context.get("email")
    if not email or not is_email_admin(email):
        raise AuthError()
    return user_id
```

Also update `get_context_value` to store email in context:

```python
def get_context_value(request):
    try:
        decoded_token = _verify_token(request)
        user_id = decoded_token["uid"]
        email = decoded_token.get("email", "").lower()
    except AuthError:
        return {"request": request, "user_id": None, "email": None}

    if not email or not is_email_allowed(email):
        return {"request": request, "user_id": None, "email": None}

    return {"request": request, "user_id": user_id, "email": email}
```

### allowlist_repo.py — Extended

```python
def is_email_admin(email: str) -> bool:
    """Check if email has isAdmin: true."""
    db = firestore.client()
    doc = db.collection("allowedEmails").document(email.lower()).get()
    return doc.exists and doc.to_dict().get("isAdmin", False)

def list_allowed_emails() -> list[dict]:
    """List all allowed emails with isAdmin status."""
    db = firestore.client()
    docs = db.collection("allowedEmails").stream()
    return [
        {"email": doc.id, "isAdmin": doc.to_dict().get("isAdmin", False)}
        for doc in docs
    ]

def add_allowed_email(email: str) -> dict:
    """Add an email to the allowlist."""
    db = firestore.client()
    email = email.lower()
    ref = db.collection("allowedEmails").document(email)
    ref.set({"isAdmin": False})
    return {"email": email, "isAdmin": False}

def remove_allowed_email(email: str) -> bool:
    """Remove an email from the allowlist."""
    db = firestore.client()
    db.collection("allowedEmails").document(email.lower()).delete()
    return True

def count_admins() -> int:
    """Count the number of admin emails."""
    db = firestore.client()
    docs = db.collection("allowedEmails").stream()
    return sum(1 for doc in docs if doc.to_dict().get("isAdmin", False))
```

### admin_service.py — New

```python
from graphql import GraphQLError
from app.repositories import allowlist_repo

class AdminError(GraphQLError):
    def __init__(self, message: str):
        super().__init__(message, extensions={"code": "FORBIDDEN"})

def validate_email(email: str) -> str:
    """Basic email validation. Returns lowercased email."""
    email = email.strip().lower()
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        raise AdminError("Invalid email format")
    return email

def list_emails() -> list[dict]:
    return allowlist_repo.list_allowed_emails()

def add_email(email: str) -> dict:
    email = validate_email(email)
    if allowlist_repo.is_email_allowed(email):
        raise AdminError(f"{email} is already in the allowlist")
    return allowlist_repo.add_allowed_email(email)

def remove_email(email: str, caller_email: str) -> bool:
    email = email.strip().lower()
    if email == caller_email:
        raise AdminError("Cannot remove your own email")
    if not allowlist_repo.is_email_allowed(email):
        raise AdminError(f"{email} is not in the allowlist")
    if allowlist_repo.is_email_admin(email) and allowlist_repo.count_admins() <= 1:
        raise AdminError("Cannot remove the last admin")
    return allowlist_repo.remove_allowed_email(email)
```

### admin resolvers — New

```python
# app/transport/resolvers/admin.py

from app.auth import require_admin
from app.services import admin_service

def resolve_allowed_emails(_, info):
    require_admin(info.context)
    return admin_service.list_emails()

def resolve_add_allowed_email(_, info, email):
    require_admin(info.context)
    return admin_service.add_email(email)

def resolve_remove_allowed_email(_, info, email):
    require_admin(info.context)
    caller_email = info.context.get("email")
    return admin_service.remove_email(email, caller_email)
```

### Resolver registration

In `app/transport/resolvers/__init__.py`:

```python
from app.transport.resolvers.admin import (
    resolve_allowed_emails,
    resolve_add_allowed_email,
    resolve_remove_allowed_email,
)

query.set_field("allowedEmails", resolve_allowed_emails)
mutation.set_field("addAllowedEmail", resolve_add_allowed_email)
mutation.set_field("removeAllowedEmail", resolve_remove_allowed_email)
```

## 4. Web Client Implementation

### useIsAdmin Hook

```typescript
// src/hooks/useIsAdmin.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { useState, useEffect } from 'react';

export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setIsAdmin(false);
      return;
    }
    const ref = doc(db, 'allowedEmails', user.email.toLowerCase());
    getDoc(ref).then(snap => {
      setIsAdmin(snap.exists() && snap.data()?.isAdmin === true);
    }).catch(() => setIsAdmin(false));
  }, [user?.email]);

  return isAdmin;
}
```

### AdminGuard

```typescript
// src/auth/AdminGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useIsAdmin } from '../hooks/useIsAdmin';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();

  if (loading || isAdmin === null) {
    return <div className="loading">Loading...</div>;
  }
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

### GraphQL Operations

```typescript
// Add to queries.ts
export const GET_ALLOWED_EMAILS = gql`
  query GetAllowedEmails {
    allowedEmails {
      email
      isAdmin
    }
  }
`;

// Add to mutations.ts
export const ADD_ALLOWED_EMAIL = gql`
  mutation AddAllowedEmail($email: String!) {
    addAllowedEmail(email: $email) {
      email
      isAdmin
    }
  }
`;

export const REMOVE_ALLOWED_EMAIL = gql`
  mutation RemoveAllowedEmail($email: String!) {
    removeAllowedEmail(email: $email)
  }
`;
```

### AdminPage

Simple layout:
```
┌─────────────────────────────────┐
│ ← Back              Admin       │
├─────────────────────────────────┤
│ ┌─────────────────────┬───────┐ │
│ │ email@example.com   │  Add  │ │
│ └─────────────────────┴───────┘ │
│                                 │
│ user1@email.com          ✕      │
│ user2@email.com  [Admin] ✕      │
│ you@email.com    [Admin] (you)  │
│                                 │
└─────────────────────────────────┘
```

- "Add" input + button at top
- List of emails below
- Admin badge for admin users
- Remove button (✕) for each — disabled for self ("you" label instead)
- Error messages displayed inline

### Settings Link

```typescript
// In SettingsPage.tsx
const isAdmin = useIsAdmin();

// In the JSX, above Sign Out:
{isAdmin && (
  <button onClick={() => navigate('/admin')}>
    Manage Allowlist
  </button>
)}
```

### App.tsx Route

```typescript
const AdminPage = lazy(() => import('./pages/AdminPage'));

<Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
```

## 5. Files Changed / Created

| Action | File |
|--------|------|
| **Modify** | `api/functions/schema.graphql` |
| **Modify** | `api/functions/app/auth.py` |
| **Modify** | `api/functions/app/repositories/allowlist_repo.py` |
| **Modify** | `api/functions/app/transport/resolvers/__init__.py` |
| **Create** | `api/functions/app/services/admin_service.py` |
| **Create** | `api/functions/app/transport/resolvers/admin.py` |
| **Create** | `web/src/pages/AdminPage.tsx` |
| **Create** | `web/src/pages/AdminPage.module.css` |
| **Create** | `web/src/hooks/useIsAdmin.ts` |
| **Create** | `web/src/auth/AdminGuard.tsx` |
| **Modify** | `web/src/graphql/queries.ts` |
| **Modify** | `web/src/graphql/mutations.ts` |
| **Modify** | `web/src/pages/SettingsPage.tsx` |
| **Modify** | `web/src/App.tsx` |

## 6. Testing

### API Tests
- `require_admin` — rejects non-admin, allows admin
- `list_emails` — returns all emails with isAdmin
- `add_email` — validates format, rejects duplicates, adds successfully
- `remove_email` — rejects self-removal, rejects last admin, removes successfully

### Web Tests
- AdminGuard redirects non-admins
- AdminPage renders list, add form, remove buttons
- Remove disabled for self
- Settings shows admin link only for admins

## 7. Pre-Deployment

**Before merging:** Add `isAdmin: true` field to your email document in Firebase Console → Firestore → `allowedEmails` → your email doc → Add field → `isAdmin` → boolean → `true`.

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-18 | Documentation | Initial draft |
