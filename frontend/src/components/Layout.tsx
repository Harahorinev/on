import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className={`nav ${menuOpen ? 'nav--menu-open' : ''}`}>
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          <span className="nav-toggle-icon" />
          <span className="nav-toggle-icon" />
          <span className="nav-toggle-icon" />
        </button>
        <div className="nav-menu">
          <button
            type="button"
            className="nav-close"
            onClick={closeMenu}
            aria-label="Закрыть меню"
          >
            <span className="nav-toggle-icon" />
            <span className="nav-toggle-icon" />
            <span className="nav-toggle-icon" />
          </button>
          <NavLink to="/" end onClick={closeMenu}>
            Расписание
          </NavLink>
          {user ? (
            <>
              {user.role === 'USER' && (
                <>
                  <NavLink to="/companies" onClick={closeMenu}>Компании</NavLink>
                  <NavLink to="/bookings" onClick={closeMenu}>Мои записи</NavLink>
                  <NavLink to="/calendar" onClick={closeMenu}>Мой календарь</NavLink>
                </>
              )}
              {user.role === 'COMPANY' && (
                <NavLink to="/company" onClick={closeMenu}>Кабинет компании</NavLink>
              )}
              <NavLink to="/settings" onClick={closeMenu}>Настройки</NavLink>
              <span className="nav-user">
                <span className="nav-user-name" title={`${user.name} (${user.role === 'USER' ? 'Пользователь' : 'Компания'})`}>
                  {user.name} ({user.role === 'USER' ? 'Пользователь' : 'Компания'})
                </span>
                <button type="button" className="btn btn-secondary ml-1" onClick={handleLogout}>
                  Выйти
                </button>
              </span>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenu}>Вход</NavLink>
              <NavLink to="/register" onClick={closeMenu}>Регистрация</NavLink>
            </>
          )}
        </div>
      </nav>
      <main className="container pt-main">
        {children}
      </main>
    </>
  );
}
