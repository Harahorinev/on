import { useLocation } from 'react-router-dom';
import type { User } from '@/lib/api';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

export interface AuthAppProps {
  onLogin: (token: string, user: User) => void;
}

export default function AuthApp({ onLogin }: AuthAppProps) {
  const { pathname } = useLocation();
  if (pathname === '/register') return <RegisterPage onLogin={onLogin} />;
  return <LoginPage onLogin={onLogin} />;
}
