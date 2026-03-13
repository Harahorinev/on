import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { companiesApi } from '@/lib/api';

type CompaniesListResponse = Awaited<ReturnType<typeof companiesApi.list>>;

vi.mock('@/lib/api', () => ({
  companiesApi: { list: vi.fn() },
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CompaniesPage', () => {
  beforeEach(() => {
    vi.mocked(companiesApi.list).mockResolvedValue({
      data: [
        { id: 'c1', name: 'Компания А', description: 'Описание', timezone: 'Europe/Moscow' },
        { id: 'c2', name: 'Компания Б', timezone: 'UTC' },
      ],
    } as unknown as CompaniesListResponse);
  });

  it('рендерит заголовок и список компаний после загрузки', async () => {
    wrap(<CompaniesPage />);
    expect(await screen.findByRole('heading', { name: 'Компании' })).toBeInTheDocument();
    expect(await screen.findByText('Компания А')).toBeInTheDocument();
    expect(await screen.findByText('Компания Б')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Расписание и запись' })).toHaveLength(2);
  });

  it('при пустом списке показывает сообщение', async () => {
    vi.mocked(companiesApi.list).mockResolvedValue({ data: [] } as unknown as CompaniesListResponse);
    wrap(<CompaniesPage />);
    expect(await screen.findByText('Пока нет компаний.')).toBeInTheDocument();
  });
});
