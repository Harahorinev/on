import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionDialog } from '@/components/ActionDialog';
import { useNotifications } from '@/contexts/NotificationContext';
import { bookingsApi, type Booking } from '@/lib/api';

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pendingCancelBooking, setPendingCancelBooking] = useState<Booking | null>(null);
  const { notifySuccess } = useNotifications();

  const load = useCallback(() => {
    bookingsApi
      .my()
      .then((r) => setBookings(r.data))
      .catch(() => setError('Не удалось загрузить записи'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const handleCancel = async () => {
    if (!pendingCancelBooking) return;
    setCancellingId(pendingCancelBooking.id);
    try {
      await bookingsApi.cancel(pendingCancelBooking.id);
      notifySuccess('Запись отменена');
      setPendingCancelBooking(null);
      load();
    } catch {
      setError('Не удалось отменить запись');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <p className="loading-placeholder">Загрузка…</p>;

  return (
    <>
      <div className="row-between mb-1">
        <h1 className="m-0">Мои записи</h1>
        <Link to="/companies" className="btn btn-primary">
          Записаться на слот
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="stack">
        {bookings.map((b) => {
          const slot = b.slot;
          const start = slot?.startAt ? new Date(slot.startAt) : null;
          const end = slot?.endAt ? new Date(slot.endAt) : null;
          const isBooked = b.status === 'CONFIRMED';

          return (
            <div key={b.id} className="card">
              <div className="row-between">
                <div>
                  <strong>{slot?.company?.name ?? 'Компания'}</strong>
                  {slot?.title && <span> — {slot.title}</span>}
                  <p className="text-muted">
                    {start && end ? `${start.toLocaleString('ru')} – ${end.toLocaleString('ru')}` : '—'}
                  </p>
                  {slot?.employee?.name && <p className="text-sm m-0">Сотрудник: {slot.employee.name}</p>}
                  <p className="text-sm m-0">Статус: {b.status}</p>
                </div>
                {isBooked && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={cancellingId === b.id}
                    onClick={() => setPendingCancelBooking(b)}
                  >
                    {cancellingId === b.id ? 'Отмена…' : 'Отменить запись'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {bookings.length === 0 && (
          <p>
            У вас пока нет записей.{' '}
            <Link to="/companies">Записаться на слот</Link>
          </p>
        )}
      </div>
      {pendingCancelBooking && (
        <ActionDialog
          title="Отмена записи"
          lines={['Вы уверены, что хотите отменить эту запись?']}
          actions={[
            {
              label: cancellingId === pendingCancelBooking.id ? 'Отмена…' : 'Отменить запись',
              variant: 'danger',
              disabled: cancellingId === pendingCancelBooking.id,
              onClick: () => void handleCancel(),
            },
            {
              label: 'Закрыть',
              variant: 'secondary',
              disabled: cancellingId === pendingCancelBooking.id,
              onClick: () => setPendingCancelBooking(null),
            },
          ]}
        />
      )}
    </>
  );
}
