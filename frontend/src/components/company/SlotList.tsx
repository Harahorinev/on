import type { CompanyEmployee, ScheduleSlot, SlotStatus } from '@/lib/api';

const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: 'Открыт',
  CANCELLED: 'Отменён',
  CLOSED: 'Закрыт',
};

export function SlotList({
  slots,
  employees,
  slotUpdatingId,
  onEmployeeChange,
}: {
  slots: ScheduleSlot[];
  employees: CompanyEmployee[];
  slotUpdatingId: string | null;
  onEmployeeChange: (slotId: string, employeeId: string) => void;
}) {
  return (
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
                onChange={(e) => onEmployeeChange(slot.id, e.target.value)}
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
  );
}
