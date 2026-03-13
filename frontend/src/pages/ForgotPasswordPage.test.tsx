import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as api from '@/lib/api';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';

vi.mock('@/lib/api', () => ({
  authApi: {
    forgotPassword: vi.fn(),
  },
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

function wrap(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(api.authApi.forgotPassword).mockReset();
  });

  it('renders form with email input and submit button', () => {
    wrap(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /отправить ссылку/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /вернуться к входу/i })).toBeInTheDocument();
  });

  it('shows success message after successful submit', async () => {
    vi.mocked(api.authApi.forgotPassword).mockResolvedValue({
      data: { message: 'If the email exists, a reset link was sent.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
    const user = userEvent.setup();
    wrap(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /отправить ссылку/i }));
    expect(await screen.findByText(/если указанный email зарегистрирован/i)).toBeInTheDocument();
  });

  it('shows error on API failure', async () => {
    vi.mocked(api.authApi.forgotPassword).mockRejectedValue(new Error('Network error'));
    vi.mocked(api.getApiErrorMessage).mockReturnValue('Ошибка запроса');
    const user = userEvent.setup();
    wrap(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /отправить ссылку/i }));
    expect(await screen.findByText('Ошибка запроса')).toBeInTheDocument();
  });
});
