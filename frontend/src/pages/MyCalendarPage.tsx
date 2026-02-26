import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookingsApi } from '../lib/api';
import type { Booking } from '../lib/api';

type CalendarItemType = 'BOOKING'; // позже можно добавить USER_EVENT

interface CalendarItem {
  id: string;
  type: CalendarItemType;
  start: Date;
  end: Date;
  title: string;
  subtitle?: string;
  original: Booking;
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

export function MyCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const load = useCallback(() => {
    setLoading(true);
    bookingsApi
      .my()
      .then((r) => {
        const mapped: CalendarItem[] = r.data
          .filter((b) => b.slot?.startAt && b.slot.endAt)
          .map((b) => {
            const start = new Date(b.slot!.startAt);
            const end = new Date(b.slot!.endAt);
            const companyName = b.slot?.company?.name ?? 'Компания';
            const title = b.slot?.title ? `${companyName} — ${b.slot.title}` : companyName;
            return {
              id: b.id,
              type: 'BOOKING',
              start,
              end,
              title,
              subtitle: undefined,
              original: b,
            };
          });
        setItems(mapped);
      })
      .catch(() => setError('Не удалось загрузить календарь'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const handlePrevWeek = () => {
    setCurrentDate((d) => addDays(d, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate((d) => addDays(d, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) return <p>Загрузка…</p>;

  return (
    <>
      <h1>Мой календарь</h1>
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handlePrevWeek}>
            ← Неделя назад
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleToday}>
            Сегодня
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleNextWeek}>
            Вперёд →
          </button>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Неделя с{' '}
          {weekDays[0].toLocaleDateString('ru', { day: '2-digit', month: 'short' })} по{' '}
          {weekDays[6].toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '0.75rem',
        }}
      >
        {weekDays.map((day) => {
          const dayItems = items.filter((item) => isSameDay(item.start, day));
          return (
            <div key={day.toISOString()} className="card" style={{ minHeight: '120px' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>
                  {day.toLocaleDateString('ru', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  })}
                </strong>
              </div>
              {dayItems.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#9CA3AF' }}>Нет событий</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '0.4rem 0.5rem',
                        borderRadius: 6,
                        backgroundColor: 'rgba(76, 111, 255, 0.06)',
                        border: '1px solid rgba(76, 111, 255, 0.25)',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#4B5563', marginBottom: '0.1rem' }}>
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
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.title}</div>
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

