import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { companiesApi, employeesApi, getApiErrorMessage, slotsApi } from '../lib/api';
import type { Company, CompanyEmployee, ScheduleSlot, SlotStatus } from '../lib/api';
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
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDescription, setEmployeeDescription] = useState('');
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [employeeSaveError, setEmployeeSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setEmployeeLoadError('');
    try {
      const companyRes = await companiesApi.getMy();
      setCompany(companyRes.data);
      const [slotsRes, employeesRes] = await Promise.allSettled([
        slotsApi.list(companyRes.data.id),
        employeesApi.list(companyRes.data.id),
      ]);
      if (slotsRes.status === 'fulfilled') {
        setSlots(slotsRes.value.data);
      } else {
        setError('Не удалось загрузить слоты');
      }
      if (employeesRes.status === 'fulfilled') {
        setEmployees(employeesRes.value.data);
      } else {
        setEmployees([]);
        const status = (employeesRes.reason as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setEmployeeLoadError('Управление сотрудниками станет доступно после обновления backend.');
        } else {
          setEmployeeLoadError('Не удалось загрузить сотрудников.');
        }
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setCompany(null);
        setSlots([]);
        setEmployees([]);
      } else {
        setError('Не удалось загрузить данные');
      }
    } finally {
      setLoading(false);
    }
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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    const name = employeeName.trim();
    if (!name) {
      setEmployeeSaveError('Укажите имя сотрудника');
      return;
    }
    setEmployeeSaveError('');
    setEmployeeSaving(true);
    try {
      const res = await employeesApi.create(company.id, {
        name,
        description: employeeDescription.trim() || undefined,
      });
      setEmployees((prev) => [res.data, ...prev]);
      setEmployeeName('');
      setEmployeeDescription('');
      setShowEmployeeForm(false);
    } catch (err: unknown) {
      setEmployeeSaveError(getApiErrorMessage(err, 'Не удалось сохранить сотрудника'));
    } finally {
      setEmployeeSaving(false);
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

      <h2>Сотрудники</h2>
      {showEmployeeForm ? (
        <form className="card form-card-wide mb-1" onSubmit={handleCreateEmployee}>
          <div className="form-group">
            <label htmlFor="employee-name">Имя сотрудника</label>
            <input
              id="employee-name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Например, Иван Петров"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="employee-description">Описание</label>
            <textarea
              id="employee-description"
              value={employeeDescription}
              onChange={(e) => setEmployeeDescription(e.target.value)}
              rows={3}
              placeholder="Опыт, специализация и т.д."
            />
          </div>
          {employeeSaveError && <p className="error">{employeeSaveError}</p>}
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={employeeSaving}>
              {employeeSaving ? 'Сохранение…' : 'Сохранить сотрудника'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowEmployeeForm(false);
                setEmployeeSaveError('');
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-primary mb-1" onClick={() => setShowEmployeeForm(true)}>
          Добавить сотрудника
        </button>
      )}

      {employeeLoadError && <p className="muted">{employeeLoadError}</p>}
      <div className="stack">
        {employees.map((employee) => (
          <div key={employee.id} className="card">
            <strong>{employee.name}</strong>
            {employee.description && <p className="text-muted">{employee.description}</p>}
          </div>
        ))}
        {employees.length === 0 && !employeeLoadError && <p>Сотрудников пока нет.</p>}
      </div>
    </>
  );
}
