import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext');

function wrap(ui: React.ReactElement, initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/login" element={<span>Login page</span>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'u@t.ru', name: 'User', role: 'USER' },
      token: 'x',
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
  });

  it('рендерит children для авторизованного пользователя', () => {
    wrap(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('редиректит на /login если пользователя нет', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
    wrap(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('показывает Загрузка… пока isReady false', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isReady: false,
    });
    wrap(
      <ProtectedRoute>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('редиректит на / при неверной роли', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'u@t.ru', name: 'User', role: 'USER' },
      token: 'x',
      login: vi.fn(),
      logout: vi.fn(),
      isReady: true,
    });
    render(
      <MemoryRouter initialEntries={['/company']}>
        <Routes>
          <Route path="/company" element={<ProtectedRoute role="COMPANY"><span>Company</span></ProtectedRoute>} />
          <Route path="/" element={<span>Home</span>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});