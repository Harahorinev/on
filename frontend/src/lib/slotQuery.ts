import type { SlotSortBy } from '@/lib/api';
import { dateInputToIsoBoundary } from '@/lib/date';

export function buildSlotQueryParams(input: {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  sortBy?: SlotSortBy;
  sortOrder?: 'asc' | 'desc';
}) {
  return {
    dateFrom: input.dateFrom ? dateInputToIsoBoundary(input.dateFrom, false) : undefined,
    dateTo: input.dateTo ? dateInputToIsoBoundary(input.dateTo, true) : undefined,
    employeeId: input.employeeId || undefined,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  };
}
