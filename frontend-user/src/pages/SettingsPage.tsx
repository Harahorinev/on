import { useState, useEffect } from 'react';
import { userApi, getApiErrorMessage, type UserPreferences } from '../lib/api';

export function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>({});
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState('');
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getPreferences()
      .then((res: { data?: UserPreferences }) => {
        if (!cancelled) setPrefs(res.data ?? {});
      })
      .catch((err: unknown) => {
        if (!cancelled) setPrefsError(getApiErrorMessage(err, 'Не удалось загрузить настройки'));
      })
      .finally(() => {
        if (!cancelled) setPrefsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsError('');
    setPrefsSuccess(false);
    setPrefsSaving(true);
    try {
      const res = await userApi.patchPreferences(prefs);
      const next = res.data ?? prefs;
      setPrefs(next);
      window.dispatchEvent(new CustomEvent<UserPreferences | undefined>('user:preferencesChanged', { detail: next }));
      setPrefsSuccess(true);
    } catch (err: unknown) {
      setPrefsError(getApiErrorMessage(err, 'Не удалось сохранить настройки'));
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword !== newPassword2) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль не менее 6 символов');
      return;
    }
    setPasswordLoading(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (err: unknown) {
      setPasswordError(getApiErrorMessage(err, 'Не удалось сменить пароль'));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1 className="mt-0">Настройки</h1>

      <section className="card form-card settings-section">
        <h2>Смена пароля</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="settings-current-password">Текущий пароль</label>
            <input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="settings-new-password">Новый пароль</label>
            <input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="settings-new-password2">Повторите новый пароль</label>
            <input
              id="settings-new-password2"
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {passwordError && <p className="error">{passwordError}</p>}
          {passwordSuccess && <p className="success">Пароль успешно изменён</p>}
          <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
            {passwordLoading ? 'Сохранение…' : 'Сменить пароль'}
          </button>
        </form>
      </section>

      <section className="card form-card settings-section">
        <h2>Уведомления и календарь</h2>
        {prefsLoading ? (
          <p>Загрузка…</p>
        ) : (
          <form onSubmit={handleSavePrefs}>
            <div className="form-group form-group--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={prefs.notifyEmail ?? false}
                  onChange={(e) => setPrefs((p) => ({ ...p, notifyEmail: e.target.checked }))}
                />
                Уведомления по email
              </label>
            </div>
            <div className="form-group form-group--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={prefs.notifyInApp ?? false}
                  onChange={(e) => setPrefs((p) => ({ ...p, notifyInApp: e.target.checked }))}
                />
                Уведомления в приложении
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="settings-calendar-view">Вид календаря</label>
              <select
                id="settings-calendar-view"
                value={prefs.calendarView ?? 'week'}
                onChange={(e) => setPrefs((p) => ({ ...p, calendarView: e.target.value as 'week' | 'month' }))}
              >
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="settings-calendar-range">Период (дней)</label>
              <select
                id="settings-calendar-range"
                value={prefs.calendarRange ?? 14}
                onChange={(e) => setPrefs((p) => ({ ...p, calendarRange: Number(e.target.value) }))}
              >
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={30}>30</option>
              </select>
            </div>
            {prefsError && <p className="error">{prefsError}</p>}
            {prefsSuccess && <p className="success">Настройки сохранены</p>}
            <button type="submit" className="btn btn-primary" disabled={prefsSaving}>
              {prefsSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
