import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "./auth.js";
import { db, uuid } from "./db.js";

vi.mock("./notification.js", () => ({
  sendEmail: vi.fn(async () => true),
}));

import { sendBookingEmailNotification, sendUpcomingBookingReminders } from "./emailNotifications.js";
import { sendEmail } from "./notification.js";

function createBookingFixture(params: { notifyEmail: boolean; startsInMs: number }) {
  const user = createUser(`b84-user-${randomUUID()}@test.local`, "123456", "B84 User", "USER");
  const owner = createUser(`b84-owner-${randomUUID()}@test.local`, "123456", "B84 Company", "COMPANY");

  const companyId = uuid();
  db.prepare("INSERT INTO companies (id, name, owner_id) VALUES (?, ?, ?)").run(
    companyId,
    "B84 Company",
    owner.id
  );

  const startAt = new Date(Date.now() + params.startsInMs).toISOString();
  const endAt = new Date(Date.now() + params.startsInMs + 60 * 60 * 1000).toISOString();
  const slotId = uuid();
  db.prepare(
    "INSERT INTO slots (id, company_id, start_at, end_at, capacity, status, title, location) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?)"
  ).run(slotId, companyId, startAt, endAt, 2, "Consultation", "Room 1");

  const bookingId = uuid();
  db.prepare("INSERT INTO bookings (id, slot_id, user_id, status) VALUES (?, ?, ?, 'CONFIRMED')").run(
    bookingId,
    slotId,
    user.id
  );

  db.prepare(
    "INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET preferences = excluded.preferences"
  ).run(user.id, JSON.stringify({ notifyEmail: params.notifyEmail }));

  return { bookingId };
}

describe("email notifications (B84/B40)", () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockClear();
    db.prepare("DELETE FROM email_notification_logs").run();
  });

  it("sends booking created email only when notifyEmail=true", async () => {
    const enabled = createBookingFixture({ notifyEmail: true, startsInMs: 2 * 60 * 60 * 1000 });
    const disabled = createBookingFixture({ notifyEmail: false, startsInMs: 2 * 60 * 60 * 1000 });

    const sentEnabled = await sendBookingEmailNotification(enabled.bookingId, "booking_created");
    const sentDisabled = await sendBookingEmailNotification(disabled.bookingId, "booking_created");

    expect(sentEnabled).toBe(true);
    expect(sentDisabled).toBe(false);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("sends upcoming reminder once per booking", async () => {
    const baseNow = Date.now();
    createBookingFixture({ notifyEmail: true, startsInMs: (48 * 60 - 5) * 60 * 1000 });

    const sweepTime = new Date(baseNow + 24 * 60 * 60 * 1000);
    const firstRun = await sendUpcomingBookingReminders(sweepTime);
    const secondRun = await sendUpcomingBookingReminders(sweepTime);

    expect(firstRun).toBe(1);
    expect(secondRun).toBe(0);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });
});
