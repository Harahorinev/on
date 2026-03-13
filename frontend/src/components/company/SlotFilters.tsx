import type { CompanyEmployee, SlotSortBy } from '@/lib/api';

export function SlotFilters({
  employees,
  slotEmployeeFilterId,
  slotDateFrom,
  slotDateTo,
  slotSortBy,
  slotSortOrder,
  onEmployeeChange,
  onDateFromChange,
  onDateToChange,
  onSortByChange,
  onSortOrderChange,
  onApply,
  onReset,
}: {
  employees: CompanyEmployee[];
  slotEmployeeFilterId: string;
  slotDateFrom: string;
  slotDateTo: string;
  slotSortBy: SlotSortBy;
  slotSortOrder: 'asc' | 'desc';
  onEmployeeChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSortByChange: (value: SlotSortBy) => void;
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <div className="card mb-1">
      <p className="text-sm mt-0 mb-half text-muted">Фильтры и сортировка слотов</p>
      <div className="filter-row">
        <div className="form-group mb-0">
          <label htmlFor="slot-filter-employee">Сотрудник</label>
          <select id="slot-filter-employee" value={slotEmployeeFilterId} onChange={(e) => onEmployeeChange(e.target.value)}>
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
          <input id="slot-filter-date-from" type="date" value={slotDateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <div className="form-group mb-0">
          <label htmlFor="slot-filter-date-to">По</label>
          <input id="slot-filter-date-to" type="date" value={slotDateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
        <div className="form-group mb-0">
          <label htmlFor="slot-sort-by">Сортировка</label>
          <select id="slot-sort-by" value={slotSortBy} onChange={(e) => onSortByChange(e.target.value as SlotSortBy)}>
            <option value="startAt">По времени</option>
            <option value="employeeName">По сотруднику</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <label htmlFor="slot-sort-order">Порядок</label>
          <select
            id="slot-sort-order"
            value={slotSortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')}
          >
            <option value="asc">По возрастанию</option>
            <option value="desc">По убыванию</option>
          </select>
        </div>
      </div>
      <div className="row">
        <button type="button" className="btn btn-secondary" onClick={onApply}>
          Применить
        </button>
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Сбросить
        </button>
      </div>
    </div>
  );
}
