import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext');

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
  });

  it('рендерит заголовок и описание', () => {
    wrap(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Расписание' })).toBeInTheDocument();
    expect(screen.getByText(/Записывайтесь на слоты/)).toBeInTheDocument();
  });

  it('без пользователя показывает ссылки Войдите и зарегистрируйтесь', () => {
    wrap(<HomePage />);
    expect(screen.getByRole('link', { name: 'Войдите' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'зарегистрируйтесь' })).toBeInTheDocument();
  });

  it('с пользователем USER показывает ссылку на компании и мои записи', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'u@t.ru', name: 'User', role: 'USER' },
      token: 'x',
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
    wrap(<HomePage />);
    expect(screen.getByRole('link', { name: 'Перейти к компаниям' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'мои записи' })).toBeInTheDocument();
  });

  it('показывает Загрузка… пока isReady false', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isReady: false,
    });
    wrap(<HomePage />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });
});
