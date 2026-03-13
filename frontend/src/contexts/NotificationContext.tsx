import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi, type UserPreferences } from '@/lib/api';

type NotificationKind = 'success';

interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

interface NotificationContextValue {
  notifySuccess: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    userApi
      .getPreferences()
      .then((res) => {
        if (cancelled) return;
        const prefs = res.data ?? {};
        if (typeof prefs.notifyInApp === 'boolean') {
          setInAppEnabled(prefs.notifyInApp);
        } else {
          setInAppEnabled(true);
        }
      })
      .catch(() => {
        if (!cancelled) setInAppEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<UserPreferences | undefined>;
      const prefs = custom.detail;
      if (prefs && typeof prefs.notifyInApp === 'boolean') {
        setInAppEnabled(prefs.notifyInApp);
      }
    };
    window.addEventListener('user:preferencesChanged', handler as EventListener);
    return () => {
      window.removeEventListener('user:preferencesChanged', handler as EventListener);
    };
  }, []);

  const notifySuccess = useCallback((message: string) => {
    if (!inAppEnabled) return;
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind: 'success', message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, [inAppEnabled]);

  return (
    <NotificationContext.Provider value={{ notifySuccess }}>
      {children}
      {items.length > 0 && (
        <div className="toast-container">
          {items.map((n) => (
            <div key={n.id} className={`toast toast-${n.kind}`}>
              {n.message}
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

