import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { slotsApi, bookingsApi } from '../lib/api';
import type { ScheduleSlot, SlotStatus } from '../lib/api';

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: 'Открыт',
  CANCELLED: 'Отменён',
  CLOSED: 'Закрыт',
};

export function CompanySchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    slotsApi
      .list(id)
      .then((r) => setSlots(r.data))
      .catch(() => setError('Не удалось загрузить расписание'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => load(), [load]);

  const handleBook = async (slotId: string) => {
    if (!user || user.role !== 'USER') return;
    setBookingSlotId(slotId);
    try {
      await bookingsApi.create(slotId);
      load();
    } catch {
      setError('Не удалось записаться на слот');
    } finally {
      setBookingSlotId(null);
    }
  };

  if (!id) return <p>Компания не указана</p>;
  if (loading) return <p>Загрузка…</p>;

  const now = new Date();

  return (
    <>
      <h1>Расписание компании</h1>
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {slots.map((slot) => {
          const start = new Date(slot.startAt);
          const end = new Date(slot.endAt);
          const isPast = end <= now;
          const booked = slot.bookings?.length ?? 0;
          const free = slot.capacity - booked;
          const canBook = user?.role === 'USER' && free > 0 && !isPast && slot.status === 'OPEN';
          const isBooking = bookingSlotId === slot.id;

          return (
            <div key={slot.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{slot.title || 'Слот'}</strong>
                  <p style={{ margin: '0.25rem 0', color: '#666' }}>
                    {start.toLocaleString('ru')} – {end.toLocaleString('ru')}
                  </p>
                  {slot.description && <p style={{ margin: 0, fontSize: '0.9rem' }}>{slot.description}</p>}
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                    Статус: {SLOT_STATUS_LABEL[slot.status]}
                    {isPast && ' (прошедший)'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                    Мест: {booked} / {slot.capacity}
                  </p>
                </div>
                {canBook && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isBooking}
                    onClick={() => handleBook(slot.id)}
                  >
                    {isBooking ? 'Запись…' : 'Записаться'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {slots.length === 0 && <p>Нет доступных слотов.</p>}
      </div>
    </>
  );
}
