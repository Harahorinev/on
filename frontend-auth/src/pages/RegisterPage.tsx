import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, getApiErrorMessage } from '../lib/api';
import type { User, UserRole } from '../lib/api';

interface RegisterPageProps {
  onLogin: (token: string, user: User) => void;
}

export function RegisterPage({ onLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Пароль не менее 6 символов');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({ email, password, name, role });
      onLogin(data.accessToken, data.user);
      if (data.user.role === 'COMPANY') navigate('/company');
      else navigate('/companies');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка регистрации'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card">
      <h1 className="mt-0">Регистрация</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-password">Пароль (не менее 6 символов)</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-name">Имя</label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-role">Регистрируюсь как</label>
          <select id="register-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="USER">Пользователь (записываться на слоты)</option>
            <option value="COMPANY">Компания (выставлять расписание)</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Регистрация…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="mt-1">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
