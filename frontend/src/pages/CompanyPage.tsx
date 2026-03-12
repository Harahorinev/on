import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi, getApiErrorMessage, slotsApi } from '../lib/api';
import type { Company, ScheduleSlot, SlotStatus } from '../lib/api';
import { CreateCompanyForm } from '../components/CreateCompanyForm';
import { CreateSlotForm } from '../components/CreateSlotForm';

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: 'Открыт',
  CANCELLED: 'Отменён',
  CLOSED: 'Закрыт',
};

export function CompanyPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    companiesApi
      .getMy()
      .then((r) => {
        setCompany(r.data);
        return slotsApi.list(r.data.id);
      })
      .then((r) => setSlots(r.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setCompany(null);
          setSlots([]);
        } else {
          setError('Не удалось загрузить данные');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== 'COMPANY') return;
    void load();
  }, [load, user?.role]);

  const handleExportCsv = async () => {
    if (!company) return;
    setError('');
    setExportLoading(true);
    try {
      const response = await companiesApi.exportScheduleCsv(company.id);
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeCompany = company.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${safeCompany}-schedule.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось экспортировать CSV'));
    } finally {
      setExportLoading(false);
    }
  };

  if (user?.role !== 'COMPANY') {
    return <p>Доступ только для компании.</p>;
  }
  if (loading) return <p className="loading-placeholder">Загрузка…</p>;
  if (error) return <p className="error">{error}</p>;

  if (!company) {
    return (
      <>
        <h1>Кабинет компании</h1>
        <p>Сначала создайте компанию.</p>
        {showCompanyForm ? (
          <CreateCompanyForm
            onSuccess={() => {
              setShowCompanyForm(false);
              load();
            }}
            onCancel={() => setShowCompanyForm(false)}
          />
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setShowCompanyForm(true)}>
            Создать компанию
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <h1>{company.name}</h1>
      {company.description && <p>{company.description}</p>}
      <h2>Слоты расписания</h2>
      {showSlotForm ? (
        <CreateSlotForm
          companyId={company.id}
          onSuccess={() => {
            setShowSlotForm(false);
            load();
          }}
          onCancel={() => setShowSlotForm(false)}
        />
      ) : (
        <div className="row mb-1">
          <button type="button" className="btn btn-primary" onClick={() => setShowSlotForm(true)}>
            Добавить слот
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExportCsv} disabled={exportLoading}>
            {exportLoading ? 'Экспорт…' : 'Экспорт CSV'}
          </button>
        </div>
      )}
      <div className="stack">
        {slots.map((slot) => {
          const start = new Date(slot.startAt);
          const end = new Date(slot.endAt);
          const booked = slot.bookings?.length ?? 0;
          return (
            <div key={slot.id} className="card">
              <strong>{slot.title || 'Слот'}</strong>
              <p className="text-muted">
                {start.toLocaleString('ru')} – {end.toLocaleString('ru')}
              </p>
              <p className="text-sm m-0">Записано: {booked} / {slot.capacity}</p>
              <p className="text-sm m-0">Статус: {SLOT_STATUS_LABEL[slot.status]}</p>
            </div>
          );
        })}
        {slots.length === 0 && <p>Слотов пока нет.</p>}
      </div>
    </>
  );
}
