import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BookingsPage } from './BookingsPage';
import { bookingsApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  bookingsApi: { my: vi.fn(), cancel: vi.fn() },
}));
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ notifySuccess: vi.fn() }),
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.mocked(bookingsApi.my).mockResolvedValue({
      data: [
        {
          id: 'b1',
          status: 'CONFIRMED',
          slot: {
            id: 's1',
            startAt: '2025-03-01T10:00:00Z',
            endAt: '2025-03-01T11:00:00Z',
            title: 'Слот 1',
            company: { id: 'c1', name: 'Компания' },
          },
        },
      ],
    });
  });

  it('рендерит заголовок и записи после загрузки', async () => {
    wrap(<BookingsPage />);
    expect(await screen.findByRole('heading', { name: 'Мои записи' })).toBeInTheDocument();
    expect(await screen.findByText('Компания')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Записаться на слот' })).toBeInTheDocument();
  });

  it('при пустом списке показывает сообщение', async () => {
    vi.mocked(bookingsApi.my).mockResolvedValue({ data: [] });
    wrap(<BookingsPage />);
    expect(await screen.findByText(/У вас пока нет записей/)).toBeInTheDocument();
  });
});
