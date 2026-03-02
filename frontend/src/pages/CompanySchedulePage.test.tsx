import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CompanySchedulePage } from './CompanySchedulePage';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi, slotsApi } from '../lib/api';

vi.mock('../contexts/AuthContext');
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ notifySuccess: vi.fn() }),
}));
vi.mock('../lib/api', () => ({
  companiesApi: { get: vi.fn() },
  slotsApi: { list: vi.fn() },
  bookingsApi: { create: vi.fn() },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));

function wrap(companyId: string) {
  return render(
    <MemoryRouter initialEntries={[`/companies/${companyId}/schedule`]}>
      <Routes>
        <Route path="/companies/:id/schedule" element={<CompanySchedulePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CompanySchedulePage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'u@t.ru', name: 'User', role: 'USER' },
      token: 'x',
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
    vi.mocked(companiesApi.get).mockResolvedValue({
      data: { id: 'c1', name: 'Салон', timezone: 'Europe/Moscow' },
    } as unknown as Awaited<ReturnType<typeof companiesApi.get>>);
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof slotsApi.list>>);
  });

  it('рендерит заголовок расписания и фильтр по датам', async () => {
    wrap('c1');
    expect(await screen.findByRole('heading', { name: /Расписание/ })).toBeInTheDocument();
    expect(screen.getByLabelText('С')).toBeInTheDocument();
    expect(screen.getByLabelText('По')).toBeInTheDocument();
  });

  it('при пустом списке слотов показывает сообщение', async () => {
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof slotsApi.list>>);
    wrap('c1');
    expect(await screen.findByText('Нет доступных слотов.')).toBeInTheDocument();
  });
});
