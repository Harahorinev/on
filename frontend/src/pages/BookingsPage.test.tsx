import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { Booking } from '../lib/api';
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
    const mockBooking: Booking = {
      id: 'b1',
      status: 'CONFIRMED',
      slotId: 's1',
      userId: 'u1',
      createdAt: '',
      slot: {
        id: 's1',
        companyId: 'c1',
        startAt: '2025-03-01T10:00:00Z',
        endAt: '2025-03-01T11:00:00Z',
        capacity: 1,
        status: 'OPEN',
        title: 'Слот 1',
        company: { id: 'c1', name: 'Компания' },
      },
    };
    vi.mocked(bookingsApi.my).mockResolvedValue({ data: [mockBooking] } as unknown as Awaited<ReturnType<typeof bookingsApi.my>>);
  });

  it('рендерит заголовок и записи после загрузки', async () => {
    wrap(<BookingsPage />);
    expect(await screen.findByRole('heading', { name: 'Мои записи' })).toBeInTheDocument();
    expect(await screen.findByText('Компания')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Записаться на слот' })).toBeInTheDocument();
  });

  it('при пустом списке показывает сообщение', async () => {
    vi.mocked(bookingsApi.my).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof bookingsApi.my>>);
    wrap(<BookingsPage />);
    expect(await screen.findByText(/У вас пока нет записей/)).toBeInTheDocument();
  });
});
