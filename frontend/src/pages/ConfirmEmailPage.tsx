import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi, getApiErrorMessage } from '@/lib/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [status, setStatus] = useState<Status>(tokenFromUrl ? 'loading' : 'idle');
  const [error, setError] = useState('');

  const effectiveToken = tokenFromUrl || token;

  useEffect(() => {
    if (!tokenFromUrl) return;
    void handleVerify(tokenFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  const handleVerify = async (rawToken?: string) => {
    const t = (rawToken ?? token).trim();
    if (!t) {
      setError('Укажите токен подтверждения из письма.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await authApi.verifyEmail(t);
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setError(getApiErrorMessage(err, 'Не удалось подтвердить email'));
    }
  };

  if (status === 'loading') {
    return (
      <div className="card form-card">
        <h1 className="mt-0">Подтверждение email</h1>
        <p className="muted">Проверяем ссылку подтверждения…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="card form-card">
        <h1 className="mt-0">Email подтверждён</h1>
        <p className="success">Ваш email успешно подтверждён. Теперь вы можете войти в аккаунт.</p>
        <p className="mt-1">
          <Link to="/login" className="btn btn-primary">
            Войти
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card form-card">
      <h1 className="mt-0">Подтверждение email</h1>
      <p className="muted mb-1">
        {effectiveToken
          ? 'Нажмите кнопку ниже, чтобы ещё раз подтвердить email.'
          : 'Откройте ссылку из письма или вставьте токен подтверждения email.'}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify();
        }}
      >
        {!tokenFromUrl && (
          <div className="form-group">
            <label htmlFor="confirm-email-token">Токен подтверждения</label>
            <input
              id="confirm-email-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Вставьте токен из ссылки"
              autoComplete="one-time-code"
            />
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Подтвердить email
        </button>
      </form>
      <p className="mt-1">
        <Link to="/login">Вернуться к входу</Link>
      </p>
    </div>
  );
}

