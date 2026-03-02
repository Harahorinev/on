import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockLogin = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('../lib/api', () => ({
  authApi: { login: vi.fn() },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('LoginPage', () => {
  it('рендерит форму входа', () => {
    wrap(<LoginPage />);
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('показывает ссылку на регистрацию', () => {
    wrap(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Зарегистрироваться' })).toHaveAttribute('href', '/register');
  });
});
