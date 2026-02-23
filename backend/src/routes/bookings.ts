import express from "express";
import { Router } from "express";
import { db, uuid } from "../db.js";
import { authMiddleware } from "../auth.js";

export const bookingsRouter = Router();

function bookingToJson(row: any, slot?: any) {
  const out: any = {
    id: row.id,
    slotId: row.slot_id,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at,
  };
  if (slot) {
    out.slot = {
      id: slot.id,
      companyId: slot.company_id,
      startAt: slot.start_at,
      endAt: slot.end_at,
      capacity: slot.capacity,
      status: slot.status,
      title: slot.title ?? undefined,
      description: slot.description ?? undefined,
      location: slot.location ?? undefined,
      ...(slot.company && { company: slot.company }),
    };
  }
  return out;
}

bookingsRouter.get("/me", authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, s.id as s_id, s.company_id, s.start_at, s.end_at, s.capacity, s.status as s_status, s.title, s.description, s.location,
              c.id as c_id, c.name as c_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN companies c ON s.company_id = c.id
       WHERE b.user_id = ? AND b.status = 'CONFIRMED'
       ORDER BY b.created_at DESC`
    )
    .all(req.userId!) as Array<any>;
  const bookings = rows.map((r) =>
    bookingToJson(r, {
      id: r.s_id,
      company_id: r.company_id,
      start_at: r.start_at,
      end_at: r.end_at,
      capacity: r.capacity,
      status: r.s_status,
      title: r.title,
      description: r.description,
      location: r.location,
      company: { id: r.c_id, name: r.c_name },
    })
  );
  res.json(bookings);
});

bookingsRouter.get("/:id", authMiddleware, (req, res) => {
  const row = db
    .prepare(
      `SELECT b.*, s.id as s_id, s.company_id, s.start_at, s.end_at, s.capacity, s.status as s_status, s.title, s.description, s.location,
              c.id as c_id, c.name as c_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN companies c ON s.company_id = c.id
       WHERE b.id = ?`
    )
    .get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }
  if (row.user_id !== req.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  res.json(
    bookingToJson(row, {
      id: row.s_id,
      company_id: row.company_id,
      start_at: row.start_at,
      end_at: row.end_at,
      capacity: row.capacity,
      status: row.s_status,
      title: row.title,
      description: row.description,
      location: row.location,
      company: { id: row.c_id, name: row.c_name },
    })
  );
});

export function createBookingForSlot(req: express.Request, res: express.Response) {
  const slotId = req.params.slotId;
  if (req.userRole !== "USER") {
    res.status(403).json({ message: "Only USER can create bookings" });
    return;
  }
  const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(slotId) as any;
  if (!slot) {
    res.status(404).json({ message: "Slot not found" });
    return;
  }
  if (slot.status !== "OPEN") {
    res.status(400).json({ message: "Slot is not available" });
    return;
  }
  const existing = db
    .prepare("SELECT id FROM bookings WHERE slot_id = ? AND user_id = ?")
    .get(slotId, req.userId!);
  if (existing) {
    res.status(409).json({ message: "Already booked" });
    return;
  }
  const count = db.prepare("SELECT COUNT(*) as n FROM bookings WHERE slot_id = ? AND status = 'CONFIRMED'").get(slotId) as { n: number };
  if (count.n >= slot.capacity) {
    res.status(400).json({ message: "Slot is full" });
    return;
  }
  const id = uuid();
  db.prepare("INSERT INTO bookings (id, slot_id, user_id) VALUES (?, ?, ?)").run(id, slotId, req.userId!);
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as any;
  const c = db.prepare("SELECT id, name FROM companies WHERE id = ?").get(slot.company_id) as { id: string; name: string };
  res.status(201).json(
    bookingToJson(row, {
      ...slot,
      company: c,
    })
  );
}

bookingsRouter.delete("/:id", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ message: "Booking not found" });
    return;
  }
  if (row.user_id !== req.userId) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  db.prepare("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?").run(req.params.id);
  const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(row.slot_id) as any;
  const c = db.prepare("SELECT id, name FROM companies WHERE id = ?").get(slot.company_id) as { id: string; name: string };
  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id) as any;
  res.json(bookingToJson(updated, { ...slot, company: c }));
});
