import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingsApi } from '../lib/api';
import type { Booking } from '../lib/api';

export interface BookingsPageProps {
  notifySuccess: (msg: string) => void;
}

export function BookingsPage({ notifySuccess }: BookingsPageProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(() => {
    bookingsApi
      .my()
      .then((r: { data: Booking[] }) => setBookings(r.data))
      .catch(() => setError('Не удалось загрузить записи'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const handleCancel = async (bookingId: string) => {
    const confirmed = window.confirm('Вы уверены, что хотите отменить эту запись?');
    if (!confirmed) return;
    setCancellingId(bookingId);
    try {
      await bookingsApi.cancel(bookingId);
      notifySuccess('Запись отменена');
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
                  <p className="text-sm m-0">Статус: {b.status}</p>
                </div>
                {isBooked && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={cancellingId === b.id}
                    onClick={() => handleCancel(b.id)}
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
    </>
  );
}
