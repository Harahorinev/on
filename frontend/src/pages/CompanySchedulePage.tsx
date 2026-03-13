import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { slotsApi, bookingsApi, companiesApi, getApiErrorMessage } from '../lib/api';
import type { Company, ScheduleSlot, SlotStatus } from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: 'Открыт',
  CANCELLED: 'Отменён',
  CLOSED: 'Закрыт',
};

function toDateOnly(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function dateFromToISO(dateStr: string, endOfDay: boolean): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.toISOString();
}

export function CompanySchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { notifySuccess } = useNotifications();
  const today = toDateOnly(new Date());
  const [company, setCompany] = useState<Company | null>(null);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    companiesApi
      .get(id)
      .then((r) => setCompany(r.data))
      .catch(() => setCompany(null));
  }, [id]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    const params = {
      dateFrom: dateFromToISO(dateFrom, false),
      dateTo: dateFromToISO(dateTo, true),
    };
    slotsApi
      .list(id, params)
      .then((r) => setSlots(r.data))
      .catch(() => setError('Не удалось загрузить расписание'))
      .finally(() => setLoading(false));
  }, [id, dateFrom, dateTo]);

  useEffect(() => load(), [load]);

  const handleBook = async (slot: ScheduleSlot) => {
    if (!user || user.role !== 'USER') return;
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    const companyName = company?.name ?? 'Компания';
    const slotTitle = slot.title || 'Слот';
    const message = `Записаться на «${slotTitle}» в ${companyName}\n${start.toLocaleString('ru')} – ${end.toLocaleString('ru')}?`;
    if (!window.confirm(message)) return;
    setBookingSlotId(slot.id);
    try {
      await bookingsApi.create(slot.id);
      setError('');
      notifySuccess('Вы записались на слот');
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось записаться на слот'));
    } finally {
      setBookingSlotId(null);
    }
  };

  if (!id) return <p>Компания не указана</p>;
  if (loading) return <p className="loading-placeholder">Загрузка…</p>;

  const now = new Date();

  return (
    <>
      <h1>Расписание{company?.name ? ` — ${company.name}` : ''}</h1>
      {error && <p className="error">{error}</p>}
      <div className="card mb-1">
        <p className="text-sm mt-0 mb-half text-muted">Показать слоты за период</p>
        <div className="filter-row">
          <div className="form-group mb-0">
            <label htmlFor="schedule-date-from">С</label>
            <input
              id="schedule-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="schedule-date-to">По</label>
            <input
              id="schedule-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>
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
                  <p className="text-sm m-0">Сотрудник: {slot.employee?.name ?? 'Не назначен'}</p>
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
                    onClick={() => handleBook(slot)}
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
