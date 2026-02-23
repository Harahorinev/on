import express from "express";
import { Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";

export const slotsRouter = Router({ mergeParams: true });

export function slotToJson(row: any, company?: { id: string; name: string }) {
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

export function getSlotById(req: express.Request, res: express.Response) {
  const row = db
    .prepare(
      "SELECT s.*, c.id as cid, c.name as cname FROM slots s JOIN companies c ON s.company_id = c.id WHERE s.id = ?"
    )
    .get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ message: "Slot not found" });
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }));
}

slotsRouter.get("/", (req, res) => {
  const companyId = (req.params as { companyId?: string }).companyId;
  if (!companyId) {
    res.status(400).json({ message: "companyId required" });
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
  const rows = db.prepare(sql).all(...params) as Array<any>;
  const slots = rows.map((r) =>
    slotToJson(r, { id: r.cid, name: r.cname })
  );
  res.json(slots);
});

slotsRouter.get("/:slotId", (req, res) => {
  const row = db
    .prepare(
      "SELECT s.*, c.id as cid, c.name as cname FROM slots s JOIN companies c ON s.company_id = c.id WHERE s.id = ?"
    )
    .get(req.params.slotId) as any;
  if (!row) {
    res.status(404).json({ message: "Slot not found" });
    return;
  }
  res.json(slotToJson(row, { id: row.cid, name: row.cname }));
});

slotsRouter.post("/", authMiddleware, (req, res) => {
  const companyId = req.params.companyId;
  const company = db.prepare("SELECT id, owner_id FROM companies WHERE id = ?").get(companyId) as
    | { id: string; owner_id: string }
    | undefined;
  if (!company) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  if (company.owner_id !== req.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const { startAt, endAt, capacity, title, description, location } = req.body ?? {};
  if (!startAt || !endAt || capacity == null) {
    res.status(400).json({ message: "startAt, endAt, capacity required" });
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
  const row = db.prepare("SELECT * FROM slots WHERE id = ?").get(id) as any;
  const c = db.prepare("SELECT id, name FROM companies WHERE id = ?").get(companyId) as {
    id: string;
    name: string;
  };
  res.status(201).json(slotToJson(row, c));
});

slotsRouter.patch("/:slotId", authMiddleware, (req, res) => {
  const companyId = req.params.companyId;
  const slotId = req.params.slotId;
  const company = db.prepare("SELECT owner_id FROM companies WHERE id = ?").get(companyId) as
    | { owner_id: string }
    | undefined;
  if (!company || company.owner_id !== req.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const slot = db.prepare("SELECT * FROM slots WHERE id = ? AND company_id = ?").get(slotId, companyId) as any;
  if (!slot) {
    res.status(404).json({ message: "Slot not found" });
    return;
  }
  const { startAt, endAt, capacity, status, title, description, location } = req.body ?? {};
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
    .get(slotId) as any;
  res.json(slotToJson(row, { id: row.cid, name: row.cname }));
});

slotsRouter.delete("/:slotId", authMiddleware, (req, res) => {
  const companyId = req.params.companyId;
  const slotId = req.params.slotId;
  const company = db.prepare("SELECT owner_id FROM companies WHERE id = ?").get(companyId) as
    | { owner_id: string }
    | undefined;
  if (!company || company.owner_id !== req.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const r = db.prepare("DELETE FROM slots WHERE id = ? AND company_id = ?").run(slotId, companyId);
  if (r.changes === 0) {
    res.status(404).json({ message: "Slot not found" });
    return;
  }
  res.status(204).send();
});
