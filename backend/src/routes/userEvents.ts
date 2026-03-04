import { NextFunction, Request, Response, Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";

export const userEventsRouter = Router();

function eventToJson(row: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  created_at: string;
}) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

userEventsRouter.get("/", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== "USER") {
    next(new AppError(403, "Only USER can have personal events"));
    return;
  }
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
  let sql = "SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE user_id = ?";
  const params: (string | number)[] = [req.userId!];
  if (dateFrom) {
    sql += " AND start_at >= ?";
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += " AND end_at <= ?";
    params.push(dateTo);
  }
  sql += " ORDER BY start_at";
  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    created_at: string;
  }>;
  res.json(rows.map(eventToJson));
});

userEventsRouter.post("/", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== "USER") {
    next(new AppError(403, "Only USER can create personal events"));
    return;
  }
  const { title, description, startAt, endAt } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    next(new AppError(400, "title required"));
    return;
  }
  if (!startAt || !endAt) {
    next(new AppError(400, "startAt and endAt required"));
    return;
  }
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    next(new AppError(400, "Invalid startAt or endAt"));
    return;
  }
  if (end <= start) {
    next(new AppError(400, "endAt must be after startAt"));
    return;
  }
  const id = uuid();
  db.prepare(
    "INSERT INTO user_events (id, user_id, title, description, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.userId!, title.trim(), description?.trim() || null, start.toISOString(), end.toISOString());
  const row = db.prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?").get(id) as any;
  res.status(201).json(eventToJson(row));
});

userEventsRouter.get("/:id", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const row = db
    .prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?")
    .get(req.params.id) as any;
  if (!row) {
    next(new AppError(404, "Event not found"));
    return;
  }
  if (row.user_id !== req.userId) {
    next(new AppError(403, "Forbidden"));
    return;
  }
  res.json(eventToJson(row));
});

userEventsRouter.patch("/:id", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const row = db.prepare("SELECT id, user_id FROM user_events WHERE id = ?").get(req.params.id) as any;
  if (!row || row.user_id !== req.userId) {
    next(new AppError(row ? 403 : 404, row ? "Forbidden" : "Event not found"));
    return;
  }
  const { title, description, startAt, endAt } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      next(new AppError(400, "title must be non-empty"));
      return;
    }
    updates.push("title = ?");
    values.push(title.trim());
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description?.trim() || null);
  }
  if (startAt !== undefined) {
    const d = new Date(startAt);
    if (isNaN(d.getTime())) {
      next(new AppError(400, "Invalid startAt"));
      return;
    }
    updates.push("start_at = ?");
    values.push(d.toISOString());
  }
  if (endAt !== undefined) {
    const d = new Date(endAt);
    if (isNaN(d.getTime())) {
      next(new AppError(400, "Invalid endAt"));
      return;
    }
    updates.push("end_at = ?");
    values.push(d.toISOString());
  }
  if (updates.length === 0) {
    const r = db.prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?").get(req.params.id) as any;
    return res.json(eventToJson(r));
  }
  values.push(req.params.id);
  db.prepare(`UPDATE user_events SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?").get(req.params.id) as any;
  res.json(eventToJson(updated));
});

userEventsRouter.delete("/:id", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const row = db.prepare("SELECT id, user_id FROM user_events WHERE id = ?").get(req.params.id) as any;
  if (!row || row.user_id !== req.userId) {
    next(new AppError(row ? 403 : 404, row ? "Forbidden" : "Event not found"));
    return;
  }
  db.prepare("DELETE FROM user_events WHERE id = ?").run(req.params.id);
  res.status(204).send();
});
