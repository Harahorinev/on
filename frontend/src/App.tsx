import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';
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

const useMicrofrontends = import.meta.env.VITE_USE_MF === 'true';

const AuthApp = lazy(() => import('auth/AuthApp'));
const UserApp = lazy(() => import('user/UserApp'));
const CompanyApp = lazy(() => import('company/CompanyApp'));

const RemoteFallback = () => <p className="loading-placeholder">Загрузка…</p>;

function AuthRoutes() {
  const { login } = useAuth();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <AuthApp onLogin={login} />
    </Suspense>
  );
}

function UserRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <UserApp user={user} />
    </Suspense>
  );
}

function CompanyRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <CompanyApp user={user} />
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/login"
                element={useMicrofrontends ? <AuthRoutes /> : <LoginPage />}
              />
              <Route
                path="/register"
                element={useMicrofrontends ? <AuthRoutes /> : <RegisterPage />}
              />
              <Route
                path="/companies"
                element={
                  <ProtectedRoute role="USER">
                    {useMicrofrontends ? <UserRoutes /> : <CompaniesPage />}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/companies/:id/schedule"
                element={
                  useMicrofrontends ? (
                    <UserRoutes />
                  ) : (
                    <CompanySchedulePage />
                  )
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute role="USER">
                    {useMicrofrontends ? <UserRoutes /> : <BookingsPage />}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute role="USER">
                    {useMicrofrontends ? <UserRoutes /> : <MyCalendarPage />}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/company"
                element={
                  <ProtectedRoute role="COMPANY">
                    {useMicrofrontends ? <CompanyRoutes /> : <CompanyPage />}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    {useMicrofrontends ? <UserRoutes /> : <SettingsPage />}
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
