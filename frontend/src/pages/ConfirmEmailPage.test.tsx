import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmEmailPage } from './ConfirmEmailPage';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  authApi: {
    verifyEmail: vi.fn(),
  },
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

function wrap(initialEntry = '/confirm-email') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ConfirmEmailPage />
    </MemoryRouter>
  );
}

describe('ConfirmEmailPage', () => {
  beforeEach(() => {
    vi.mocked(api.authApi.verifyEmail).mockReset();
  });

  it('auto-verifies when token is present in URL and shows success', async () => {
    vi.mocked(api.authApi.verifyEmail).mockResolvedValue({
      data: { message: 'ok' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
    wrap('/confirm-email?token=test-token');
    expect(screen.getByText(/проверяем ссылку подтверждения/i)).toBeInTheDocument();
    expect(await screen.findByText(/email подтверждён/i)).toBeInTheDocument();
    expect(api.authApi.verifyEmail).toHaveBeenCalledWith('test-token');
  });

  it('shows error when verification fails', async () => {
    vi.mocked(api.authApi.verifyEmail).mockRejectedValue(new Error('Bad token'));
    vi.mocked(api.getApiErrorMessage).mockReturnValue('Ошибка подтверждения');
    const user = userEvent.setup();
    wrap();
    await user.type(screen.getByLabelText(/токен подтверждения/i), 'bad-token');
    await user.click(screen.getByRole('button', { name: /подтвердить email/i }));
    expect(await screen.findByText('Ошибка подтверждения')).toBeInTheDocument();
  });
});

