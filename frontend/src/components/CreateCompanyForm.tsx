import { useState } from 'react';
import { companiesApi } from '../lib/api';

export function CreateCompanyForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
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
      onSuccess();
    } catch (err: unknown) {
      setError(err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3>Новая компания</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="form-group">
          <label>Часовой пояс</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="UTC">UTC</option>
            <option value="Europe/Moscow">Europe/Moscow</option>
            <option value="Europe/Kyiv">Europe/Kyiv</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Создание…' : 'Создать'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ marginLeft: '0.5rem' }}>
          Отмена
        </button>
      </form>
    </div>
  );
}
