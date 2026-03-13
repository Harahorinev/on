import { useCallback, useEffect, useState } from 'react';
import { CreateCompanyForm } from '@/components/CreateCompanyForm';
import { CreateSlotForm } from '@/components/CreateSlotForm';
import { DeleteEmployeeDialog } from '@/components/DeleteEmployeeDialog';
import { companiesApi, directionsApi, employeesApi, getApiErrorMessage, slotsApi } from '@/lib/api';
import type { Company, CompanyEmployee, Direction, ScheduleSlot, SlotSortBy, SlotStatus, User } from '@/lib/api';

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: 'Открыт',
  CANCELLED: 'Отменён',
  CLOSED: 'Закрыт',
};

function dateFromToISO(dateStr: string, endOfDay: boolean) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.toISOString();
}

export interface CompanyPageProps {
  user: User | null;
  notifySuccess: (msg: string) => void;
}

export function CompanyPage({ user, notifySuccess }: CompanyPageProps) {
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
  const [employeeDirectionIds, setEmployeeDirectionIds] = useState<string[]>([]);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [employeeSaveError, setEmployeeSaveError] = useState('');
  const [directions, setDirections] = useState<Direction[]>([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeDeletingId, setEmployeeDeletingId] = useState<string | null>(null);
  const [pendingEmployeeDelete, setPendingEmployeeDelete] = useState<CompanyEmployee | null>(null);
  const [slotEmployeeFilterId, setSlotEmployeeFilterId] = useState('');
  const [slotDateFrom, setSlotDateFrom] = useState('');
  const [slotDateTo, setSlotDateTo] = useState('');
  const [slotSortBy, setSlotSortBy] = useState<SlotSortBy>('startAt');
  const [slotSortOrder, setSlotSortOrder] = useState<'asc' | 'desc'>('asc');
  const [slotUpdatingId, setSlotUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setEmployeeLoadError('');
    try {
      const companyRes = await companiesApi.getMy();
      setCompany(companyRes.data);
      const slotParams = {
        dateFrom: slotDateFrom ? dateFromToISO(slotDateFrom, false) : undefined,
        dateTo: slotDateTo ? dateFromToISO(slotDateTo, true) : undefined,
        employeeId: slotEmployeeFilterId || undefined,
        sortBy: slotSortBy,
        sortOrder: slotSortOrder,
      };
      const [slotsRes, employeesRes, directionsRes] = await Promise.allSettled([
        slotsApi.list(companyRes.data.id, slotParams),
        employeesApi.list(companyRes.data.id),
        directionsApi.list(companyRes.data.id),
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
      if (directionsRes.status === 'fulfilled') {
        setDirections(directionsRes.value.data);
      } else {
        setDirections([]);
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
  }, [slotDateFrom, slotDateTo, slotEmployeeFilterId, slotSortBy, slotSortOrder]);

  useEffect(() => {
    if (user?.role !== 'COMPANY') return;
    void load();
  }, [load, user?.role]);

  const handleExportCsv = async () => {
    if (!company) return;
    setError('');
    setExportLoading(true);
    try {
      const response = await companiesApi.exportScheduleCsv(company.id, {
        dateFrom: slotDateFrom ? dateFromToISO(slotDateFrom, false) : undefined,
        dateTo: slotDateTo ? dateFromToISO(slotDateTo, true) : undefined,
        employeeId: slotEmployeeFilterId || undefined,
        sortBy: slotSortBy,
        sortOrder: slotSortOrder,
      });
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

  const handleSlotEmployeeChange = async (slotId: string, employeeId: string) => {
    if (!company) return;
    setError('');
    setSlotUpdatingId(slotId);
    try {
      const response = await slotsApi.update(company.id, slotId, { employeeId: employeeId || null });
      setSlots((prev) => prev.map((slot) => (slot.id === slotId ? response.data : slot)));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось назначить сотрудника для слота'));
    } finally {
      setSlotUpdatingId(null);
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
      if (editingEmployeeId) {
        const res = await employeesApi.update(company.id, editingEmployeeId, {
          name,
          description: employeeDescription.trim() || undefined,
          directionIds: employeeDirectionIds,
        });
        setEmployees((prev) => prev.map((employee) => (employee.id === editingEmployeeId ? res.data : employee)));
      } else {
        const res = await employeesApi.create(company.id, {
          name,
          description: employeeDescription.trim() || undefined,
          directionIds: employeeDirectionIds,
        });
        setEmployees((prev) => [res.data, ...prev]);
      }
      setEmployeeName('');
      setEmployeeDescription('');
      setEmployeeDirectionIds([]);
      setShowEmployeeForm(false);
      setEditingEmployeeId(null);
    } catch (err: unknown) {
      setEmployeeSaveError(getApiErrorMessage(err, 'Не удалось сохранить сотрудника'));
    } finally {
      setEmployeeSaving(false);
    }
  };

  const handleStartEditEmployee = (employee: CompanyEmployee) => {
    setEditingEmployeeId(employee.id);
    setShowEmployeeForm(true);
    setEmployeeName(employee.name);
    setEmployeeDescription(employee.description ?? '');
    setEmployeeDirectionIds(employee.directionIds ?? []);
    setEmployeeSaveError('');
  };

  const handleDeleteEmployee = (employee: CompanyEmployee) => {
    setPendingEmployeeDelete(employee);
    setEmployeeSaveError('');
  };

  const handleConfirmDeleteEmployee = async (deleteFutureSlots: boolean) => {
    if (!company || !pendingEmployeeDelete) return;
    const employeeId = pendingEmployeeDelete.id;
    setEmployeeDeletingId(employeeId);
    setEmployeeSaveError('');
    try {
      await employeesApi.delete(company.id, employeeId, { deleteFutureSlots });
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      if (editingEmployeeId === employeeId) {
        setEditingEmployeeId(null);
        setShowEmployeeForm(false);
        setEmployeeName('');
        setEmployeeDescription('');
        setEmployeeDirectionIds([]);
      }
      setPendingEmployeeDelete(null);
      await load();
    } catch (err: unknown) {
      setEmployeeSaveError(getApiErrorMessage(err, 'Не удалось удалить сотрудника'));
    } finally {
      setEmployeeDeletingId(null);
    }
  };

  const handleDirectionToggle = (directionId: string) => {
    setEmployeeDirectionIds((prev) =>
      prev.includes(directionId) ? prev.filter((id) => id !== directionId) : [...prev, directionId]
    );
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
            notifySuccess={notifySuccess}
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
          employees={employees}
          onSuccess={() => {
            setShowSlotForm(false);
            load();
          }}
          onCancel={() => setShowSlotForm(false)}
          notifySuccess={notifySuccess}
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
      <div className="card mb-1">
        <p className="text-sm mt-0 mb-half text-muted">Фильтры и сортировка слотов</p>
        <div className="filter-row">
          <div className="form-group mb-0">
            <label htmlFor="slot-filter-employee">Сотрудник</label>
            <select id="slot-filter-employee" value={slotEmployeeFilterId} onChange={(e) => setSlotEmployeeFilterId(e.target.value)}>
              <option value="">Все сотрудники и неназначенные</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group mb-0">
            <label htmlFor="slot-filter-date-from">С</label>
            <input id="slot-filter-date-from" type="date" value={slotDateFrom} onChange={(e) => setSlotDateFrom(e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="slot-filter-date-to">По</label>
            <input id="slot-filter-date-to" type="date" value={slotDateTo} onChange={(e) => setSlotDateTo(e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="slot-sort-by">Сортировка</label>
            <select id="slot-sort-by" value={slotSortBy} onChange={(e) => setSlotSortBy(e.target.value as SlotSortBy)}>
              <option value="startAt">По времени</option>
              <option value="employeeName">По сотруднику</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label htmlFor="slot-sort-order">Порядок</label>
            <select id="slot-sort-order" value={slotSortOrder} onChange={(e) => setSlotSortOrder(e.target.value as 'asc' | 'desc')}>
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>
            Применить
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSlotEmployeeFilterId('');
              setSlotDateFrom('');
              setSlotDateTo('');
              setSlotSortBy('startAt');
              setSlotSortOrder('asc');
            }}
          >
            Сбросить
          </button>
        </div>
      </div>
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
              <p className="text-sm m-0">Сотрудник: {slot.employee?.name ?? 'Не назначен'}</p>
              <div className="form-group mt-half mb-0">
                <label htmlFor={`slot-employee-${slot.id}`}>Назначить сотрудника</label>
                <select
                  id={`slot-employee-${slot.id}`}
                  value={slot.employeeId ?? ''}
                  disabled={slotUpdatingId === slot.id}
                  onChange={(e) => void handleSlotEmployeeChange(slot.id, e.target.value)}
                >
                  <option value="">Не назначен</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
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
          {directions.length > 0 && (
            <div className="form-group form-group--checkbox">
              <label>Направления</label>
              <div className="stack-sm">
                {directions.map((direction) => (
                  <label key={direction.id}>
                    <input
                      type="checkbox"
                      checked={employeeDirectionIds.includes(direction.id)}
                      onChange={() => handleDirectionToggle(direction.id)}
                    />
                    {direction.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {employeeSaveError && <p className="error">{employeeSaveError}</p>}
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={employeeSaving}>
              {employeeSaving ? 'Сохранение…' : editingEmployeeId ? 'Сохранить изменения' : 'Сохранить сотрудника'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditingEmployeeId(null);
                setShowEmployeeForm(false);
                setEmployeeSaveError('');
                setEmployeeName('');
                setEmployeeDescription('');
                setEmployeeDirectionIds([]);
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

      {pendingEmployeeDelete && (
        <DeleteEmployeeDialog
          employee={pendingEmployeeDelete}
          deleting={employeeDeletingId === pendingEmployeeDelete.id}
          onKeepWithoutEmployee={() => void handleConfirmDeleteEmployee(false)}
          onDeleteWithEvents={() => void handleConfirmDeleteEmployee(true)}
          onCancel={() => setPendingEmployeeDelete(null)}
        />
      )}

      {employeeLoadError && <p className="muted">{employeeLoadError}</p>}
      <div className="stack">
        {employees.map((employee) => (
          <div key={employee.id} className="card">
            <strong>{employee.name}</strong>
            {employee.description && <p className="text-muted">{employee.description}</p>}
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={() => handleStartEditEmployee(employee)}>
                Редактировать
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={employeeDeletingId === employee.id}
                onClick={() => handleDeleteEmployee(employee)}
              >
                {employeeDeletingId === employee.id ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        ))}
        {employees.length === 0 && !employeeLoadError && <p>Сотрудников пока нет.</p>}
      </div>
    </>
  );
}
