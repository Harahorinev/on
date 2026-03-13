import type { CompanyEmployee, Direction } from '@/lib/api';

export function EmployeeSection({
  employees,
  directions,
  employeeLoadError,
  showEmployeeForm,
  editingEmployeeId,
  employeeName,
  employeeDescription,
  employeeDirectionIds,
  employeeSaving,
  employeeSaveError,
  employeeDeletingId,
  onShowForm,
  onSubmit,
  onNameChange,
  onDescriptionChange,
  onDirectionToggle,
  onCancel,
  onEdit,
  onDelete,
}: {
  employees: CompanyEmployee[];
  directions: Direction[];
  employeeLoadError: string;
  showEmployeeForm: boolean;
  editingEmployeeId: string | null;
  employeeName: string;
  employeeDescription: string;
  employeeDirectionIds: string[];
  employeeSaving: boolean;
  employeeSaveError: string;
  employeeDeletingId: string | null;
  onShowForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDirectionToggle: (directionId: string) => void;
  onCancel: () => void;
  onEdit: (employee: CompanyEmployee) => void;
  onDelete: (employee: CompanyEmployee) => void;
}) {
  return (
    <>
      <h2>Сотрудники</h2>
      {showEmployeeForm ? (
        <form className="card form-card-wide mb-1" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="employee-name">Имя сотрудника</label>
            <input
              id="employee-name"
              value={employeeName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Например, Иван Петров"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="employee-description">Описание</label>
            <textarea
              id="employee-description"
              value={employeeDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
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
                      onChange={() => onDirectionToggle(direction.id)}
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
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-primary mb-1" onClick={onShowForm}>
          Добавить сотрудника
        </button>
      )}

      {employeeLoadError && <p className="muted">{employeeLoadError}</p>}
      <div className="stack">
        {employees.map((employee) => (
          <div key={employee.id} className="card">
            <strong>{employee.name}</strong>
            {employee.description && <p className="text-muted">{employee.description}</p>}
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={() => onEdit(employee)}>
                Редактировать
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={employeeDeletingId === employee.id}
                onClick={() => onDelete(employee)}
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
