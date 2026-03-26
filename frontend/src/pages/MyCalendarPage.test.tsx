import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { bookingsApi, userApi, userEventsApi } from '@/lib/api';
import { MyCalendarPage } from '@/pages/MyCalendarPage';

vi.mock('@/lib/api', () => ({
  bookingsApi: { my: vi.fn() },
  userEventsApi: { list: vi.fn() },
  userApi: {
    getPreferences: vi.fn(),
    patchPreferences: vi.fn(),
  },
}));

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={['/calendar']}>{ui}</MemoryRouter>);
}

describe('MyCalendarPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(bookingsApi.my).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof bookingsApi.my>>);
    vi.mocked(userEventsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof userEventsApi.list>>);
    vi.mocked(userApi.getPreferences).mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof userApi.getPreferences>>);
    vi.mocked(userApi.patchPreferences).mockResolvedValue({
      data: { calendarView: 'week' },
    } as Awaited<ReturnType<typeof userApi.patchPreferences>>);
  });

  it('рендерит заголовок и кнопки навигации по неделе', async () => {
    wrap(<MyCalendarPage />);
    expect(await screen.findByRole('heading', { name: 'Мой календарь' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Неделя назад' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Неделя вперёд →' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить событие' })).toBeInTheDocument();
  });

  it('показывает сетку дней недели', async () => {
    wrap(<MyCalendarPage />);
    await screen.findByRole('heading', { name: 'Мой календарь' });
    expect(screen.getAllByText('Нет событий').length).toBe(7);
    expect(screen.getAllByLabelText(/^Дел:/).length).toBe(7);
    const dayButtons = screen.getAllByRole('button', { name: /^Открыть день / });
    fireEvent.click(dayButtons[0]);
    expect(await screen.findByText('Таймлайн дня: 00:00-23:59')).toBeInTheDocument();
  });

  it('переключает вид календаря на день', async () => {
    wrap(<MyCalendarPage />);
    await screen.findByRole('heading', { name: 'Мой календарь' });
    fireEvent.change(screen.getByLabelText('Вид календаря'), { target: { value: 'day' } });
    await waitFor(() => {
      expect(screen.getAllByText('Нет событий').length).toBe(24);
    });
    expect(screen.getByText('Таймлайн дня: 00:00-23:59')).toBeInTheDocument();
    expect(screen.getByLabelText('Дата дня')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← День назад' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'День вперёд →' })).toBeInTheDocument();
  });

  it('переключает вид календаря на месяц', async () => {
    wrap(<MyCalendarPage />);
    await screen.findByRole('heading', { name: 'Мой календарь' });
    fireEvent.change(screen.getByLabelText('Вид календаря'), { target: { value: 'month' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '← Месяц назад' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Событий:')).not.toBeInTheDocument();
    expect(screen.queryByText('Дел:')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Нет событий').length).toBe(0);
    expect(screen.getByRole('button', { name: '← Месяц назад' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Месяц вперёд →' })).toBeInTheDocument();

    const dayButtons = screen.getAllByRole('button', { name: /^Открыть день / });
    fireEvent.click(dayButtons[0]);
    expect(await screen.findByText('Таймлайн дня: 00:00-23:59')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← День назад' })).toBeInTheDocument();
  });

  it('добавляет задачу на день и переключает её в выполненную', async () => {
    wrap(<MyCalendarPage />);
    await screen.findByRole('heading', { name: 'Мой календарь' });
    fireEvent.change(screen.getByLabelText('Вид календаря'), { target: { value: 'day' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Задачи на день' }));
    const input = await screen.findByPlaceholderText('Новая задача на день');
    fireEvent.change(input, { target: { value: 'Пропылесосить' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));

    const task = await screen.findByRole('button', { name: 'Пропылесосить' });
    expect(task).toBeInTheDocument();
    fireEvent.click(task);
    expect(task).toHaveClass('calendar-day-task--done');
  });
});
