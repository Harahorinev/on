import { NavLink, useNavigate } from 'react-router-dom';
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
        <NavLink to="/" end>Расписание</NavLink>
        {user ? (
          <>
            {user.role === 'USER' && (
              <>
                <NavLink to="/companies">Компании</NavLink>
                <NavLink to="/bookings">Мои записи</NavLink>
                <NavLink to="/calendar">Мой календарь</NavLink>
              </>
            )}
            {user.role === 'COMPANY' && (
              <NavLink to="/company">Кабинет компании</NavLink>
            )}
            <span className="nav-user">
              {user.name} ({user.role === 'USER' ? 'Пользователь' : 'Компания'})
              <button type="button" className="btn btn-secondary ml-1" onClick={handleLogout}>
                Выйти
              </button>
            </span>
          </>
        ) : (
          <>
            <NavLink to="/login">Вход</NavLink>
            <NavLink to="/register">Регистрация</NavLink>
          </>
        )}
      </nav>
      <main className="container pt-main">
        {children}
      </main>
    </>
  );
}
