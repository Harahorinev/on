import { useCallback, useEffect, useState } from 'react';
import { CreateCompanyForm } from '@/components/CreateCompanyForm';
import { CreateSlotForm } from '@/components/CreateSlotForm';
import { DeleteEmployeeDialog } from '@/components/company/DeleteEmployeeDialog';
import { EmployeeSection } from '@/components/company/EmployeeSection';
import { SlotFilters } from '@/components/company/SlotFilters';
import { SlotList } from '@/components/company/SlotList';
import { useAuth } from '@/contexts/AuthContext';
import { companiesApi, directionsApi, employeesApi, getApiErrorMessage, slotsApi } from '@/lib/api';
import type { Company, CompanyEmployee, Direction, ScheduleSlot, SlotSortBy } from '@/lib/api';
import { buildSlotQueryParams } from '@/lib/slotQuery';

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

  const resetEmployeeForm = useCallback(() => {
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
    setEmployeeSaveError('');
    setEmployeeName('');
    setEmployeeDescription('');
    setEmployeeDirectionIds([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setEmployeeLoadError('');
    try {
      const companyRes = await companiesApi.getMy();
      setCompany(companyRes.data);
      const slotParams = buildSlotQueryParams({
        dateFrom: slotDateFrom,
        dateTo: slotDateTo,
        employeeId: slotEmployeeFilterId || undefined,
        sortBy: slotSortBy,
        sortOrder: slotSortOrder,
      });
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
      const response = await companiesApi.exportScheduleCsv(company.id, buildSlotQueryParams({
        dateFrom: slotDateFrom,
        dateTo: slotDateTo,
        employeeId: slotEmployeeFilterId || undefined,
        sortBy: slotSortBy,
        sortOrder: slotSortOrder,
      }));
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
      const response = await slotsApi.update(company.id, slotId, {
        employeeId: employeeId || null,
      });
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
      resetEmployeeForm();
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
    if (!company) return;
    if (!pendingEmployeeDelete) return;
    const employeeId = pendingEmployeeDelete.id;
    setEmployeeDeletingId(employeeId);
    setEmployeeSaveError('');
    try {
      await employeesApi.delete(company.id, employeeId, { deleteFutureSlots });
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      if (editingEmployeeId === employeeId) {
        resetEmployeeForm();
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
      <SlotFilters
        employees={employees}
        slotEmployeeFilterId={slotEmployeeFilterId}
        slotDateFrom={slotDateFrom}
        slotDateTo={slotDateTo}
        slotSortBy={slotSortBy}
        slotSortOrder={slotSortOrder}
        onEmployeeChange={setSlotEmployeeFilterId}
        onDateFromChange={setSlotDateFrom}
        onDateToChange={setSlotDateTo}
        onSortByChange={setSlotSortBy}
        onSortOrderChange={setSlotSortOrder}
        onApply={() => void load()}
        onReset={() => {
          setSlotEmployeeFilterId('');
          setSlotDateFrom('');
          setSlotDateTo('');
          setSlotSortBy('startAt');
          setSlotSortOrder('asc');
        }}
      />
      <SlotList
        slots={slots}
        employees={employees}
        slotUpdatingId={slotUpdatingId}
        onEmployeeChange={(slotId, employeeId) => void handleSlotEmployeeChange(slotId, employeeId)}
      />

      <EmployeeSection
        employees={employees}
        directions={directions}
        employeeLoadError={employeeLoadError}
        showEmployeeForm={showEmployeeForm}
        editingEmployeeId={editingEmployeeId}
        employeeName={employeeName}
        employeeDescription={employeeDescription}
        employeeDirectionIds={employeeDirectionIds}
        employeeSaving={employeeSaving}
        employeeSaveError={employeeSaveError}
        employeeDeletingId={employeeDeletingId}
        onShowForm={() => setShowEmployeeForm(true)}
        onSubmit={handleCreateEmployee}
        onNameChange={setEmployeeName}
        onDescriptionChange={setEmployeeDescription}
        onDirectionToggle={handleDirectionToggle}
        onCancel={resetEmployeeForm}
        onEdit={handleStartEditEmployee}
        onDelete={handleDeleteEmployee}
      />

      {pendingEmployeeDelete && (
        <DeleteEmployeeDialog
          employee={pendingEmployeeDelete}
          deleting={employeeDeletingId === pendingEmployeeDelete.id}
          onKeepWithoutEmployee={() => void handleConfirmDeleteEmployee(false)}
          onDeleteWithEvents={() => void handleConfirmDeleteEmployee(true)}
          onCancel={() => setPendingEmployeeDelete(null)}
        />
      )}
    </>
  );
}
