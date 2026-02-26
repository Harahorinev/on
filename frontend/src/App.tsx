import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/companies"
              element={
                <ProtectedRoute role="USER">
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:id/schedule"
              element={<CompanySchedulePage />}
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute role="USER">
                  <BookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute role="USER">
                  <MyCalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company"
              element={
                <ProtectedRoute role="COMPANY">
                  <CompanyPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
