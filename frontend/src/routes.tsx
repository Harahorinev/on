import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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

const USE_MF = import.meta.env.VITE_USE_MF === 'true';

const AuthApp = lazy(() => import('auth/AuthApp'));
const UserApp = lazy(() => import('user/UserApp'));
const CompanyApp = lazy(() => import('company/CompanyApp'));

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
  return (
    <Suspense fallback={<RemoteFallback />}>
      <UserApp user={user} />
    </Suspense>
  );
}

function CompanyRemote() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <CompanyApp user={user} />
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
