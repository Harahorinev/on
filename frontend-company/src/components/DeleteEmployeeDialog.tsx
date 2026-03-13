import { ActionDialog } from '@/components/ActionDialog';
import type { CompanyEmployee } from '@/lib/api';

export function DeleteEmployeeDialog({
  employee,
  deleting,
  onKeepWithoutEmployee,
  onDeleteWithEvents,
  onCancel,
}: {
  employee: CompanyEmployee;
  deleting: boolean;
  onKeepWithoutEmployee: () => void;
  onDeleteWithEvents: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionDialog
      title="Удаление сотрудника"
      lines={[
        <>
          Что сделать с будущими событиями сотрудника <strong>{employee.name}</strong>?
        </>,
        'Прошедшие события сохранят удалённого сотрудника в истории, чтобы было видно, кто именно их проводил.',
        'Будущие события можно оставить без исполнителя для переназначения другому сотруднику или удалить вместе с ним.',
      ]}
      actions={[
        {
          label: 'Оставить без исполнителя',
          variant: 'secondary',
          disabled: deleting,
          onClick: onKeepWithoutEmployee,
        },
        {
          label: 'Удалить вместе с событиями',
          variant: 'danger',
          disabled: deleting,
          onClick: onDeleteWithEvents,
        },
        {
          label: 'Отмена',
          variant: 'secondary',
          disabled: deleting,
          onClick: onCancel,
        },
      ]}
    />
  );
}
