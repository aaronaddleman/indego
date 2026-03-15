# Technical Spec — Allowlist Signup Fix

## 1. Summary

Fix the allowlist check ordering in `LoginPage.tsx` so it runs after Firebase Auth, and delete Firebase Auth accounts for non-allowed email/password sign-ups.

## 2. Goals & Non-Goals

### Goals
- Fix email/password sign-up/sign-in for allowed users
- Clean up Firebase Auth accounts for non-allowed email/password sign-ups

### Non-Goals
- API changes
- Firestore rule changes
- Google OAuth orphan cleanup

## 3. Design

### Before (broken)

```
Email/password flow:
  1. checkEmailAllowed(email)    ← FAILS: user not authenticated, can't read Firestore
  2. createUserWithEmailAndPassword()  ← never reached
```

### After (fixed)

```
Email/password sign-up:
  1. createUserWithEmailAndPassword()  ← creates Firebase Auth account
  2. checkEmailAllowed(email)          ← works: user is now authenticated
  3a. Allowed → upsertUser() → navigate to dashboard
  3b. Not allowed → deleteUser() → navigate to /restricted

Email/password sign-in:
  1. signInWithEmailAndPassword()      ← authenticates
  2. checkEmailAllowed(email)          ← works: user is authenticated
  3a. Allowed → navigate to dashboard
  3b. Not allowed → signOut() → navigate to /restricted

Google sign-in (unchanged):
  1. signInWithPopup()                 ← authenticates via Google
  2. checkEmailAllowed(email)          ← works: user is authenticated
  3a. Allowed → upsertUser() → navigate to dashboard
  3b. Not allowed → signOut() → navigate to /restricted
```

## 4. Implementation

### LoginPage.tsx changes

1. Import `deleteUser` from `firebase/auth`
2. Move `checkEmailAllowed()` call to after `createUserWithEmailAndPassword()` and `signInWithEmailAndPassword()`
3. For sign-up rejection: call `deleteUser(result.user)` instead of `auth.signOut()`
4. For sign-in rejection: call `auth.signOut()`

## 5. Files Changed

| Action | File |
|--------|------|
| **Modify** | `web/src/pages/LoginPage.tsx` |

## 6. Testing

- Sign up with allowed email/password → account created, dashboard loads
- Sign up with non-allowed email/password → restricted page, no account in Firebase Auth
- Sign in with allowed email → dashboard loads
- Sign in with non-allowed email → restricted page, signed out
- Google sign-in allowed → dashboard loads
- Google sign-in not allowed → restricted page, signed out

## 7. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Documentation | Initial draft |
