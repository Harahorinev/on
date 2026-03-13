import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi, getApiErrorMessage } from '@/lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль не менее 6 символов');
      return;
    }
    const t = token.trim();
    if (!t) {
      setError('Укажите токен из письма или вставьте ссылку из письма в адресную строку');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token: t, newPassword: password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось установить пароль'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card form-card">
        <h1 className="mt-0">Пароль изменён</h1>
        <p className="success">Новый пароль сохранён. Войдите в аккаунт.</p>
        <p className="mt-1">
          <Link to="/login" className="btn btn-primary">Войти</Link>
        </p>
      </div>
    );
  }

  const hasToken = tokenFromUrl.length > 0;

  return (
    <div className="card form-card">
      <h1 className="mt-0">Новый пароль</h1>
      <p className="muted mb-1">
        {hasToken
          ? 'Введите новый пароль (не менее 6 символов).'
          : 'Вставьте токен из письма или откройте ссылку из письма.'}
      </p>
      <form onSubmit={handleSubmit}>
        {!hasToken && (
          <div className="form-group">
            <label htmlFor="reset-token">Токен из письма</label>
            <input
              id="reset-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Вставьте токен из ссылки"
              autoComplete="one-time-code"
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="reset-password">Новый пароль</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="reset-confirm">Повторите пароль</label>
          <input
            id="reset-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Сохранение…' : 'Сохранить пароль'}
        </button>
      </form>
      <p className="mt-1">
        <Link to="/login">Вернуться к входу</Link>
      </p>
    </div>
  );
}
