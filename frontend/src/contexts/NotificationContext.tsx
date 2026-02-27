import { createContext, useCallback, useContext, useState } from 'react';

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

  const notifySuccess = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind: 'success', message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

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

