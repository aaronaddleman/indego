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
