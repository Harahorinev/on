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
      <div className="stack">
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
              <div className="row-between">
                <div>
                  <strong>{slot.title || 'Слот'}</strong>
                  <p className="text-muted">
                    {start.toLocaleString('ru')} – {end.toLocaleString('ru')}
                  </p>
                  {slot.description && <p className="text-xs m-0">{slot.description}</p>}
                  <p className="text-sm mt-half m-0">
                    Статус: {SLOT_STATUS_LABEL[slot.status]}
                    {isPast && ' (прошедший)'}
                  </p>
                  <p className="text-sm mt-half m-0">
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
