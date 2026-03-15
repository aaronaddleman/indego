import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './config/apollo';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import { AuthGuard } from './auth/AuthGuard';
import './styles/global.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RestrictedPage = lazy(() => import('./pages/RestrictedPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HabitDetailPage = lazy(() => import('./pages/HabitDetailPage'));
const HabitHistoryPage = lazy(() => import('./pages/HabitHistoryPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/restricted" element={<RestrictedPage />} />
              <Route path="/" element={<AuthGuard><DashboardPage /></AuthGuard>} />
              <Route path="/habit/:id" element={<AuthGuard><HabitDetailPage /></AuthGuard>} />
              <Route path="/habit/:id/history" element={<AuthGuard><HabitHistoryPage /></AuthGuard>} />
              <Route path="/stats" element={<AuthGuard><StatsPage /></AuthGuard>} />
              <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}
