import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanySchedulePage } from './pages/CompanySchedulePage';
import { BookingsPage } from './pages/BookingsPage';
import { CompanyPage } from './pages/CompanyPage';
import { MyCalendarPage } from './pages/MyCalendarPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

const USE_MF = import.meta.env.VITE_USE_MF === 'true';

function AuthLocalFallback() {
  const { pathname } = useLocation();
  return pathname === '/register' ? <RegisterPage /> : <LoginPage />;
}

function UserLocalFallback() {
  const { pathname } = useLocation();
  if (pathname === '/companies') return <CompaniesPage />;
  if (pathname.startsWith('/companies/') && pathname.endsWith('/schedule')) return <CompanySchedulePage />;
  if (pathname === '/bookings') return <BookingsPage />;
  if (pathname === '/calendar') return <MyCalendarPage />;
  if (pathname === '/settings') return <SettingsPage />;
  return <CompaniesPage />;
}

const AuthApp = lazy(() =>
  import('auth/AuthApp').catch(() => ({ default: AuthLocalFallback }))
);
const UserApp = lazy(() =>
  import('user/UserApp').catch(() => ({ default: UserLocalFallback }))
);
const CompanyApp = lazy(() =>
  import('company/CompanyApp').catch(() => ({ default: CompanyPage }))
);

const RemoteFallback = () => <p className="loading-placeholder">Загрузка…</p>;

function AuthRemote() {
  const { login } = useAuth();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <AuthApp onLogin={login} />
    </Suspense>
  );
}

function UserRemote() {
  const { user } = useAuth();
  const { notifySuccess } = useNotifications();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <UserApp user={user} notifySuccess={notifySuccess} />
    </Suspense>
  );
}

function CompanyRemote() {
  const { user } = useAuth();
  const { notifySuccess } = useNotifications();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <CompanyApp user={user} notifySuccess={notifySuccess} />
    </Suspense>
  );
}

export type ProtectRole = 'USER' | 'COMPANY' | true;

function wrapWithProtect(children: React.ReactNode, protect?: ProtectRole) {
  if (!protect) return children;
  if (protect === true) return <ProtectedRoute>{children}</ProtectedRoute>;
  return <ProtectedRoute role={protect}>{children}</ProtectedRoute>;
}

const ROUTES_WITH_REMOTE: Array<{
  path: string;
  remote: React.ComponentType;
  local: React.ComponentType;
  protect?: ProtectRole;
}> = [
  { path: '/login', remote: AuthRemote, local: LoginPage },
  { path: '/register', remote: AuthRemote, local: RegisterPage },
  { path: '/companies', remote: UserRemote, local: CompaniesPage, protect: 'USER' },
  { path: '/companies/:id/schedule', remote: UserRemote, local: CompanySchedulePage },
  { path: '/bookings', remote: UserRemote, local: BookingsPage, protect: 'USER' },
  { path: '/calendar', remote: UserRemote, local: MyCalendarPage, protect: 'USER' },
  { path: '/company', remote: CompanyRemote, local: CompanyPage, protect: 'COMPANY' },
  { path: '/settings', remote: UserRemote, local: SettingsPage, protect: true },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {ROUTES_WITH_REMOTE.map(({ path, remote: Remote, local: Local, protect }) => (
        <Route
          key={path}
          path={path}
          element={wrapWithProtect(
            USE_MF ? <Remote /> : <Local />,
            protect
          )}
        />
      ))}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
