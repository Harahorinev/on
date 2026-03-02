import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MyCalendarPage } from './MyCalendarPage';
import { bookingsApi, userEventsApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  bookingsApi: { my: vi.fn() },
  userEventsApi: { list: vi.fn() },
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('MyCalendarPage', () => {
  beforeEach(() => {
    vi.mocked(bookingsApi.my).mockResolvedValue({ data: [] });
    vi.mocked(userEventsApi.list).mockResolvedValue({ data: [] });
  });

  it('рендерит заголовок и кнопки навигации по неделе', async () => {
    wrap(<MyCalendarPage />);
    expect(await screen.findByRole('heading', { name: 'Мой календарь' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Неделя назад' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вперёд →' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить событие' })).toBeInTheDocument();
  });

  it('показывает сетку дней недели', async () => {
    wrap(<MyCalendarPage />);
    await screen.findByRole('heading', { name: 'Мой календарь' });
    expect(screen.getAllByText('Нет событий').length).toBe(7);
  });
});
