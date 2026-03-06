import { NextFunction, Request, Response, Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { LIMITS, validateMaxLength } from "../validation.js";
import type { DirectionRow } from "../db-types.js";

export const directionsRouter = Router({ mergeParams: true });

function getCompanyId(req: Request): string {
  return (req.params as { companyId: string }).companyId;
}

function ensureCompanyOwner(req: Request, res: Response, next: NextFunction): boolean {
  const companyId = getCompanyId(req);
  const company = db
    .prepare("SELECT owner_id FROM companies WHERE id = ?")
    .get(companyId) as { owner_id: string } | undefined;
  if (!company) {
    next(new AppError(404, msg.company_notFound));
    return false;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return false;
  }
  return true;
}

function directionToJson(row: DirectionRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

directionsRouter.get("/", (req, res, next) => {
  const companyId = getCompanyId(req);
  const company = db.prepare("SELECT id FROM companies WHERE id = ?").get(companyId);
  if (!company) {
    next(new AppError(404, msg.company_notFound));
    return;
  }
  const rows = db
    .prepare("SELECT id, company_id, name, description, sort_order, created_at FROM directions WHERE company_id = ? ORDER BY sort_order, name")
    .all(companyId) as Array<{ id: string; company_id: string; name: string; description: string | null; sort_order: number; created_at: string }>;
  res.json(rows.map(directionToJson));
});

directionsRouter.get("/:directionId", (req, res, next) => {
  const companyId = getCompanyId(req);
  const { directionId } = req.params;
  const row = db
    .prepare("SELECT id, company_id, name, description, sort_order, created_at FROM directions WHERE id = ? AND company_id = ?")
    .get(directionId, companyId) as { id: string; company_id: string; name: string; description: string | null; sort_order: number; created_at: string } | undefined;
  if (!row) {
    next(new AppError(404, msg.direction_notFound));
    return;
  }
  res.json(directionToJson(row));
});

directionsRouter.post("/", authMiddleware, (req, res, next) => {
  if (req.userRole !== "COMPANY") {
    next(new AppError(403, msg.direction_onlyCompanyCanManage));
    return;
  }
  if (!ensureCompanyOwner(req, res, next)) return;
  const companyId = getCompanyId(req);
  const { name, description, sortOrder } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    next(new AppError(400, msg.direction_nameRequired));
    return;
  }
  const nameErr = validateMaxLength(name.trim(), LIMITS.COMPANY_NAME_MAX, "name");
  if (nameErr) {
    next(new AppError(400, nameErr));
    return;
  }
  const descErr = validateMaxLength(description, LIMITS.DESCRIPTION_MAX, "description");
  if (descErr) {
    next(new AppError(400, descErr));
    return;
  }
  const id = uuid();
  const sort = typeof sortOrder === "number" ? sortOrder : 0;
  db.prepare(
    "INSERT INTO directions (id, company_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)"
  ).run(id, companyId, name.trim(), description?.trim() || null, sort);
  const row = db.prepare("SELECT id, company_id, name, description, sort_order, created_at FROM directions WHERE id = ?").get(id) as {
    id: string;
    company_id: string;
    name: string;
    description: string | null;
    sort_order: number;
    created_at: string;
  };
  res.status(201).json(directionToJson(row));
});

directionsRouter.patch("/:directionId", authMiddleware, (req, res, next) => {
  if (req.userRole !== "COMPANY") {
    next(new AppError(403, msg.direction_onlyCompanyCanManage));
    return;
  }
  if (!ensureCompanyOwner(req, res, next)) return;
  const companyId = getCompanyId(req);
  const { directionId } = req.params;
  const existing = db.prepare("SELECT id FROM directions WHERE id = ? AND company_id = ?").get(directionId, companyId);
  if (!existing) {
    next(new AppError(404, msg.direction_notFound));
    return;
  }
  const { name, description, sortOrder } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      next(new AppError(400, msg.direction_nameNonEmpty));
      return;
    }
    const nameErr = validateMaxLength(name.trim(), LIMITS.COMPANY_NAME_MAX, "name");
    if (nameErr) {
      next(new AppError(400, nameErr));
      return;
    }
    updates.push("name = ?");
    values.push(name.trim());
  }
  if (description !== undefined) {
    const descErr = validateMaxLength(description, LIMITS.DESCRIPTION_MAX, "description");
    if (descErr) {
      next(new AppError(400, descErr));
      return;
    }
    updates.push("description = ?");
    values.push(description?.trim() || null);
  }
  if (sortOrder !== undefined) {
    updates.push("sort_order = ?");
    values.push(Number(sortOrder));
  }
  if (updates.length === 0) {
    const row = db.prepare("SELECT id, company_id, name, description, sort_order, created_at FROM directions WHERE id = ?").get(directionId) as DirectionRow;
    return res.json(directionToJson(row));
  }
  values.push(directionId);
  db.prepare(`UPDATE directions SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const row = db.prepare("SELECT id, company_id, name, description, sort_order, created_at FROM directions WHERE id = ?").get(directionId) as DirectionRow;
  res.json(directionToJson(row));
});

directionsRouter.delete("/:directionId", authMiddleware, (req, res, next) => {
  if (req.userRole !== "COMPANY") {
    next(new AppError(403, msg.direction_onlyCompanyCanManage));
    return;
  }
  if (!ensureCompanyOwner(req, res, next)) return;
  const companyId = getCompanyId(req);
  const { directionId } = req.params;
  const existing = db.prepare("SELECT id FROM directions WHERE id = ? AND company_id = ?").get(directionId, companyId);
  if (!existing) {
    next(new AppError(404, msg.direction_notFound));
    return;
  }
  db.prepare("DELETE FROM employee_directions WHERE direction_id = ?").run(directionId);
  db.prepare("DELETE FROM directions WHERE id = ?").run(directionId);
  res.status(204).send();
});
