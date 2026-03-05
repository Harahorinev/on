import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  });
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setToken(null);
      setUser(null);
    };
    const onLogin = () => {
      const t = localStorage.getItem('token');
      const u = localStorage.getItem('user');
      if (t) setToken(t);
      if (u) {
        try {
          setUser(JSON.parse(u) as User);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener('auth:logout', onLogout);
    window.addEventListener('auth:login', onLogin);
    return () => {
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener('auth:login', onLogin);
    };
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('auth:logout'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
