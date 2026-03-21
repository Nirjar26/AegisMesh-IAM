import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import OAuthCallback from './pages/OAuthCallback';
import UsersList from './pages/users/UsersList';
import RolesList from './pages/rbac/RolesList';
import PoliciesList from './pages/rbac/PoliciesList';
import GroupsList from './pages/rbac/GroupsList';

const UserDetail = lazy(() => import('./pages/users/UserDetail'));
const RoleDetail = lazy(() => import('./pages/rbac/RoleDetail'));
const PolicyDetail = lazy(() => import('./pages/rbac/PolicyDetail'));
const GroupDetail = lazy(() => import('./pages/rbac/GroupDetail'));
const UserPermissions = lazy(() => import('./pages/rbac/UserPermissions'));
const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage'));
const AuditStatsPage = lazy(() => import('./pages/audit/AuditStatsPage'));
const UserCreate = lazy(() => import('./pages/users/UserCreate'));
const UserEdit = lazy(() => import('./pages/users/UserEdit'));
const SecurityPage = lazy(() => import('./pages/security/SecurityPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteLoader() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-aws-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="text-aws-text-dim text-sm animate-pulse">Loading module...</p>
      </div>
    </div>
  );
}

function LazyRoute({ children }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-aws-dark text-aws-text flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 sm:p-10 text-center max-w-md w-full">
        <p className="text-xs font-semibold tracking-[0.2em] text-aws-text-dim mb-3">404</p>
        <h1 className="text-2xl font-bold text-aws-text mb-2">Page Not Found</h1>
        <p className="text-sm text-aws-text-dim mb-6">
          The route you requested does not exist.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-medium btn-accent-glow"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Protected Shell + Routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* RBAC Dashboard Routes */}
              <Route path="/dashboard/users" element={<UsersList />} />
              <Route path="/dashboard/security" element={<LazyRoute><SecurityPage /></LazyRoute>} />
              <Route path="/dashboard/users/new" element={<LazyRoute><UserCreate /></LazyRoute>} />
              <Route path="/dashboard/users/:id" element={<LazyRoute><UserDetail /></LazyRoute>} />
              <Route path="/dashboard/users/:id/edit" element={<LazyRoute><UserEdit /></LazyRoute>} />
              <Route path="/dashboard/roles" element={<RolesList />} />
              <Route path="/dashboard/roles/:id" element={<LazyRoute><RoleDetail /></LazyRoute>} />
              <Route path="/dashboard/policies" element={<PoliciesList />} />
              <Route path="/dashboard/policies/:id" element={<LazyRoute><PolicyDetail /></LazyRoute>} />
              <Route path="/dashboard/groups" element={<GroupsList />} />
              <Route path="/dashboard/groups/:id" element={<LazyRoute><GroupDetail /></LazyRoute>} />
              <Route path="/dashboard/users/:id/permissions" element={<LazyRoute><UserPermissions /></LazyRoute>} />
              <Route path="/dashboard/audit-logs" element={<LazyRoute><AuditLogsPage /></LazyRoute>} />
              <Route path="/dashboard/audit-logs/stats" element={<LazyRoute><AuditStatsPage /></LazyRoute>} />

              <Route path="/settings" element={<LazyRoute><SettingsPage /></LazyRoute>} />
              <Route path="/settings/mfa" element={<Navigate to="/dashboard/security" replace />} />
              <Route path="/settings/security" element={<Navigate to="/dashboard/security" replace />} />
              <Route path="/settings/:legacyTab" element={<LazyRoute><SettingsPage /></LazyRoute>} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}


