import { NextFunction, Request, Response, Router } from "express";
import { authMiddleware } from "../auth.js";
import { db, uuid } from "../db.js";
import type { EmployeeRow } from "../db-types.js";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { LIMITS, validateMaxLength } from "../validation.js";

export const employeesRouter = Router({ mergeParams: true });

employeesRouter.use(authMiddleware);

function getCompanyId(req: Request): string {
  return (req.params as { companyId: string }).companyId;
}

function ensureCompanyOwner(req: Request, next: NextFunction): string | null {
  if (req.userRole !== "COMPANY") {
    next(new AppError(403, msg.employee_onlyCompanyCanManage));
    return null;
  }
  const companyId = getCompanyId(req);
  const company = db
    .prepare("SELECT owner_id FROM companies WHERE id = ?")
    .get(companyId) as { owner_id: string } | undefined;
  if (!company) {
    next(new AppError(404, msg.company_notFound));
    return null;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return null;
  }
  return companyId;
}

function employeeToJson(row: EmployeeRow, directionIds: string[]) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    directionIds,
    createdAt: row.created_at,
  };
}

function normalizeDirectionIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (ids.length !== value.length) return null;
  return [...new Set(ids)];
}

function ensureDirectionsBelongToCompany(companyId: string, directionIds: string[]): boolean {
  if (directionIds.length === 0) return true;
  const placeholders = directionIds.map(() => "?").join(",");
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM directions WHERE company_id = ? AND id IN (${placeholders})`)
    .get(companyId, ...directionIds) as { n: number };
  return row.n === directionIds.length;
}

function setEmployeeDirections(employeeId: string, directionIds: string[]): void {
  db.prepare("DELETE FROM employee_directions WHERE employee_id = ?").run(employeeId);
  if (directionIds.length === 0) return;
  const stmt = db.prepare("INSERT INTO employee_directions (employee_id, direction_id) VALUES (?, ?)");
  for (const directionId of directionIds) {
    stmt.run(employeeId, directionId);
  }
}

function getEmployeeDirectionMap(employeeIds: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (employeeIds.length === 0) return map;
  const placeholders = employeeIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT employee_id, direction_id
       FROM employee_directions
       WHERE employee_id IN (${placeholders})
       ORDER BY rowid`
    )
    .all(...employeeIds) as Array<{ employee_id: string; direction_id: string }>;
  for (const row of rows) {
    const ids = map.get(row.employee_id) ?? [];
    ids.push(row.direction_id);
    map.set(row.employee_id, ids);
  }
  return map;
}

employeesRouter.get("/", (req: Request, res: Response, next: NextFunction) => {
  const companyId = ensureCompanyOwner(req, next);
  if (!companyId) return;
  const rows = db
    .prepare(
      "SELECT id, company_id, name, description, photo_url, created_at FROM employees WHERE company_id = ? ORDER BY created_at DESC"
    )
    .all(companyId) as EmployeeRow[];
  const directionMap = getEmployeeDirectionMap(rows.map((row) => row.id));
  res.json(rows.map((row) => employeeToJson(row, directionMap.get(row.id) ?? [])));
});

employeesRouter.post("/", (req: Request, res: Response, next: NextFunction) => {
  const companyId = ensureCompanyOwner(req, next);
  if (!companyId) return;

  const { name, description, photoUrl, directionIds: rawDirectionIds } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    next(new AppError(400, msg.employee_nameRequired));
    return;
  }
  const nameErr = validateMaxLength(name.trim(), LIMITS.USER_NAME_MAX, "name");
  if (nameErr) {
    next(new AppError(400, nameErr));
    return;
  }
  const descErr = validateMaxLength(description, LIMITS.DESCRIPTION_MAX, "description");
  if (descErr) {
    next(new AppError(400, descErr));
    return;
  }
  const photoErr = validateMaxLength(photoUrl, LIMITS.LOCATION_MAX, "photoUrl");
  if (photoErr) {
    next(new AppError(400, photoErr));
    return;
  }
  const directionIds = normalizeDirectionIds(rawDirectionIds);
  if (!directionIds || !ensureDirectionsBelongToCompany(companyId, directionIds)) {
    next(new AppError(400, msg.employee_directionIdsInvalid));
    return;
  }

  const id = uuid();
  db.prepare(
    "INSERT INTO employees (id, company_id, name, description, photo_url) VALUES (?, ?, ?, ?, ?)"
  ).run(id, companyId, name.trim(), description?.trim() || null, photoUrl?.trim() || null);
  setEmployeeDirections(id, directionIds);
  const row = db
    .prepare("SELECT id, company_id, name, description, photo_url, created_at FROM employees WHERE id = ?")
    .get(id) as EmployeeRow;
  res.status(201).json(employeeToJson(row, directionIds));
});

employeesRouter.patch("/:employeeId", (req: Request, res: Response, next: NextFunction) => {
  const companyId = ensureCompanyOwner(req, next);
  if (!companyId) return;
  const { employeeId } = req.params;
  const existing = db
    .prepare("SELECT id, company_id, name, description, photo_url, created_at FROM employees WHERE id = ? AND company_id = ?")
    .get(employeeId, companyId) as EmployeeRow | undefined;
  if (!existing) {
    next(new AppError(404, msg.employee_notFound));
    return;
  }

  const { name, description, photoUrl, directionIds: rawDirectionIds } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      next(new AppError(400, msg.employee_nameNonEmpty));
      return;
    }
    const nameErr = validateMaxLength(name.trim(), LIMITS.USER_NAME_MAX, "name");
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

  if (photoUrl !== undefined) {
    const photoErr = validateMaxLength(photoUrl, LIMITS.LOCATION_MAX, "photoUrl");
    if (photoErr) {
      next(new AppError(400, photoErr));
      return;
    }
    updates.push("photo_url = ?");
    values.push(photoUrl?.trim() || null);
  }

  const directionIds = normalizeDirectionIds(rawDirectionIds);
  if (rawDirectionIds !== undefined) {
    if (!directionIds || !ensureDirectionsBelongToCompany(companyId, directionIds)) {
      next(new AppError(400, msg.employee_directionIdsInvalid));
      return;
    }
  }

  if (updates.length > 0) {
    values.push(employeeId);
    db.prepare(`UPDATE employees SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }
  if (directionIds) {
    setEmployeeDirections(employeeId, directionIds);
  }

  const row = db
    .prepare("SELECT id, company_id, name, description, photo_url, created_at FROM employees WHERE id = ?")
    .get(employeeId) as EmployeeRow;
  const effectiveDirectionIds =
    directionIds ?? getEmployeeDirectionMap([employeeId]).get(employeeId) ?? [];
  res.json(employeeToJson(row, effectiveDirectionIds));
});

employeesRouter.delete("/:employeeId", (req: Request, res: Response, next: NextFunction) => {
  const companyId = ensureCompanyOwner(req, next);
  if (!companyId) return;
  const { employeeId } = req.params;
  const existing = db
    .prepare("SELECT id FROM employees WHERE id = ? AND company_id = ?")
    .get(employeeId, companyId) as { id: string } | undefined;
  if (!existing) {
    next(new AppError(404, msg.employee_notFound));
    return;
  }
  db.prepare("DELETE FROM employee_directions WHERE employee_id = ?").run(employeeId);
  db.prepare("DELETE FROM employees WHERE id = ?").run(employeeId);
  res.status(204).send();
});
