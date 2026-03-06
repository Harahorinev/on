import { Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { LIMITS, validateMaxLength } from "../validation.js";

export const companiesRouter = Router();

companiesRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.description, c.timezone, c.owner_id,
              u.id as owner_user_id, u.email as owner_email, u.name as owner_name
       FROM companies c
       JOIN users u ON c.owner_id = u.id
       ORDER BY c.name`
    )
    .all() as Array<{
    id: string;
    name: string;
    description: string | null;
    timezone: string;
    owner_id: string;
    owner_user_id: string;
    owner_email: string;
    owner_name: string;
  }>;
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      timezone: r.timezone,
      owner: { id: r.owner_user_id, email: r.owner_email, name: r.owner_name },
    }))
  );
});

companiesRouter.get("/me", authMiddleware, (req, res, next) => {
  const row = db
    .prepare(
      "SELECT id, name, description, timezone, owner_id FROM companies WHERE owner_id = ?"
    )
    .get(req.userId!) as
    | { id: string; name: string; description: string | null; timezone: string; owner_id: string }
    | undefined;
  if (!row) {
    next(new AppError(404, "Company not found"));
    return;
  }
  const owner = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(row.owner_id) as {
    id: string;
    email: string;
    name: string;
  };
  res.json({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    timezone: row.timezone,
    owner: { id: owner.id, email: owner.email, name: owner.name },
  });
});

companiesRouter.get("/:id", (req, res, next) => {
  const row = db
    .prepare(
      "SELECT c.id, c.name, c.description, c.timezone, c.owner_id, u.email as owner_email, u.name as owner_name FROM companies c JOIN users u ON c.owner_id = u.id WHERE c.id = ?"
    )
    .get(req.params.id) as
    | {
        id: string;
        name: string;
        description: string | null;
        timezone: string;
        owner_id: string;
        owner_email: string;
        owner_name: string;
      }
    | undefined;
  if (!row) {
    next(new AppError(404, "Company not found"));
    return;
  }
  res.json({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    timezone: row.timezone,
    owner: { id: row.owner_id, email: row.owner_email, name: row.owner_name },
  });
});

companiesRouter.post("/", authMiddleware, (req, res, next) => {
  if (req.userRole !== "COMPANY") {
    next(new AppError(403, "Only COMPANY can create a company"));
    return;
  }
  const { name, description, timezone } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    next(new AppError(400, "name required"));
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
  if (timezone !== undefined && typeof timezone === "string" && timezone.length > LIMITS.TIMEZONE_MAX) {
    next(new AppError(400, `timezone must be at most ${LIMITS.TIMEZONE_MAX} characters`));
    return;
  }
  const existing = db.prepare("SELECT id FROM companies WHERE owner_id = ?").get(req.userId!);
  if (existing) {
    next(new AppError(400, "You already have a company"));
    return;
  }
  const id = uuid();
  const nameTrimmed = name.trim();
  db.prepare(
    "INSERT INTO companies (id, name, description, timezone, owner_id) VALUES (?, ?, ?, ?, ?)"
  ).run(id, nameTrimmed, description ?? null, timezone ?? "UTC", req.userId!);
  const owner = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(req.userId!) as {
    id: string;
    email: string;
    name: string;
  };
  res.status(201).json({
    id,
    name: nameTrimmed,
    description: description ?? undefined,
    timezone: timezone ?? "UTC",
    owner: { id: owner.id, email: owner.email, name: owner.name },
  });
});

companiesRouter.patch("/:id", authMiddleware, (req, res, next) => {
  const company = db
    .prepare("SELECT id, owner_id FROM companies WHERE id = ?")
    .get(req.params.id) as { id: string; owner_id: string } | undefined;
  if (!company) {
    next(new AppError(404, "Company not found"));
    return;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, "Forbidden"));
    return;
  }
  const { name, description, timezone } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      next(new AppError(400, "name must be non-empty"));
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
    values.push(description);
  }
  if (timezone !== undefined) {
    if (typeof timezone !== "string" || timezone.length > LIMITS.TIMEZONE_MAX) {
      next(new AppError(400, `timezone must be at most ${LIMITS.TIMEZONE_MAX} characters`));
      return;
    }
    updates.push("timezone = ?");
    values.push(timezone);
  }
  if (updates.length === 0) {
    const row = db
      .prepare(
        "SELECT c.id, c.name, c.description, c.timezone, u.id as oid, u.email as owner_email, u.name as owner_name FROM companies c JOIN users u ON c.owner_id = u.id WHERE c.id = ?"
      )
      .get(req.params.id) as any;
    return res.json({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      timezone: row.timezone,
      owner: { id: row.oid, email: row.owner_email, name: row.owner_name },
    });
  }
  values.push(req.params.id);
  db.prepare(`UPDATE companies SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const row = db
    .prepare(
      "SELECT c.id, c.name, c.description, c.timezone, u.id as oid, u.email as owner_email, u.name as owner_name FROM companies c JOIN users u ON c.owner_id = u.id WHERE c.id = ?"
    )
    .get(req.params.id) as any;
  res.json({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    timezone: row.timezone,
    owner: { id: row.oid, email: row.owner_email, name: row.owner_name },
  });
});
