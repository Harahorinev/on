import express from "express";
import { Router } from "express";
import { db, uuid } from "../db.js";
import { sendBookingEmailNotification } from "../emailNotifications.js";
import { authMiddleware } from "../auth.js";
import { AppError } from "../errors.js";
import { logger } from "../logger.js";
import type { BookingJoinedRow, BookingRow, SlotRow } from "../db-types.js";
import { msg } from "../messages.js";
import { getEmployeeSummaryById, slotToJson } from "../slotViews.js";

export const bookingsRouter = Router();

function bookingToJson(
  row: BookingRow,
  slot?: SlotRow & { company?: { id: string; name: string }; employee?: { id: string; name: string } }
) {
  const out: {
    id: string;
    slotId: string;
    userId: string;
    status: string;
    createdAt: string;
    slot?: Record<string, unknown>;
  } = {
    id: row.id,
    slotId: row.slot_id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
  };
  if (slot) {
    out.slot = slotToJson(slot, slot.company, slot.employee);
  }
  return out;
}

function slotFromBookingJoinedRow(row: BookingJoinedRow) {
  return {
    id: row.s_id,
    company_id: row.company_id,
    employee_id: row.employee_id,
    start_at: row.start_at,
    end_at: row.end_at,
    capacity: row.capacity,
    status: row.s_status,
    title: row.title,
    description: row.description,
    location: row.location,
    company: { id: row.c_id, name: row.c_name },
    employee: row.e_id ? { id: row.e_id, name: row.e_name ?? "" } : undefined,
  };
}

bookingsRouter.get("/me", authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, s.id as s_id, s.company_id, s.employee_id, s.start_at, s.end_at, s.capacity, s.status as s_status, s.title, s.description, s.location,
              c.id as c_id, c.name as c_name,
              e.id as e_id, e.name as e_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN companies c ON s.company_id = c.id
       LEFT JOIN employees e ON s.employee_id = e.id
       WHERE b.user_id = ? AND b.status = 'CONFIRMED'
       ORDER BY b.created_at DESC`
    )
    .all(req.userId!) as BookingJoinedRow[];
  const bookings = rows.map((r) =>
    bookingToJson(r, slotFromBookingJoinedRow(r))
  );
  res.json(bookings);
});

bookingsRouter.get("/:id", authMiddleware, (req, res, next) => {
  const row = db
    .prepare(
      `SELECT b.*, s.id as s_id, s.company_id, s.employee_id, s.start_at, s.end_at, s.capacity, s.status as s_status, s.title, s.description, s.location,
              c.id as c_id, c.name as c_name,
              e.id as e_id, e.name as e_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN companies c ON s.company_id = c.id
       LEFT JOIN employees e ON s.employee_id = e.id
       WHERE b.id = ?`
    )
    .get(req.params.id) as BookingJoinedRow | undefined;
  if (!row) {
    next(new AppError(404, msg.booking_notFound));
    return;
  }
  if (row.user_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  res.json(
    bookingToJson(row, slotFromBookingJoinedRow(row))
  );
});

export function createBookingForSlot(req: express.Request, res: express.Response, next: express.NextFunction) {
  const slotId = req.params.slotId;
  if (req.userRole !== "USER") {
    next(new AppError(403, msg.booking_onlyUserCanCreate));
    return;
  }
  const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(slotId) as SlotRow | undefined;
  if (!slot) {
    next(new AppError(404, msg.slot_notFound));
    return;
  }
  if (slot.status !== "OPEN") {
    next(new AppError(400, msg.slot_notAvailable));
    return;
  }
  const existing = db
    .prepare("SELECT id, status FROM bookings WHERE slot_id = ? AND user_id = ?")
    .get(slotId, req.userId!) as { id: string; status: string } | undefined;
  if (existing?.status === "CONFIRMED") {
    next(new AppError(409, msg.booking_alreadyBooked));
    return;
  }
  const count = db.prepare("SELECT COUNT(*) as n FROM bookings WHERE slot_id = ? AND status = 'CONFIRMED'").get(slotId) as { n: number };
  if (count.n >= slot.capacity) {
    next(new AppError(400, msg.slot_full));
    return;
  }
  let bookingId: string;
  if (existing && existing.status === "CANCELLED") {
    db.prepare("UPDATE bookings SET status = 'CONFIRMED' WHERE id = ?").run(existing.id);
    bookingId = existing.id;
  } else {
    bookingId = uuid();
    db.prepare("INSERT INTO bookings (id, slot_id, user_id) VALUES (?, ?, ?)").run(bookingId, slotId, req.userId!);
  }
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as BookingRow;
  const c = db.prepare("SELECT id, name FROM companies WHERE id = ?").get(slot.company_id) as { id: string; name: string };
  const employee = getEmployeeSummaryById(slot.employee_id);
  res.status(201).json(
    bookingToJson(row, {
      ...slot,
      company: c,
      employee,
    })
  );
  void sendBookingEmailNotification(bookingId, "booking_created").catch((err) => {
    logger.error({ err, bookingId }, "Failed to send booking created email notification");
  });
}

bookingsRouter.delete("/:id", authMiddleware, (req, res, next) => {
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id) as BookingRow | undefined;
  if (!row) {
    next(new AppError(404, msg.booking_notFound));
    return;
  }
  if (row.user_id !== req.userId) {
    next(new AppError(403, msg.forbidden));
    return;
  }
  db.prepare("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?").run(req.params.id);
  const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(row.slot_id) as SlotRow;
  const c = db.prepare("SELECT id, name FROM companies WHERE id = ?").get(slot.company_id) as { id: string; name: string };
  const employee = getEmployeeSummaryById(slot.employee_id);
  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id) as BookingRow;
  res.json(bookingToJson(updated, { ...slot, company: c, employee }));
  void sendBookingEmailNotification(updated.id, "booking_cancelled").catch((err) => {
    logger.error({ err, bookingId: updated.id }, "Failed to send booking cancelled email notification");
  });
});
