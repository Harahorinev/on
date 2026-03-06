import { Routes, Route } from 'react-router-dom';
import type { User } from './lib/api';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanySchedulePage } from './pages/CompanySchedulePage';
import { BookingsPage } from './pages/BookingsPage';
import { MyCalendarPage } from './pages/MyCalendarPage';
import { SettingsPage } from './pages/SettingsPage';

export interface UserAppProps {
  user: User | null;
  notifySuccess: (msg: string) => void;
}

export default function UserApp({ user, notifySuccess }: UserAppProps) {
  return (
    <Routes>
      <Route path="/companies" element={<CompaniesPage />} />
      <Route path="/companies/:id/schedule" element={<CompanySchedulePage user={user} notifySuccess={notifySuccess} />} />
      <Route path="/bookings" element={<BookingsPage notifySuccess={notifySuccess} />} />
      <Route path="/calendar" element={<MyCalendarPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
