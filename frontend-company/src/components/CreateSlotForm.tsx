import { useState } from 'react';
import { slotsApi, getApiErrorMessage } from '../lib/api';

export function CreateSlotForm({
  companyId,
  onSuccess,
  onCancel,
  notifySuccess,
}: {
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
  notifySuccess: (msg: string) => void;
}) {
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Неверный формат даты/времени');
      return;
    }
    const now = new Date();
    if (start < now) {
      setError('Нельзя создавать слот в прошлом');
      return;
    }
    if (end <= start) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setLoading(true);
    try {
      await slotsApi.create(companyId, {
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        capacity,
        title: title || undefined,
        description: description || undefined,
        location: location || undefined,
      });
      notifySuccess('Слот создан');
      onSuccess();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка создания слота'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-card-wide mb-1">
      <h3>Новый слот</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="slot-start">Начало (дата и время)</label>
          <input
            id="slot-start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="slot-end">Окончание (дата и время)</label>
          <input
            id="slot-end"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="slot-capacity">Количество мест</label>
          <input
            id="slot-capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Название (необязательно)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Описание (необязательно)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="form-group">
          <label>Место (необязательно)</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Создание…' : 'Создать слот'}
        </button>
        <button type="button" className="btn btn-secondary ml-half" onClick={onCancel}>
          Отмена
        </button>
      </form>
    </div>
  );
}
