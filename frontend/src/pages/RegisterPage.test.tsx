import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from '@/pages/RegisterPage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({
  authApi: { register: vi.fn() },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('RegisterPage', () => {
  it('рендерит форму регистрации', () => {
    wrap(<RegisterPage />);
    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/)).toBeInTheDocument();
    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Зарегистрироваться' })).toBeInTheDocument();
  });

  it('показывает выбор роли и ссылку на вход', () => {
    wrap(<RegisterPage />);
    expect(screen.getByLabelText('Регистрируюсь как')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
  });
});
