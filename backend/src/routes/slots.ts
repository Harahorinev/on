import express from "express";
import { Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { LIMITS, validateMaxLength } from "../validation.js";
import type { SlotRow, SlotRowWithCompanyAndEmployee } from "../db-types.js";

export const slotsRouter = Router({ mergeParams: true });

const SLOT_SELECT =
  "SELECT s.*, c.id as cid, c.name as cname, e.id as eid, e.name as ename FROM slots s JOIN companies c ON s.company_id = c.id LEFT JOIN employees e ON s.employee_id = e.id";

function normalizeEmployeeId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getCompanyEmployee(companyId: string, employeeId: string) {
  return db
    .prepare("SELECT id, name FROM employees WHERE id = ? AND company_id = ? AND deleted_at IS NULL")
    .get(employeeId, companyId) as
    | { id: string; name: string }
    | undefined;
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

export function getSlotById(req: express.Request, res: express.Response, next: express.NextFunction) {
  const row = db
    .prepare(`${SLOT_SELECT} WHERE s.id = ?`)
    .get(req.params.id) as SlotRowWithCompanyAndEmployee | undefined;
  if (!row) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }, row.eid ? { id: row.eid, name: row.ename ?? "" } : null));
}

slotsRouter.get("/", (req, res, next) => {
  const companyId = (req.params as { companyId?: string }).companyId;
  if (!companyId) {
    next(new AppError(400, msg.slot_companyIdRequired));
    return;
  }
  const { dateFrom, dateTo, employeeId, sortBy, sortOrder } = req.query as {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  let sql = `${SLOT_SELECT} WHERE s.company_id = ?`;
  const params: (string | number)[] = [companyId];
  if (dateFrom) {
    sql += " AND s.start_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += " AND s.end_at <= ?";
    params.push(dateTo);
  }
  if (employeeId) {
    sql += " AND s.employee_id = ?";
    params.push(employeeId);
  }
  const normalizedSortOrder = sortOrder === "desc" ? "DESC" : "ASC";
  if (sortBy === "employeeName") {
    sql += ` ORDER BY (e.name IS NULL), e.name ${normalizedSortOrder}, s.start_at ASC`;
  } else {
    sql += ` ORDER BY s.start_at ${normalizedSortOrder}`;
  }
  const rows = db.prepare(sql).all(...params) as SlotRowWithCompanyAndEmployee[];
  const slots = rows.map((r) =>
    slotToJson(r, { id: r.cid, name: r.cname }, r.eid ? { id: r.eid, name: r.ename ?? "" } : null)
  );
  res.json(slots);
});

slotsRouter.get("/:slotId", (req, res, next) => {
  const row = db
    .prepare(`${SLOT_SELECT} WHERE s.id = ?`)
    .get(req.params.slotId) as SlotRowWithCompanyAndEmployee | undefined;
  if (!row) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }, row.eid ? { id: row.eid, name: row.ename ?? "" } : null));
});

slotsRouter.post("/", authMiddleware, (req, res, next) => {
  const companyId = req.params.companyId;
  const company = db.prepare("SELECT id, owner_id FROM companies WHERE id = ?").get(companyId) as
    | { id: string; owner_id: string }
    | undefined;
  if (!company) {
    next(new AppError(404, msg.company_notFound));
    return;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  const { startAt, endAt, capacity, title, description, location, employeeId: rawEmployeeId } = req.body ?? {};
  if (!startAt || !endAt || capacity == null) {
    next(new AppError(400, msg.slot_startEndCapacityRequired));
    return;
  }
  const employeeId = normalizeEmployeeId(rawEmployeeId);
  if (rawEmployeeId !== undefined && employeeId === undefined) {
    next(new AppError(400, msg.slot_employeeInvalid));
    return;
  }
  const employee = employeeId ? getCompanyEmployee(companyId, employeeId) : null;
  if (employeeId && !employee) {
    next(new AppError(400, msg.slot_employeeInvalid));
    return;
  }
  const titleErr = validateMaxLength(title, LIMITS.TITLE_MAX, "title");
  if (titleErr) {
    next(new AppError(400, titleErr));
    return;
  }
  const descErr = validateMaxLength(description, LIMITS.DESCRIPTION_MAX, "description");
  if (descErr) {
    next(new AppError(400, descErr));
    return;
  }
  const locErr = validateMaxLength(location, LIMITS.LOCATION_MAX, "location");
  if (locErr) {
    next(new AppError(400, locErr));
    return;
  }
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    next(new AppError(400, msg.slot_invalidStartOrEnd));
    return;
  }
  if (end <= start) {
    next(new AppError(400, msg.slot_endAfterStart));
    return;
  }
  const now = new Date();
  if (start < now) {
    next(new AppError(400, msg.slot_startNotInPast));
    return;
  }
  const id = uuid();
  db.prepare(
    "INSERT INTO slots (id, company_id, employee_id, start_at, end_at, capacity, title, description, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    companyId,
    employeeId,
    startAt,
    endAt,
    Number(capacity) || 1,
    title ?? null,
    description ?? null,
    location ?? null
  );
  const row = db.prepare("SELECT * FROM slots WHERE id = ?").get(id) as SlotRow;
  const c = db.prepare("SELECT id, name FROM companies WHERE id = ?").get(companyId) as {
    id: string;
    name: string;
  };
  res.status(201).json(slotToJson(row, c, employee));
});

