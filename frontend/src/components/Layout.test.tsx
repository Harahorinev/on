import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { User } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from './Layout';

vi.mock('../contexts/AuthContext');

function mockAuth(overrides: { user?: User | null; logout?: () => void } = {}) {
  return {
    user: overrides.user ?? null,
    token: null,
    login: vi.fn(),
    logout: overrides.logout ?? vi.fn(),
    isReady: true,
  };
}

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('Layout', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth({ user: null }));
  });

  it('без пользователя показывает Вход и Регистрация', () => {
    wrap(
      <Layout>
        <span>Контент</span>
      </Layout>
    );
    expect(screen.getByRole('link', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.getByText('Контент')).toBeInTheDocument();
  });

  it('с пользователем USER показывает Компании, Мои записи, Мой календарь', () => {
    vi.mocked(useAuth).mockReturnValue(
      mockAuth({ user: { id: '1', email: 'u@t.ru', name: 'User', role: 'USER' } })
    );
    wrap(
      <Layout>
        <span>Контент</span>
      </Layout>
    );
    expect(screen.getByRole('link', { name: 'Компании' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Мои записи' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Мой календарь' })).toBeInTheDocument();
  });
});
