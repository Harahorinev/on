import { Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { LIMITS, validateMaxLength } from "../validation.js";
import type { CompanyRowWithOwner } from "../db-types.js";

export const companiesRouter = Router();

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function icalTextEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcalDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function ensureCompanyEmployee(companyId: string, employeeId?: string): boolean {
  if (!employeeId) return true;
  const row = db
    .prepare("SELECT id FROM employees WHERE id = ? AND company_id = ?")
    .get(employeeId, companyId) as { id: string } | undefined;
  return Boolean(row);
}

function getSlotOrderBy(sortBy?: string, sortOrder?: string, defaultDirection: "ASC" | "DESC" = "ASC"): string {
  const direction = sortOrder === "asc" || sortOrder === "desc" ? sortOrder.toUpperCase() : defaultDirection;
  if (sortBy === "employeeName") {
    return ` ORDER BY (e.name IS NULL), e.name ${direction}, s.start_at ASC`;
  }
  return ` ORDER BY s.start_at ${direction}`;
}

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
    next(new AppError(404, msg.company_notFound));
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
    next(new AppError(404, msg.company_notFound));
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

companiesRouter.get("/:id/bookings", authMiddleware, (req, res, next) => {
  const company = db
    .prepare("SELECT id, owner_id FROM companies WHERE id = ?")
    .get(req.params.id) as { id: string; owner_id: string } | undefined;
  if (!company) {
    next(new AppError(404, msg.company_notFound));
    return;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  const { dateFrom, dateTo, employeeId, sortBy, sortOrder } = req.query as {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  if (employeeId && !ensureCompanyEmployee(req.params.id, employeeId)) {
    next(new AppError(400, msg.slot_employeeInvalid));
    return;
  }

  let where = "WHERE s.company_id = ?";
  const params: Array<string | number> = [req.params.id];
  if (dateFrom) {
    where += " AND s.start_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    where += " AND s.end_at <= ?";
    params.push(dateTo);
  }
  if (employeeId) {
    where += " AND s.employee_id = ?";
    params.push(employeeId);
  }
  const rows = db
    .prepare(
      `SELECT b.id as booking_id, b.slot_id, b.user_id, b.status as booking_status, b.created_at as booking_created_at,
              s.id as s_id, s.employee_id, s.start_at, s.end_at, s.status as slot_status, s.capacity, s.title, s.description, s.location,
              u.id as u_id, u.email as u_email, u.name as u_name,
              e.id as e_id, e.name as e_name
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN employees e ON e.id = s.employee_id
       ${where}
       ${getSlotOrderBy(sortBy, sortOrder, "DESC")}, b.created_at DESC`
    )
    .all(...params) as Array<{
    booking_id: string;
    slot_id: string;
    user_id: string;
    booking_status: string;
    booking_created_at: string;
    s_id: string;
    employee_id: string | null;
    start_at: string;
    end_at: string;
    slot_status: string;
    capacity: number;
    title: string | null;
    description: string | null;
    location: string | null;
    u_id: string;
    u_email: string;
    u_name: string;
    e_id: string | null;
    e_name: string | null;
  }>;

  res.json(
    rows.map((r) => ({
      id: r.booking_id,
      slotId: r.slot_id,
      userId: r.user_id,
      status: r.booking_status,
      createdAt: r.booking_created_at,
      user: {
        id: r.u_id,
        email: r.u_email,
        name: r.u_name,
      },
      slot: {
        id: r.s_id,
        employeeId: r.employee_id ?? undefined,
        startAt: r.start_at,
        endAt: r.end_at,
        status: r.slot_status,
        capacity: r.capacity,
        title: r.title ?? undefined,
        description: r.description ?? undefined,
        location: r.location ?? undefined,
        ...(r.e_id && { employee: { id: r.e_id, name: r.e_name ?? "" } }),
      },
    }))
  );
});

companiesRouter.get("/:id/export", authMiddleware, (req, res, next) => {
  const { id: companyId } = req.params;
  const formatRaw = String(req.query.format ?? "csv").toLowerCase();
  if (formatRaw !== "csv" && formatRaw !== "ical") {
    next(new AppError(400, msg.company_exportFormatInvalid));
    return;
  }

  const company = db
    .prepare("SELECT id, name, owner_id FROM companies WHERE id = ?")
    .get(companyId) as { id: string; name: string; owner_id: string } | undefined;
  if (!company) {
    next(new AppError(404, msg.company_notFound));
    return;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }

  const { dateFrom, dateTo, employeeId, sortBy, sortOrder } = req.query as {
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  if (employeeId && !ensureCompanyEmployee(companyId, employeeId)) {
    next(new AppError(400, msg.slot_employeeInvalid));
    return;
  }
  let where = "WHERE s.company_id = ?";
  const params: Array<string | number> = [companyId];
  if (dateFrom) {
    where += " AND s.start_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    where += " AND s.end_at <= ?";
    params.push(dateTo);
  }
  if (employeeId) {
    where += " AND s.employee_id = ?";
    params.push(employeeId);
  }
  const rows = db
    .prepare(
      `SELECT s.id, s.start_at, s.end_at, s.status, s.capacity, s.title, s.location, e.name as employee_name,
              SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_bookings,
              SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_bookings
         FROM slots s
         LEFT JOIN employees e ON e.id = s.employee_id
         LEFT JOIN bookings b ON b.slot_id = s.id
         ${where}
        GROUP BY s.id, e.name
        ${getSlotOrderBy(sortBy, sortOrder)}`
    )
    .all(...params) as Array<{
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    capacity: number;
    title: string | null;
    location: string | null;
    employee_name: string | null;
    confirmed_bookings: number | null;
    cancelled_bookings: number | null;
  }>;

  const safeCompany = company.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (formatRaw === "csv") {
    const header = [
      "slot_id",
      "start_at",
      "end_at",
      "status",
      "capacity",
      "title",
      "location",
      "employee_name",
      "confirmed_bookings",
      "cancelled_bookings",
    ].join(",");
    const lines = rows.map((r) =>
      [
        csvEscape(r.id),
        csvEscape(r.start_at),
        csvEscape(r.end_at),
        csvEscape(r.status),
        csvEscape(r.capacity),
        csvEscape(r.title ?? ""),
        csvEscape(r.location ?? ""),
        csvEscape(r.employee_name ?? ""),
        csvEscape(r.confirmed_bookings ?? 0),
        csvEscape(r.cancelled_bookings ?? 0),
      ].join(",")
    );
    const payload = [header, ...lines].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeCompany}-schedule.csv"`);
    res.status(200).send(payload);
    return;
  }

  const dtStamp = toIcalDate(new Date().toISOString());
  const events = rows
    .map((r) => {
      const summary = icalTextEscape(r.title ?? `Slot: ${company.name}`);
      const description = icalTextEscape(
        `Status: ${r.status}; Capacity: ${r.capacity}; Employee: ${r.employee_name ?? "Unassigned"}; Confirmed bookings: ${r.confirmed_bookings ?? 0}`
      );
      const location = r.location ? `\nLOCATION:${icalTextEscape(r.location)}` : "";
      return [
        "BEGIN:VEVENT",
        `UID:${r.id}@on`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${toIcalDate(r.start_at)}`,
        `DTEND:${toIcalDate(r.end_at)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        location ? location.trimStart() : null,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const payload = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//On//Schedule Export//EN",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${safeCompany}-schedule.ics"`);
  res.status(200).send(payload);
});

companiesRouter.post("/", authMiddleware, (req, res, next) => {
  if (req.userRole !== "COMPANY") {
    next(new AppError(403, msg.company_onlyCompanyCanCreate));
    return;
  }
  const { name, description, timezone } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    next(new AppError(400, msg.company_nameRequired));
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
    next(new AppError(400, msg.company_timezoneMax(LIMITS.TIMEZONE_MAX)));
    return;
  }
  const existing = db.prepare("SELECT id FROM companies WHERE owner_id = ?").get(req.userId!);
  if (existing) {
    next(new AppError(400, msg.company_alreadyHaveCompany));
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
    next(new AppError(404, msg.company_notFound));
    return;
  }
  if (company.owner_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  const { name, description, timezone } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      next(new AppError(400, msg.company_nameNonEmpty));
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
      next(new AppError(400, msg.company_timezoneMax(LIMITS.TIMEZONE_MAX)));
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
      .get(req.params.id) as CompanyRowWithOwner | undefined;
    if (!row) {
      next(new AppError(404, msg.company_notFound));
      return;
    }
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
    .get(req.params.id) as CompanyRowWithOwner;
  res.json({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    timezone: row.timezone,
    owner: { id: row.oid, email: row.owner_email, name: row.owner_name },
  });
});
