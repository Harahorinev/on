import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";
import { findUserById, updatePassword, verifyPassword } from "../auth.js";
import { AppError } from "../errors.js";
import { validatePasswordLength } from "../validation.js";

export const userRouter = Router();

userRouter.use(authMiddleware);

/** GET /user/preferences — возвращает настройки пользователя (уведомления, календарь). */
userRouter.get("/preferences", (req: Request, res: Response) => {
  const userId = req.userId!;
  const row = db
    .prepare("SELECT preferences FROM user_preferences WHERE user_id = ?")
    .get(userId) as { preferences: string } | undefined;
  const prefs = row ? (JSON.parse(row.preferences) as Record<string, unknown>) : {};
  res.json(prefs);
});

const CALENDAR_VIEW_VALUES = ["week", "month"] as const;
const CALENDAR_RANGE_VALUES = [7, 14, 30] as const;

/** PATCH /user/preferences — обновляет настройки. Тело: { notifyEmail?, notifyInApp?, calendarView?, calendarRange? }. */
userRouter.patch("/preferences", (req: Request, res: Response, next: (err: unknown) => void) => {
  const userId = req.userId!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (body.notifyEmail !== undefined) {
    if (typeof body.notifyEmail !== "boolean") {
      next(new AppError(400, "notifyEmail must be boolean"));
      return;
    }
    updates.notifyEmail = body.notifyEmail;
  }
  if (body.notifyInApp !== undefined) {
    if (typeof body.notifyInApp !== "boolean") {
      next(new AppError(400, "notifyInApp must be boolean"));
      return;
    }
    updates.notifyInApp = body.notifyInApp;
  }
  if (body.calendarView !== undefined) {
    if (!CALENDAR_VIEW_VALUES.includes(body.calendarView as (typeof CALENDAR_VIEW_VALUES)[number])) {
      next(new AppError(400, "calendarView must be week or month"));
      return;
    }
    updates.calendarView = body.calendarView;
  }
  if (body.calendarRange !== undefined) {
    const n = Number(body.calendarRange);
    if (!Number.isInteger(n) || !CALENDAR_RANGE_VALUES.includes(n as (typeof CALENDAR_RANGE_VALUES)[number])) {
      next(new AppError(400, "calendarRange must be 7, 14, or 30"));
      return;
    }
    updates.calendarRange = n as (typeof CALENDAR_RANGE_VALUES)[number];
  }

  if (Object.keys(updates).length === 0) {
    const row = db.prepare("SELECT preferences FROM user_preferences WHERE user_id = ?").get(userId) as { preferences: string } | undefined;
    const prefs = row ? JSON.parse(row.preferences) : {};
    return res.json(prefs);
  }

  const row = db.prepare("SELECT preferences FROM user_preferences WHERE user_id = ?").get(userId) as { preferences: string } | undefined;
  const current = row ? (JSON.parse(row.preferences) as Record<string, unknown>) : {};
  const merged = { ...current, ...updates };
  const json = JSON.stringify(merged);
  db.prepare(
    "INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET preferences = excluded.preferences"
  ).run(userId, json);
  res.json(merged);
});

/** PATCH /user/password — смена пароля. Тело: { currentPassword, newPassword }. */
userRouter.patch("/password", (req: Request, res: Response, next: (err: unknown) => void) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = (req.body ?? {}) as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    next(new AppError(400, "currentPassword and newPassword required"));
    return;
  }
  const pwdErr = validatePasswordLength(newPassword);
  if (pwdErr) {
    next(new AppError(400, pwdErr));
    return;
  }
  const row = findUserById(userId);
  if (!row) {
    next(new AppError(401, "User not found"));
    return;
  }
  if (!verifyPassword(currentPassword, row.password_hash)) {
    next(new AppError(400, "Current password is incorrect"));
    return;
  }
  updatePassword(userId, newPassword);
  res.status(204).send();
});