slotsRouter.patch("/:slotId", authMiddleware, (req, res, next) => {
  const companyId = req.params.companyId;
  const slotId = req.params.slotId;
  const company = db.prepare("SELECT owner_id FROM companies WHERE id = ?").get(companyId) as
    | { owner_id: string }
    | undefined;
  if (!company || company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  const slot = db.prepare("SELECT * FROM slots WHERE id = ? AND company_id = ?").get(slotId, companyId) as SlotRow | undefined;
  if (!slot) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  const { startAt, endAt, capacity, status, title, description, location, employeeId: rawEmployeeId } = req.body ?? {};
  const employeeId = normalizeEmployeeId(rawEmployeeId);
  if (rawEmployeeId !== undefined && employeeId === undefined) {
    next(new AppError(400, msg.slot_employeeInvalid));
    return;
  }
  const employee = employeeId ? getCompanyEmployee(companyId, employeeId) : null;
  if (employeeId && !employee) {
    next(new AppError(400, msg.slot_employeeInvalid));
    return;
  }
  if (startAt !== undefined || endAt !== undefined) {
    const newStart = new Date(startAt ?? slot.start_at);
    const newEnd = new Date(endAt ?? slot.end_at);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      next(new AppError(400, msg.slot_invalidStartOrEnd));
      return;
    }
    if (newEnd <= newStart) {
      next(new AppError(400, msg.slot_endAfterStart));
      return;
    }
    const now = new Date();
    if (newStart < now) {
      next(new AppError(400, msg.slot_startNotInPast));
      return;
    }
  }
  if (status !== undefined && status !== "OPEN" && status !== "CANCELLED" && status !== "CLOSED") {
    next(new AppError(400, msg.slot_invalidStatus));
    return;
  }
  const titleErr = validateMaxLength(title, LIMITS.TITLE_MAX, "title");
  if (titleErr) {
    next(new AppError(400, titleErr));
    return;
  }
  const descErr = validateMaxLength(description, LIMITS.DESCRIPTION_MAX, "description");
  if (descErr) {
    next(new AppError(400, descErr));
    return;
  }
  const locErr = validateMaxLength(location, LIMITS.LOCATION_MAX, "location");
  if (locErr) {
    next(new AppError(400, locErr));
    return;
  }
  const updates: string[] = [];
  const values: unknown[] = [];
  if (startAt !== undefined) {
    updates.push("start_at = ?");
    values.push(startAt);
  }
  if (endAt !== undefined) {
    updates.push("end_at = ?");
    values.push(endAt);
  }
  if (capacity !== undefined) {
    updates.push("capacity = ?");
    values.push(capacity);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (location !== undefined) {
    updates.push("location = ?");
    values.push(location);
  }
  if (rawEmployeeId !== undefined) {
    updates.push("employee_id = ?");
    values.push(employeeId);
  }
  if (updates.length > 0) {
    values.push(slotId);
    db.prepare(`UPDATE slots SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }
  const row = db
    .prepare(`${SLOT_SELECT} WHERE s.id = ?`)
    .get(slotId) as SlotRowWithCompanyAndEmployee | undefined;
  if (!row) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }, row.eid ? { id: row.eid, name: row.ename ?? "" } : null));
});

slotsRouter.delete("/:slotId", authMiddleware, (req, res, next) => {
  const companyId = req.params.companyId;
  const slotId = req.params.slotId;
  const company = db.prepare("SELECT owner_id FROM companies WHERE id = ?").get(companyId) as
    | { owner_id: string }
    | undefined;
  if (!company || company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  const r = db.prepare("DELETE FROM slots WHERE id = ? AND company_id = ?").run(slotId, companyId);
  if (r.changes === 0) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.status(204).send();
});
