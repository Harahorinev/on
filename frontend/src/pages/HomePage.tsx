import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const { user, isReady } = useAuth();

  if (!isReady) return <p>Загрузка…</p>;

  return (
    <>
      <h1>Расписание</h1>
      <p>Записывайтесь на слоты компаний или управляйте расписанием своей компании.</p>
      {user ? (
        <p>
          {user.role === 'USER' ? (
            <>
              <Link to="/companies">Перейти к компаниям</Link> или{' '}
              <Link to="/bookings">мои записи</Link>.
            </>
          ) : (
            <>
              <Link to="/company">Кабинет компании</Link>.
            </>
          )}
        </p>
      ) : (
        <p>
          <Link to="/login">Войдите</Link> или <Link to="/register">зарегистрируйтесь</Link>, чтобы продолжить.
        </p>
      )}
    </>
  );
}
