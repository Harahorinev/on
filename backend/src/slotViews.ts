import { db } from "./db.js";
import type { SlotRow, SlotRowWithCompanyAndEmployee } from "./db-types.js";

export const SLOT_SELECT =
  "SELECT s.*, c.id as cid, c.name as cname, e.id as eid, e.name as ename FROM slots s JOIN companies c ON s.company_id = c.id LEFT JOIN employees e ON s.employee_id = e.id";

export function normalizeEmployeeId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ensureCompanyEmployee(companyId: string, employeeId?: string): boolean {
  if (!employeeId) return true;
  const row = db
    .prepare("SELECT id FROM employees WHERE id = ? AND company_id = ?")
    .get(employeeId, companyId) as { id: string } | undefined;
  return Boolean(row);
}

export function getActiveCompanyEmployee(companyId: string, employeeId: string) {
  return db
    .prepare("SELECT id, name FROM employees WHERE id = ? AND company_id = ? AND deleted_at IS NULL")
    .get(employeeId, companyId) as
    | { id: string; name: string }
    | undefined;
}

export function getEmployeeSummaryById(employeeId?: string | null) {
  if (!employeeId) return undefined;
  return db.prepare("SELECT id, name FROM employees WHERE id = ?").get(employeeId) as
    | { id: string; name: string }
    | undefined;
}

export function getSlotOrderBy(sortBy?: string, sortOrder?: string, defaultDirection: "ASC" | "DESC" = "ASC"): string {
  const direction = sortOrder === "asc" || sortOrder === "desc" ? sortOrder.toUpperCase() : defaultDirection;
  if (sortBy === "employeeName") {
    return ` ORDER BY (e.name IS NULL), e.name ${direction}, s.start_at ASC`;
  }
  return ` ORDER BY s.start_at ${direction}`;
}

export function buildCompanySlotWhere(filters: {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
}) {
  let where = "WHERE s.company_id = ?";
  const params: Array<string | number> = [filters.companyId];
  if (filters.dateFrom) {
    where += " AND s.start_at >= ?";
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += " AND s.end_at <= ?";
    params.push(filters.dateTo);
  }
  if (filters.employeeId) {
    where += " AND s.employee_id = ?";
    params.push(filters.employeeId);
  }
  return { where, params };
}

export function slotToJson(
  row: SlotRow,
  company?: { id: string; name: string },
  employee?: { id: string; name: string } | null
) {
  return {
    id: row.id,
    companyId: row.company_id,
    employeeId: row.employee_id ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    capacity: row.capacity,
    status: row.status,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    ...(company && { company }),
    ...(employee && { employee }),
  };
}

export function slotJoinedToJson(row: SlotRowWithCompanyAndEmployee) {
  return slotToJson(
    row,
    { id: row.cid, name: row.cname },
    row.eid ? { id: row.eid, name: row.ename ?? "" } : null
  );
}
