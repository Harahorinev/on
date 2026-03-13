import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, getApiErrorMessage } from '@/lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword({ email });
      setSuccess(true);
      if (data.message) setSuccess(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка запроса сброса пароля'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card form-card">
        <h1 className="mt-0">Сброс пароля</h1>
        <p className="success">
          Если указанный email зарегистрирован, на него отправлена ссылка для сброса пароля.
          Проверьте почту и перейдите по ссылке.
        </p>
        <p className="mt-1">
          <Link to="/login">Вернуться к входу</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card form-card">
      <h1 className="mt-0">Забыли пароль?</h1>
      <p className="muted mb-1">Введите email — мы отправим ссылку для сброса пароля.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Отправка…' : 'Отправить ссылку'}
        </button>
      </form>
      <p className="mt-1">
        <Link to="/login">Вернуться к входу</Link>
      </p>
    </div>
  );
}
