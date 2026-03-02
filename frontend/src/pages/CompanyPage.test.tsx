import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CompanyPage } from './CompanyPage';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi, slotsApi } from '../lib/api';

vi.mock('../contexts/AuthContext');
vi.mock('../lib/api', () => ({
  companiesApi: { getMy: vi.fn() },
  slotsApi: { list: vi.fn() },
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CompanyPage', () => {
  beforeEach(() => {
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
      data: { id: 'c1', name: 'X', description: null, timezone: 'UTC' },
    });
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] });
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
    });
    vi.mocked(slotsApi.list).mockResolvedValue({ data: [] });
    wrap(<CompanyPage />);
    expect(await screen.findByRole('heading', { name: 'Моя компания' })).toBeInTheDocument();
    expect(await screen.findByText('Слоты расписания')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Добавить слот' })).toBeInTheDocument();
  });
});
