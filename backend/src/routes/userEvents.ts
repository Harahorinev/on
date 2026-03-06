import { NextFunction, Request, Response, Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { msg } from "../messages.js";
import { LIMITS, validateMaxLength } from "../validation.js";
import type { UserEventRow, UserEventRowMin } from "../db-types.js";

export const userEventsRouter = Router();

function eventToJson(row: UserEventRow) {
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
    next(new AppError(403, msg.event_onlyUserCanHave));
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
  const rows = db.prepare(sql).all(...params) as UserEventRow[];
  res.json(rows.map(eventToJson));
});

userEventsRouter.post("/", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== "USER") {
    next(new AppError(403, msg.event_onlyUserCanCreate));
    return;
  }
  const { title, description, startAt, endAt } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    next(new AppError(400, msg.event_titleRequired));
    return;
  }
  const titleErr = validateMaxLength(title.trim(), LIMITS.TITLE_MAX, "title");
  if (titleErr) {
    next(new AppError(400, titleErr));
    return;
  }
  const descErr = validateMaxLength(description, LIMITS.DESCRIPTION_MAX, "description");
  if (descErr) {
    next(new AppError(400, descErr));
    return;
  }
  if (!startAt || !endAt) {
    next(new AppError(400, msg.event_startEndRequired));
    return;
  }
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    next(new AppError(400, msg.event_invalidStartOrEnd));
    return;
  }
  if (end <= start) {
    next(new AppError(400, msg.event_endAfterStart));
    return;
  }
  const id = uuid();
  db.prepare(
    "INSERT INTO user_events (id, user_id, title, description, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.userId!, title.trim(), description?.trim() || null, start.toISOString(), end.toISOString());
  const row = db.prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?").get(id) as UserEventRow;
  res.status(201).json(eventToJson(row));
});

userEventsRouter.get("/:id", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const row = db
    .prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?")
    .get(req.params.id) as UserEventRow | undefined;
  if (!row) {
    next(new AppError(404, msg.event_notFound));
    return;
  }
  if (row.user_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  res.json(eventToJson(row));
});

userEventsRouter.patch("/:id", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const row = db.prepare("SELECT id, user_id FROM user_events WHERE id = ?").get(req.params.id) as UserEventRowMin | undefined;
  if (!row || row.user_id !== req.userId) {
    next(new AppError(row ? 403 : 404, row ? msg.forbidden : msg.event_notFound));
    return;
  }
  const { title, description, startAt, endAt } = req.body ?? {};
  const updates: string[] = [];
  const values: unknown[] = [];
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      next(new AppError(400, msg.event_titleNonEmpty));
      return;
    }
    const titleErr = validateMaxLength(title.trim(), LIMITS.TITLE_MAX, "title");
    if (titleErr) {
      next(new AppError(400, titleErr));
      return;
    }
    updates.push("title = ?");
    values.push(title.trim());
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
  if (startAt !== undefined) {
    const d = new Date(startAt);
    if (isNaN(d.getTime())) {
      next(new AppError(400, msg.event_invalidStart));
      return;
    }
    updates.push("start_at = ?");
    values.push(d.toISOString());
  }
  if (endAt !== undefined) {
    const d = new Date(endAt);
    if (isNaN(d.getTime())) {
      next(new AppError(400, msg.event_invalidEnd));
      return;
    }
    updates.push("end_at = ?");
    values.push(d.toISOString());
  }
  if (updates.length === 0) {
    const r = db.prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?").get(req.params.id) as UserEventRow;
    return res.json(eventToJson(r));
  }
  values.push(req.params.id);
  db.prepare(`UPDATE user_events SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT id, user_id, title, description, start_at, end_at, created_at FROM user_events WHERE id = ?").get(req.params.id) as UserEventRow;
  res.json(eventToJson(updated));
});

userEventsRouter.delete("/:id", authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  const row = db.prepare("SELECT id, user_id FROM user_events WHERE id = ?").get(req.params.id) as UserEventRowMin | undefined;
  if (!row || row.user_id !== req.userId) {
    next(new AppError(row ? 403 : 404, row ? msg.forbidden : msg.event_notFound));
    return;
  }
  db.prepare("DELETE FROM user_events WHERE id = ?").run(req.params.id);
  res.status(204).send();
});
