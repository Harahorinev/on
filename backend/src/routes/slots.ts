import express from "express";
import { Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { LIMITS, validateMaxLength } from "../validation.js";
import type { SlotRow, SlotRowWithCompany } from "../db-types.js";

export const slotsRouter = Router({ mergeParams: true });

export function slotToJson(row: SlotRow, company?: { id: string; name: string }) {
  return {
    id: row.id,
    companyId: row.company_id,
    startAt: row.start_at,
    endAt: row.end_at,
    capacity: row.capacity,
    status: row.status,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    ...(company && { company }),
  };
}

export function getSlotById(req: express.Request, res: express.Response, next: express.NextFunction) {
  const row = db
    .prepare(
      "SELECT s.*, c.id as cid, c.name as cname FROM slots s JOIN companies c ON s.company_id = c.id WHERE s.id = ?"
    )
    .get(req.params.id) as SlotRowWithCompany | undefined;
  if (!row) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }));
}

slotsRouter.get("/", (req, res, next) => {
  const companyId = (req.params as { companyId?: string }).companyId;
  if (!companyId) {
    next(new AppError(400, msg.slot_companyIdRequired));
    return;
  }
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  let sql =
    "SELECT s.*, c.id as cid, c.name as cname FROM slots s JOIN companies c ON s.company_id = c.id WHERE s.company_id = ?";
  const params: (string | number)[] = [companyId];
  if (dateFrom) {
    sql += " AND s.start_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += " AND s.end_at <= ?";
    params.push(dateTo);
  }
  sql += " ORDER BY s.start_at";
  const rows = db.prepare(sql).all(...params) as SlotRowWithCompany[];
  const slots = rows.map((r) =>
    slotToJson(r, { id: r.cid, name: r.cname })
  );
  res.json(slots);
});

slotsRouter.get("/:slotId", (req, res, next) => {
  const row = db
    .prepare(
      "SELECT s.*, c.id as cid, c.name as cname FROM slots s JOIN companies c ON s.company_id = c.id WHERE s.id = ?"
    )
    .get(req.params.slotId) as SlotRowWithCompany | undefined;
  if (!row) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }));
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
  const { startAt, endAt, capacity, title, description, location } = req.body ?? {};
  if (!startAt || !endAt || capacity == null) {
    next(new AppError(400, msg.slot_startEndCapacityRequired));
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
    "INSERT INTO slots (id, company_id, start_at, end_at, capacity, title, description, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    companyId,
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
  res.status(201).json(slotToJson(row, c));
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
  const { startAt, endAt, capacity, status, title, description, location } = req.body ?? {};
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
  if (updates.length > 0) {
    values.push(slotId);
    db.prepare(`UPDATE slots SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }
  const row = db
    .prepare("SELECT s.*, c.id as cid, c.name as cname FROM slots s JOIN companies c ON s.company_id = c.id WHERE s.id = ?")
    .get(slotId) as SlotRowWithCompany | undefined;
  if (!row) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }));
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
