import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="nav">
        <Link to="/">Расписание</Link>
        {user ? (
          <>
            {user.role === 'USER' && (
              <>
                <Link to="/companies">Компании</Link>
                <Link to="/bookings">Мои записи</Link>
              </>
            )}
            {user.role === 'COMPANY' && (
              <Link to="/company">Кабинет компании</Link>
            )}
            <span className="nav-user">
              {user.name} ({user.role === 'USER' ? 'Пользователь' : 'Компания'})
              <button type="button" className="btn btn-secondary" onClick={handleLogout} style={{ marginLeft: '1rem' }}>
                Выйти
              </button>
            </span>
          </>
        ) : (
          <>
            <Link to="/login">Вход</Link>
            <Link to="/register">Регистрация</Link>
          </>
        )}
      </nav>
      <main className="container" style={{ paddingTop: '1.5rem' }}>
        {children}
      </main>
    </>
  );
}
