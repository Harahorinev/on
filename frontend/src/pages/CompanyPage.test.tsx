import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CompanyPage } from './CompanyPage';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi, employeesApi, slotsApi } from '../lib/api';

vi.mock('../contexts/AuthContext');
vi.mock('../lib/api', () => ({
  companiesApi: { getMy: vi.fn(), exportScheduleCsv: vi.fn() },
  slotsApi: { list: vi.fn() },
  employeesApi: { list: vi.fn(), create: vi.fn() },
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CompanyPage', () => {
  beforeEach(() => {
    vi.mocked(employeesApi.list).mockResolvedValue({ data: [] } as never);
    vi.mocked(employeesApi.create).mockResolvedValue({
      data: { id: 'e1', companyId: 'c1', name: 'Новый сотрудник' },
    } as never);
    vi.mocked(companiesApi.exportScheduleCsv).mockResolvedValue({
      data: new Blob(['slot_id,start_at\n'], { type: 'text/csv' }),
    } as unknown as Awaited<ReturnType<typeof companiesApi.exportScheduleCsv>>);
    Object.defineProperty(window.URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:test-csv'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'c@t.ru', name: 'Company', role: 'COMPANY' },
      token: 'x',
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
  });

  it('для не-компании показывает сообщение о доступе', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'u@t.ru', name: 'User', role: 'USER' },
      token: 'x',
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
    vi.mocked(companiesApi.getMy).mockResolvedValue({
      data: { id: 'c1', name: 'X', timezone: 'UTC' },
    } as unknown as Awaited<ReturnType<typeof companiesApi.getMy>>);
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof slotsApi.list>>);
    wrap(<CompanyPage />);
    expect(screen.getByText('Доступ только для компании.')).toBeInTheDocument();
  });

  it('если компании нет — показывает кнопку Создать компанию', async () => {
    vi.mocked(companiesApi.getMy).mockRejectedValue({ response: { status: 404 } });
    wrap(<CompanyPage />);
    expect(await screen.findByText('Кабинет компании')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Создать компанию' })).toBeInTheDocument();
  });

  it('при наличии компании показывает название и слоты', async () => {
    vi.mocked(companiesApi.getMy).mockResolvedValue({
      data: { id: 'c1', name: 'Моя компания', description: 'Описание', timezone: 'Europe/Moscow' },
    } as unknown as Awaited<ReturnType<typeof companiesApi.getMy>>);
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof slotsApi.list>>);
    wrap(<CompanyPage />);
    expect(await screen.findByRole('heading', { name: 'Моя компания' })).toBeInTheDocument();
    expect(await screen.findByText('Слоты расписания')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Добавить слот' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Экспорт CSV' })).toBeInTheDocument();
    expect(await screen.findByText('Сотрудники')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Добавить сотрудника' })).toBeInTheDocument();
  });

  it('экспортирует csv по кнопке', async () => {
    vi.mocked(companiesApi.getMy).mockResolvedValue({
      data: { id: 'c1', name: 'Моя компания', description: 'Описание', timezone: 'Europe/Moscow' },
    } as unknown as Awaited<ReturnType<typeof companiesApi.getMy>>);
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof slotsApi.list>>);
    const user = userEvent.setup();
    wrap(<CompanyPage />);

    await user.click(await screen.findByRole('button', { name: 'Экспорт CSV' }));

    expect(companiesApi.exportScheduleCsv).toHaveBeenCalledWith('c1');
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('показывает сообщение если backend сотрудников недоступен', async () => {
    vi.mocked(companiesApi.getMy).mockResolvedValue({
      data: { id: 'c1', name: 'Моя компания', description: 'Описание', timezone: 'Europe/Moscow' },
    } as unknown as Awaited<ReturnType<typeof companiesApi.getMy>>);
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] } as unknown as Awaited<ReturnType<typeof slotsApi.list>>);
    vi.mocked(employeesApi.list).mockRejectedValue({ response: { status: 404 } });
    wrap(<CompanyPage />);
    expect(await screen.findByText('Управление сотрудниками станет доступно после обновления backend.')).toBeInTheDocument();
  });
});
