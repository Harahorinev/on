import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi, slotsApi } from '../lib/api';
import type { Company, ScheduleSlot } from '../lib/api';
import { CreateCompanyForm } from '../components/CreateCompanyForm';
import { CreateSlotForm } from '../components/CreateSlotForm';

export function CompanyPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);

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

  useEffect(() => load(), [load]);

  if (user?.role !== 'COMPANY') {
    return <p>Доступ только для компании.</p>;
  }
  if (loading) return <p>Загрузка…</p>;
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
        <button type="button" className="btn btn-primary mb-1" onClick={() => setShowSlotForm(true)}>
          Добавить слот
        </button>
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
              <p className="text-sm m-0">
                Записано: {booked} / {slot.capacity}, статус: {slot.status}
              </p>
            </div>
          );
        })}
        {slots.length === 0 && <p>Слотов пока нет.</p>}
      </div>
    </>
  );
}
