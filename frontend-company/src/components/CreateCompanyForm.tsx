import { useState } from 'react';
import { companiesApi, getApiErrorMessage } from '@/lib/api';

export function CreateCompanyForm({
  onSuccess,
  onCancel,
  notifySuccess,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  notifySuccess: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await companiesApi.create({ name, description: description || undefined, timezone });
      notifySuccess('Компания создана');
      onSuccess();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка создания'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card-wide">
      <h3>Новая компания</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="company-name">Название</label>
          <input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="company-description">Описание</label>
          <textarea id="company-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="form-group">
          <label htmlFor="company-timezone">Часовой пояс</label>
          <select id="company-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="UTC">UTC</option>
            <option value="Europe/Moscow">Europe/Moscow</option>
            <option value="Europe/Kyiv">Europe/Kyiv</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Создание…' : 'Создать'}
        </button>
        <button type="button" className="btn btn-secondary ml-half" onClick={onCancel}>
          Отмена
        </button>
      </form>
    </div>
  );
}
