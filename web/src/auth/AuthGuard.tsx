import { use } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { checkEmailAllowed } from '../hooks/useAllowlist';

const allowlistCache = new Map<string, Promise<boolean>>();

function getAllowlistCheck(email: string): Promise<boolean> {
  const key = email.toLowerCase();
  if (!allowlistCache.has(key)) {
    allowlistCache.set(key, checkEmailAllowed(email));
  }
  return allowlistCache.get(key)!;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.email) {
    return <Navigate to="/restricted" replace />;
  }

  const allowed = use(getAllowlistCheck(user.email));

  if (!allowed) {
    return <Navigate to="/restricted" replace />;
  }

  return <>{children}</>;
}
