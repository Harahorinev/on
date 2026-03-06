import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  authApi: {
    resetPassword: vi.fn(),
  },
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

function wrap(ui: React.ReactElement, initialEntry = '/reset-password') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      {ui}
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(api.authApi.resetPassword).mockReset();
  });

  it('renders form with password fields and link back to login', () => {
    wrap(<ResetPasswordPage />);
    expect(screen.getByLabelText(/новый пароль/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/повторите пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /сохранить пароль/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /вернуться к входу/i })).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    wrap(<ResetPasswordPage />);
    await user.type(screen.getByLabelText(/токен/i), 'some-token-123');
    await user.type(screen.getByLabelText(/новый пароль/i), 'password1');
    await user.type(screen.getByLabelText(/повторите пароль/i), 'password2');
    await user.click(screen.getByRole('button', { name: /сохранить пароль/i }));
    expect(screen.getByText(/пароли не совпадают/i)).toBeInTheDocument();
    expect(api.authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('shows success message after successful reset', async () => {
    vi.mocked(api.authApi.resetPassword).mockResolvedValue({
      data: {},
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: {} as never,
    });
    const user = userEvent.setup();
    wrap(<ResetPasswordPage />, '/reset-password?token=valid-token');
    await user.type(screen.getByLabelText(/новый пароль/i), 'newpass123');
    await user.type(screen.getByLabelText(/повторите пароль/i), 'newpass123');
    await user.click(screen.getByRole('button', { name: /сохранить пароль/i }));
    expect(await screen.findByRole('heading', { name: /пароль изменён/i })).toBeInTheDocument();
  });
});
