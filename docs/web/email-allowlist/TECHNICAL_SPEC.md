# Technical Spec — Email Allowlist

## 1. Summary

Add email allowlist enforcement to both the GraphQL API and web client. Access is restricted to users whose email exists in the Firestore `allowedEmails` collection. Non-allowlisted users receive generic auth errors (API) or a restricted access page (client).

## 2. Goals & Non-Goals

### Goals
- API: block all authenticated requests from non-allowlisted emails
- Client: check allowlist before calling `upsertUser`, show restricted page if denied
- Firestore collection as the source of truth, managed via Firebase Console
- Fail closed — deny access if allowlist check fails

### Non-Goals
- Admin UI (issue #9)
- TTL cache (issue #10)
- Blocking Firebase Auth account creation for Google sign-in

## 3. Design / Architecture

### API Changes

```
api/functions/app/
├── auth.py                              ← Modify: add allowlist check
└── repositories/
    └── allowlist_repo.py                ← New: read allowedEmails collection
```

### Web Client Changes

```
web/src/
├── auth/
│   └── AuthGuard.tsx                    ← Modify: check allowlist after auth
├── hooks/
│   └── useAllowlist.ts                  ← New: check email against allowedEmails
└── pages/
    └── RestrictedPage.tsx               ← New: "access restricted" page
    └── RestrictedPage.module.css        ← New: styles
```

### Firestore

```
allowedEmails/                           ← New collection
  └── {email_lowercase}/                 ← Document ID = email
      └── (empty or optional metadata)
```

## 4. API Implementation

### allowlist_repo.py (new)

```python
# api/functions/app/repositories/allowlist_repo.py

from firebase_admin import firestore

def is_email_allowed(email: str) -> bool:
    """Check if email exists in the allowedEmails collection."""
    db = firestore.client()
    doc = db.collection("allowedEmails").document(email.lower()).get()
    return doc.exists
```

### auth.py (modified)

Add allowlist check after token verification in `get_context_value()`:

```python
from app.repositories.allowlist_repo import is_email_allowed

def get_context_value(request):
    try:
        user_id = get_user_id_from_request(request)
        email = get_email_from_request(request)
    except AuthError:
        user_id = None
        email = None

    # Allowlist check — fail closed
    if user_id and email:
        if not is_email_allowed(email):
            user_id = None  # Treat as unauthenticated

    return {"request": request, "user_id": user_id}


def get_email_from_request(request) -> str:
    """Extract email from the verified Firebase ID token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing or malformed Authorization header")
    token = auth_header[7:]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token.get("email", "").lower()
    except Exception:
        raise AuthError("Invalid or expired token")
```

**Key behavior:**
- Token is verified first (existing behavior)
- Email extracted from the decoded token (already available from `verify_id_token`)
- Allowlist check: if email not in collection, `user_id` set to `None`
- Resolvers call `require_auth()` which raises `AuthError` — same error as unauthenticated
- `version` query doesn't call `require_auth`, so it stays public

**Optimization:** Avoid double token verification by extracting both UID and email in a single `verify_id_token` call:

```python
def get_context_value(request):
    try:
        decoded_token = _verify_token(request)
        user_id = decoded_token["uid"]
        email = decoded_token.get("email", "").lower()
    except AuthError:
        return {"request": request, "user_id": None}

    if not is_email_allowed(email):
        return {"request": request, "user_id": None}

    return {"request": request, "user_id": user_id}


def _verify_token(request):
    """Verify Firebase ID token and return decoded token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing or malformed Authorization header")
    token = auth_header[7:]
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise AuthError("Invalid or expired token")
```

## 5. Web Client Implementation

### useAllowlist.ts (new)

```typescript
// web/src/hooks/useAllowlist.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function checkEmailAllowed(email: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'allowedEmails', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch {
    // Fail closed
    return false;
  }
}
```

### LoginPage.tsx (modified)

**Email/password sign-in:** Check allowlist BEFORE calling Firebase Auth:

```typescript
const handleEmail = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Check allowlist before auth
  const allowed = await checkEmailAllowed(email);
  if (!allowed) {
    navigate('/restricted');
    return;
  }

  // Proceed with sign-in/sign-up
  try {
    if (isSignUp) {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await handleSuccess(result.user.email || 'User');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    }
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Authentication failed');
  }
};
```

**Google sign-in:** Check allowlist AFTER Google returns email, BEFORE `upsertUser`:

```typescript
const handleGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const email = result.user.email || '';

    // Check allowlist before upsertUser
    const allowed = await checkEmailAllowed(email);
    if (!allowed) {
      await auth.signOut();
      navigate('/restricted');
      return;
    }

    await handleSuccess(result.user.displayName || email || 'User');
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Google sign-in failed');
  }
};
```

### RestrictedPage.tsx (new)

```typescript
// web/src/pages/RestrictedPage.tsx
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import styles from './RestrictedPage.module.css';

export default function RestrictedPage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Access Restricted</h1>
        <p className={styles.message}>
          Access is currently restricted.
        </p>
        <button className={styles.button} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
```

### App.tsx (modified)

Add the restricted route:

```typescript
const RestrictedPage = lazy(() => import('./pages/RestrictedPage'));

// In Routes:
<Route path="/restricted" element={<RestrictedPage />} />
```

### AuthGuard.tsx (modified)

Add allowlist check for users who are already signed in (e.g., returning via session):

```typescript
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { checkEmailAllowed } from '../hooks/useAllowlist';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.email) {
      checkEmailAllowed(user.email).then(setAllowed);
    }
  }, [user?.email]);

  if (loading || (user && allowed === null)) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowed === false) {
    return <Navigate to="/restricted" replace />;
  }

  return <>{children}</>;
}
```

## 6. Firestore Security Rules

Add to `api/firestore.rules`:

```
match /allowedEmails/{email} {
  allow read: if request.auth != null && request.auth.token.email == email;
  allow write: if false;  // Admin SDK only (bypasses rules)
}
```

This allows authenticated users to read only their own email document. Write access is admin-only (Firebase Console / Admin SDK).

## 7. Error Handling & Edge Cases

| Scenario | API Behavior | Client Behavior |
|----------|-------------|-----------------|
| Email not in allowlist | `UNAUTHENTICATED` error | Redirect to /restricted |
| allowedEmails collection doesn't exist | Deny (fail closed) | Redirect to /restricted |
| Firestore unreachable | Deny (fail closed) | Redirect to /restricted |
| User removes email from allowlist while user is active | Next API call fails with auth error | Next AuthGuard check redirects to /restricted |
| Google sign-in, email not allowed | N/A (upsertUser not called) | Sign out + redirect to /restricted |
| Email/password, email not allowed | N/A (account not created) | Redirect to /restricted (no Firebase Auth account created) |

## 8. Testing Strategy

### API Tests

- **Allowed email:** Verify requests succeed when email is in allowlist
- **Non-allowed email:** Verify `UNAUTHENTICATED` error returned
- **Missing collection:** Verify denial (fail closed)
- **Version query:** Verify still accessible without auth

### Client Tests

- **useAllowlist:** Mock Firestore, test allowed/denied/error cases
- **LoginPage:** Verify allowlist check before auth for email, after auth for Google
- **AuthGuard:** Verify redirect to /restricted for non-allowed users
- **RestrictedPage:** Verify renders message, sign-out button works

### Integration / E2E

- Sign in with allowed email → dashboard loads
- Sign in with non-allowed email → restricted page shown
- Remove email from allowlist → next page load redirects to restricted

## 9. Files Changed / Created

| Action | File |
|--------|------|
| **Create** | `api/functions/app/repositories/allowlist_repo.py` |
| **Modify** | `api/functions/app/auth.py` |
| **Modify** | `api/firestore.rules` |
| **Create** | `web/src/hooks/useAllowlist.ts` |
| **Create** | `web/src/pages/RestrictedPage.tsx` |
| **Create** | `web/src/pages/RestrictedPage.module.css` |
| **Modify** | `web/src/pages/LoginPage.tsx` |
| **Modify** | `web/src/auth/AuthGuard.tsx` |
| **Modify** | `web/src/App.tsx` |

## 10. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | Should Firestore client SDK be initialized in the web config? | Need to check if `db` is already exported from `config/firebase.ts` |

## 11. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
