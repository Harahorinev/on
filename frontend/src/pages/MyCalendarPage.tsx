import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingsApi, userEventsApi, getApiErrorMessage } from '../lib/api';
import type { Booking, UserEvent } from '../lib/api';

type CalendarItemType = 'BOOKING' | 'USER_EVENT';

interface CalendarItem {
  id: string;
  type: CalendarItemType;
  start: Date;
  end: Date;
  title: string;
  subtitle?: string;
  original: Booking | UserEvent;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat), хотим понедельник
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateOnly(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function MyCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormError, setEventFormError] = useState('');

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const [eventsError, setEventsError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setEventsError('');
    const weekStart = startOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 6);
    const dateFrom = new Date(weekStart);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(weekEnd);
    dateTo.setHours(23, 59, 59, 999);
    const params = { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() };
    Promise.all([
      bookingsApi.my().catch(() => {
        setError('Не удалось загрузить записи');
        return { data: [] as Booking[] };
      }),
      userEventsApi.list(params).catch(() => {
        setEventsError('Личные события недоступны');
        return { data: [] as UserEvent[] };
      }),
    ]).then(([bookingsRes, eventsRes]) => {
      const fromBookings: CalendarItem[] = (bookingsRes.data || [])
        .filter((b) => b.slot?.startAt && b.slot.endAt)
        .map((b) => {
          const start = new Date(b.slot!.startAt);
          const end = new Date(b.slot!.endAt);
          const companyName = b.slot?.company?.name ?? 'Компания';
          const title = b.slot?.title ? `${companyName} — ${b.slot.title}` : companyName;
          return { id: b.id, type: 'BOOKING' as const, start, end, title, subtitle: undefined, original: b };
        });
      const fromEvents: CalendarItem[] = (eventsRes.data || []).map((e) => ({
        id: e.id,
        type: 'USER_EVENT' as const,
        start: new Date(e.startAt),
        end: new Date(e.endAt),
        title: e.title,
        subtitle: e.description,
        original: e,
      }));
      setItems([...fromBookings, ...fromEvents].sort((a, b) => a.start.getTime() - b.start.getTime()));
    }).finally(() => setLoading(false));
  }, [currentDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrevWeek = () => {
    setCurrentDate((d) => addDays(d, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate((d) => addDays(d, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const [eventDate, setEventDate] = useState(() => toDateOnly(new Date()));
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventFormError('');
    if (!eventTitle.trim()) {
      setEventFormError('Введите название');
      return;
    }
    const [y, m, d] = eventDate.split('-').map(Number);
    const [sh, sm] = eventStartTime.split(':').map(Number);
    const [eh, em] = eventEndTime.split(':').map(Number);
    const startAt = new Date(y, m - 1, d, sh, sm || 0, 0, 0).toISOString();
    const endAt = new Date(y, m - 1, d, eh, em || 0, 0, 0).toISOString();
    if (new Date(endAt) <= new Date(startAt)) {
      setEventFormError('Время окончания должно быть позже начала');
      return;
    }
    setEventSubmitting(true);
    try {
      await userEventsApi.create({
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        startAt,
        endAt,
      });
      setShowEventForm(false);
      setEventTitle('');
      setEventDescription('');
      load();
    } catch (err) {
      setEventFormError(getApiErrorMessage(err, 'Не удалось создать событие'));
    } finally {
      setEventSubmitting(false);
    }
  };

  if (loading) return <p>Загрузка…</p>;

  return (
    <>
      <h1>Мой календарь</h1>
      {error && <p className="error">{error}</p>}
      {eventsError && <p className="text-sm text-muted m-0 mb-half">{eventsError}</p>}
      <div className="page-toolbar">
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={handlePrevWeek}>
            ← Неделя назад
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleToday}>
            Сегодня
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleNextWeek}>
            Вперёд →
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEventDate(toDateOnly(new Date()));
              setEventStartTime('10:00');
              setEventEndTime('11:00');
              setEventTitle('');
              setEventDescription('');
              setEventFormError('');
              setShowEventForm(true);
            }}
          >
            Добавить событие
          </button>
        </div>
        <div className="calendar-week-label">
          Неделя с{' '}
          {weekDays[0].toLocaleDateString('ru', { day: '2-digit', month: 'short' })} по{' '}
          {weekDays[6].toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {showEventForm && (
        <div className="card mb-1">
          <h3 className="mt-0">Новое событие</h3>
          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label htmlFor="event-date">Дата</label>
              <input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="filter-row">
              <div className="form-group mb-0">
                <label htmlFor="event-start">Начало</label>
                <input
                  id="event-start"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-0">
                <label htmlFor="event-end">Окончание</label>
                <input
                  id="event-end"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="event-title">Название</label>
              <input
                id="event-title"
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Например: Встреча с врачом"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="event-desc">Описание (необязательно)</label>
              <textarea
                id="event-desc"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={2}
              />
            </div>
            {eventFormError && <p className="error">{eventFormError}</p>}
            <button type="submit" className="btn btn-primary" disabled={eventSubmitting}>
              {eventSubmitting ? 'Создание…' : 'Создать'}
            </button>
            <button
              type="button"
              className="btn btn-secondary ml-half"
              onClick={() => setShowEventForm(false)}
            >
              Отмена
            </button>
          </form>
        </div>
      )}

      <div className="calendar-grid">
        {weekDays.map((day) => {
          const dayItems = items.filter((item) => isSameDay(item.start, day));
          return (
            <div key={day.toISOString()} className="card card-calendar-day">
              <div className="calendar-day-header mb-half">
                {day.toLocaleDateString('ru', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}
              </div>
              {dayItems.length === 0 ? (
                <p className="calendar-empty">Нет событий</p>
              ) : (
                <div className="calendar-events">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={'calendar-event' + (item.type === 'USER_EVENT' ? ' calendar-event--personal' : '')}
                    >
                      <div className="calendar-event-time">
                        {item.start.toLocaleTimeString('ru', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {item.end.toLocaleTimeString('ru', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="calendar-event-title">{item.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

