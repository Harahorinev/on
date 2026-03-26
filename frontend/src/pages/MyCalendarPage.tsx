import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookingsApi, getApiErrorMessage, userApi, userEventsApi } from '@/lib/api';
import type { Booking, UserEvent, UserPreferences } from '@/lib/api';
import { toDateOnly } from '@/lib/date';

type CalendarItemType = 'BOOKING' | 'USER_EVENT';
type CalendarView = 'day' | 'week' | 'month';

interface CalendarItem {
  id: string;
  type: CalendarItemType;
  start: Date;
  end: Date;
  title: string;
  subtitle?: string;
  original: Booking | UserEvent;
}

interface DayTask {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  done: boolean;
}

const DAY_TASKS_STORAGE_KEY = 'calendar:dayTasks';

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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function fromDateOnly(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function loadDayTasks(): DayTask[] {
  try {
    const raw = localStorage.getItem(DAY_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.date === 'string' && typeof item.title === 'string')
      .map((item) => ({ id: item.id, date: item.date, title: item.title, done: Boolean(item.done) })) as DayTask[];
  } catch {
    return [];
  }
}

export function MyCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get('view');
  const isUrlViewValid = urlView === 'day' || urlView === 'week' || urlView === 'month';
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>(() => {
    if (urlView === 'day' || urlView === 'week' || urlView === 'month') return urlView;
    return 'week';
  });
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [dayTasks, setDayTasks] = useState<DayTask[]>(() => loadDayTasks());
  const [dayTaskTitle, setDayTaskTitle] = useState('');
  const [showDayTaskModal, setShowDayTaskModal] = useState(false);

  const period = useMemo(() => {
    if (calendarView === 'day') {
      const dayStart = startOfDay(currentDate);
      return { start: dayStart, end: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), 23, 59, 59, 999) };
    }
    if (calendarView === 'month') {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    const weekStart = startOfWeek(currentDate);
    return { start: weekStart, end: addDays(weekStart, 6) };
  }, [calendarView, currentDate]);

  const days = useMemo(() => {
    const start = period.start;
    const diffMs = period.end.getTime() - period.start.getTime();
    const length = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
    return Array.from({ length }, (_, i) => addDays(start, i));
  }, [period.end, period.start]);

  const dayTimelineRows = useMemo(() => {
    if (calendarView !== 'day' || days.length === 0) return [] as Array<{ hour: number; items: CalendarItem[] }>;
    const day = days[0];
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const buckets = Array.from({ length: 24 }, () => [] as CalendarItem[]);
    const visible = items.filter((item) => item.start <= dayEnd && item.end >= dayStart);
    for (const item of visible) {
      const displayStart = item.start < dayStart ? dayStart : item.start;
      const hour = displayStart.getHours();
      buckets[hour].push(item);
    }

    return buckets.map((bucket, hour) => ({
      hour,
      items: bucket.sort((a, b) => a.start.getTime() - b.start.getTime()),
    }));
  }, [calendarView, days, items]);

  const currentDayKey = toDateOnly(currentDate);
  const dayTasksForCurrentDate = useMemo(
    () => dayTasks
      .filter((task) => task.date === currentDayKey)
      .sort((a, b) => Number(b.done) - Number(a.done)),
    [currentDayKey, dayTasks]
  );

  useEffect(() => {
    localStorage.setItem(DAY_TASKS_STORAGE_KEY, JSON.stringify(dayTasks));
  }, [dayTasks]);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getPreferences()
      .then((res) => {
        if (cancelled) return;
        const prefs = res.data ?? {};
        if (!isUrlViewValid && (prefs.calendarView === 'week' || prefs.calendarView === 'month')) {
          setCalendarView(prefs.calendarView);
        }
      })
      .catch(() => {
        // игнорируем, оставляем значения по умолчанию
      });
    return () => {
      cancelled = true;
    };
  }, [isUrlViewValid]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<UserPreferences | undefined>;
      const prefs = custom.detail;
      if (!prefs) return;
      if (!isUrlViewValid && (prefs.calendarView === 'week' || prefs.calendarView === 'month')) {
        setCalendarView(prefs.calendarView);
      }
    };
    window.addEventListener('user:preferencesChanged', handler as EventListener);
    return () => {
      window.removeEventListener('user:preferencesChanged', handler as EventListener);
    };
  }, [isUrlViewValid]);

  useEffect(() => {
    if (urlView === calendarView) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', calendarView);
      return next;
    }, { replace: true });
  }, [calendarView, setSearchParams, urlView]);

  const [eventsError, setEventsError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setEventsError('');
    const dateFrom = new Date(period.start);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(period.end);
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
          return {
            id: b.id,
            type: 'BOOKING' as const,
            start,
            end,
            title,
            subtitle: b.slot?.employee?.name ? `Сотрудник: ${b.slot.employee.name}` : undefined,
            original: b,
          };
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
  }, [period.end, period.start]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrevPeriod = () => {
    if (calendarView === 'day') {
      setCurrentDate((d) => addDays(d, -1));
      return;
    }
    if (calendarView === 'month') {
      setCurrentDate((d) => addMonths(d, -1));
      return;
    }
    setCurrentDate((d) => addDays(d, -7));
  };

  const handleNextPeriod = () => {
    if (calendarView === 'day') {
      setCurrentDate((d) => addDays(d, 1));
      return;
    }
    if (calendarView === 'month') {
      setCurrentDate((d) => addMonths(d, 1));
      return;
    }
    setCurrentDate((d) => addDays(d, 7));
  };
  const periodPrevLabel = calendarView === 'day' ? '← День назад' : calendarView === 'month' ? '← Месяц назад' : '← Неделя назад';
  const periodNextLabel = calendarView === 'day' ? 'День вперёд →' : calendarView === 'month' ? 'Месяц вперёд →' : 'Неделя вперёд →';
  const periodLabel =
    calendarView === 'day'
      ? currentDate.toLocaleDateString('ru', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      : calendarView === 'month'
        ? currentDate.toLocaleDateString('ru', { month: 'long', year: 'numeric' })
        : `${days[0].toLocaleDateString('ru', { day: '2-digit', month: 'short' })} по ${days[days.length - 1].toLocaleDateString('ru', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}`;


  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenDayFromMonth = (day: Date) => {
    setCurrentDate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0, 0));
    setCalendarView('day');
  };

  const handleViewChange = async (nextView: CalendarView) => {
    if (nextView === calendarView) return;
    setCalendarView(nextView);
    if (nextView === 'day') return;
    try {
      const res = await userApi.patchPreferences({ calendarView: nextView });
      window.dispatchEvent(
        new CustomEvent<UserPreferences | undefined>('user:preferencesChanged', {
          detail: res.data ?? { calendarView: nextView },
        })
      );
    } catch {
      // Игнорируем ошибку сохранения настроек: сам календарь уже переключился локально.
    }
  };

  const handleAddDayTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = dayTaskTitle.trim();
    if (!title) return;
    setDayTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), date: currentDayKey, title, done: false },
    ]);
    setDayTaskTitle('');
    setShowDayTaskModal(false);
  };

  const toggleDayTaskDone = (taskId: string) => {
    setDayTasks((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, done: !task.done } : task
    )));
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

  if (loading) return <p className="loading-placeholder">Загрузка…</p>;

  return (
    <>
      <h1>Мой календарь</h1>
      {error && <p className="error">{error}</p>}
      {eventsError && <p className="text-sm text-muted m-0 mb-half">{eventsError}</p>}
      <div className="page-toolbar">
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={handlePrevPeriod}>
            {periodPrevLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleToday}>
            Сегодня
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleNextPeriod}>
            {periodNextLabel}
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
          {calendarView === 'day' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDayTaskTitle('');
                setShowDayTaskModal(true);
              }}
            >
              Задачи на день
            </button>
          )}
          <div className="form-group mb-0">
            <select
              id="calendar-view"
              aria-label="Вид календаря"
              value={calendarView}
              onChange={(e) => handleViewChange(e.target.value as CalendarView)}
            >
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>
          {calendarView === 'day' && (
            <div className="form-group mb-0">
              <input
                id="calendar-date"
                type="date"
                aria-label="Дата дня"
                value={toDateOnly(currentDate)}
                onChange={(e) => {
                  const nextDate = fromDateOnly(e.target.value);
                  if (nextDate) setCurrentDate(nextDate);
                }}
              />
            </div>
          )}
        </div>
        <div className="calendar-week-label">
          {calendarView === 'day' ? 'День: ' : calendarView === 'week' ? 'Неделя: ' : 'Месяц: '}
          {periodLabel}
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

      {showDayTaskModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="day-task-modal-title">
          <div className="card modal-card">
            <h3 id="day-task-modal-title">Задачи на день</h3>
            <form onSubmit={handleAddDayTask}>
              <div className="form-group">
                <input
                  id="calendar-day-task-title"
                  type="text"
                  value={dayTaskTitle}
                  onChange={(e) => setDayTaskTitle(e.target.value)}
                  placeholder="Новая задача на день"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary">Создать</button>
              <button
                type="button"
                className="btn btn-secondary ml-half"
                onClick={() => {
                  setShowDayTaskModal(false);
                  setDayTaskTitle('');
                }}
              >
                Отмена
              </button>
            </form>
          </div>
        </div>
      )}

      {calendarView === 'day' ? (
        <>
          <div className="card calendar-day-tasks mb-1">
            <h3 className="mt-0">Задачи на день</h3>
            {dayTasksForCurrentDate.length === 0 ? (
              <p className="calendar-empty calendar-empty--day-row">Пока нет задач на этот день</p>
            ) : (
              <div className="calendar-day-task-list">
                {dayTasksForCurrentDate.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className={`calendar-day-task${task.done ? ' calendar-day-task--done' : ''}`}
                    onClick={() => toggleDayTaskDone(task.id)}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card calendar-day-timeline">
          <div className="calendar-day-timeline__header">
            Таймлайн дня: 00:00-23:59
          </div>
          <div className="calendar-day-timeline__rows">
            {dayTimelineRows.map((row) => (
              <div key={row.hour} className="calendar-day-timeline__row">
                <div className="calendar-day-timeline__hour">
                  {formatHour(row.hour)}
                </div>
                <div className="calendar-day-timeline__content">
                  {row.items.length === 0 ? (
                    <p className="calendar-empty calendar-empty--day-row">Нет событий</p>
                  ) : (
                    <div className="calendar-events">
                      {row.items.map((item) => {
                        const displayStart = item.start < days[0] ? days[0] : item.start;
                        const dayEnd = new Date(days[0]);
                        dayEnd.setHours(23, 59, 59, 999);
                        const displayEnd = item.end > dayEnd ? dayEnd : item.end;
                        return (
                          <div
                            key={item.id}
                            className={
                              'calendar-event'
                              + (item.type === 'USER_EVENT' ? ' calendar-event--personal' : '')
                              + ' calendar-event--day'
                            }
                          >
                            <div className="calendar-event-time">
                              {displayStart.toLocaleTimeString('ru', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {displayEnd.toLocaleTimeString('ru', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="calendar-event-title">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-sm text-muted mt-half">{item.subtitle}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
      ) : (
      <div className={`calendar-grid${calendarView === 'week' ? ' calendar-grid--week' : ''}`}>
        {days.map((day) => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const dayItems = items.filter((item) => item.start <= dayEnd && item.end >= dayStart);
          const dayTaskCount = dayTasks.filter((task) => task.date === toDateOnly(day)).length;
          const openDayLabel = `Открыть день ${day.toLocaleDateString('ru', { day: '2-digit', month: 'long', year: 'numeric' })}`;
          if (calendarView === 'month') {
            return (
              <button
                key={day.toISOString()}
                type="button"
                className="card card-calendar-day card-calendar-day--clickable"
                onClick={() => handleOpenDayFromMonth(day)}
                aria-label={openDayLabel}
              >
                <div className="calendar-day-header mb-half">
                  {day.toLocaleDateString('ru', { weekday: 'short', day: '2-digit', month: 'short' })}
                </div>
                <div className="calendar-day-counters">
                  {dayItems.length > 0 && (
                    <span className="calendar-day-counter-badge" aria-label={`Событий: ${dayItems.length}`}>
                      {dayItems.length}
                    </span>
                  )}
                  {dayTaskCount > 0 && (
                    <span className="calendar-day-counter-badge calendar-day-counter-badge--tasks" aria-label={`Дел: ${dayTaskCount}`}>
                      {dayTaskCount}
                    </span>
                  )}
                </div>
              </button>
            );
          }

          if (calendarView === 'week') {
            return (
              <button
                key={day.toISOString()}
                type="button"
                className="card card-calendar-day card-calendar-day--clickable"
                onClick={() => handleOpenDayFromMonth(day)}
                aria-label={openDayLabel}
              >
                <div className="calendar-day-header mb-half">
                  {day.toLocaleDateString('ru', { weekday: 'short', day: '2-digit', month: 'short' })}
                </div>
                <div className="mb-half">
                  <span className="calendar-day-counter-badge calendar-day-counter-badge--tasks" aria-label={`Дел: ${dayTaskCount}`}>
                    {dayTaskCount}
                  </span>
                </div>
                {dayItems.length === 0 ? (
                  <p className="calendar-empty">Нет событий</p>
                ) : (
                  <div className="calendar-events">
                    {dayItems.map((item) => {
                      const displayStart = item.start < dayStart ? dayStart : item.start;
                      const displayEnd = item.end > dayEnd ? dayEnd : item.end;
                      return (
                        <div
                          key={item.id}
                          className={
                            'calendar-event'
                            + (item.type === 'USER_EVENT' ? ' calendar-event--personal' : '')
                          }
                        >
                          <div className="calendar-event-time">
                            {displayStart.toLocaleTimeString('ru', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            –{' '}
                            {displayEnd.toLocaleTimeString('ru', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="calendar-event-title">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-sm text-muted mt-half">{item.subtitle}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          }

          return (
            <div key={day.toISOString()} className="card card-calendar-day">
              <div className="calendar-day-header mb-half">
                {day.toLocaleDateString('ru', { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
              {dayItems.length === 0 ? (
                <p className="calendar-empty">Нет событий</p>
              ) : (
                <div className="calendar-events">
                  {dayItems.map((item) => {
                    const displayStart = item.start < dayStart ? dayStart : item.start;
                    const displayEnd = item.end > dayEnd ? dayEnd : item.end;
                    return (
                      <div
                        key={item.id}
                        className={
                          'calendar-event'
                          + (item.type === 'USER_EVENT' ? ' calendar-event--personal' : '')
                        }
                      >
                        <div className="calendar-event-time">
                          {displayStart.toLocaleTimeString('ru', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          –{' '}
                          {displayEnd.toLocaleTimeString('ru', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="calendar-event-title">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-sm text-muted mt-half">{item.subtitle}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </>
  );
}

