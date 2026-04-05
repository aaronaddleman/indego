import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './config/apollo';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import { AuthGuard } from './auth/AuthGuard';
import { AdminGuard } from './auth/AdminGuard';
import { useReminderScheduler } from './hooks/useReminderScheduler';
import './styles/global.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RestrictedPage = lazy(() => import('./pages/RestrictedPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const StreaksPage = lazy(() => import('./pages/StreaksPage'));
const StreakDetailPage = lazy(() => import('./pages/StreakDetailPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function ReminderScheduler() {
  useReminderScheduler();
  return null;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/habits" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <ReminderScheduler />
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/restricted" element={<RestrictedPage />} />

              {/* Habits */}
              <Route path="/habits" element={<AuthGuard><DashboardPage /></AuthGuard>} />
              <Route path="/habits/history" element={<AuthGuard><HistoryPage /></AuthGuard>} />
              <Route path="/habits/streaks" element={<AuthGuard><StreaksPage /></AuthGuard>} />
              <Route path="/habits/streaks/:id" element={<AuthGuard><StreakDetailPage /></AuthGuard>} />

              {/* Tasks */}
              <Route path="/tasks" element={<AuthGuard><TasksPage /></AuthGuard>} />
              <Route path="/tasks/:id" element={<AuthGuard><TaskDetailPage /></AuthGuard>} />

              {/* Settings & Admin */}
              <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
              <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

              {/* Backward compat redirects */}
              <Route path="/" element={<Navigate to="/habits" replace />} />
              <Route path="/history" element={<Navigate to="/habits/history" replace />} />
              <Route path="/streaks" element={<Navigate to="/habits/streaks" replace />} />
              <Route path="/streaks/:id" element={<Navigate to="/habits/streaks/:id" replace />} />
              <Route path="*" element={<Navigate to="/habits" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}
