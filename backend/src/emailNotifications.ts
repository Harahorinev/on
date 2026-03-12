import { db, uuid } from "./db.js";
import { logger } from "./logger.js";
import { sendEmail } from "./notification.js";
import { type BookingEmailType, getBookingEmail } from "./templates.js";

type UserPreferencesRow = { preferences: string };
type BookingNotificationRow = {
  booking_id: string;
  user_id: string;
  user_email: string;
  company_name: string;
  start_at: string;
  end_at: string;
  title: string | null;
  location: string | null;
};

const REMINDER_INTERVAL_MS = Number(process.env.BOOKING_REMINDER_INTERVAL_MS ?? 15 * 60 * 1000);
const ENTITY_TYPE_BOOKING = "booking";

function isNotifyEmailEnabled(userId: string): boolean {
  const row = db
    .prepare("SELECT preferences FROM user_preferences WHERE user_id = ?")
    .get(userId) as UserPreferencesRow | undefined;
  if (!row) return false;
  try {
    const prefs = JSON.parse(row.preferences) as { notifyEmail?: unknown };
    return prefs.notifyEmail === true;
  } catch {
    return false;
  }
}

function getBookingNotificationRow(bookingId: string): BookingNotificationRow | undefined {
  return db
    .prepare(
      `SELECT b.id as booking_id, b.user_id, u.email as user_email,
              c.name as company_name, s.start_at, s.end_at, s.title, s.location
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         JOIN slots s ON s.id = b.slot_id
         JOIN companies c ON c.id = s.company_id
        WHERE b.id = ?`
    )
    .get(bookingId) as BookingNotificationRow | undefined;
}

function wasEmailNotificationSent(userId: string, bookingId: string, type: BookingEmailType): boolean {
  const row = db
    .prepare(
      "SELECT id FROM email_notification_logs WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND type = ?"
    )
    .get(userId, ENTITY_TYPE_BOOKING, bookingId, type) as { id: string } | undefined;
  return Boolean(row);
}

function markEmailNotificationSent(userId: string, bookingId: string, type: BookingEmailType): void {
  db.prepare(
    `INSERT OR IGNORE INTO email_notification_logs (id, user_id, entity_type, entity_id, type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), userId, ENTITY_TYPE_BOOKING, bookingId, type);
}

export async function sendBookingEmailNotification(
  bookingId: string,
  type: BookingEmailType
): Promise<boolean> {
  const row = getBookingNotificationRow(bookingId);
  if (!row) return false;
  if (!isNotifyEmailEnabled(row.user_id)) return false;
  if (wasEmailNotificationSent(row.user_id, bookingId, type)) return false;

  const message = getBookingEmail(type, {
    companyName: row.company_name,
    startAt: row.start_at,
    endAt: row.end_at,
    title: row.title ?? undefined,
    location: row.location ?? undefined,
  });

  const sent = await sendEmail({
    to: row.user_email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  if (sent) markEmailNotificationSent(row.user_id, bookingId, type);
  return sent;
}

export async function sendUpcomingBookingReminders(now = new Date()): Promise<number> {
  const nowIso = now.toISOString();
  const next24hIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const rows = db
    .prepare(
      `SELECT b.id as booking_id
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
        WHERE b.status = 'CONFIRMED'
          AND s.start_at > ?
          AND s.start_at <= ?`
    )
    .all(nowIso, next24hIso) as Array<{ booking_id: string }>;

  let sentCount = 0;
  for (const row of rows) {
    const sent = await sendBookingEmailNotification(row.booking_id, "booking_reminder_24h");
    if (sent) sentCount += 1;
  }
  return sentCount;
}

export function startBookingReminderScheduler(): void {
  if (process.env.NODE_ENV === "test") return;
  if (!Number.isFinite(REMINDER_INTERVAL_MS) || REMINDER_INTERVAL_MS <= 0) return;

  const run = async () => {
    try {
      const sent = await sendUpcomingBookingReminders();
      if (sent > 0) logger.info({ sent }, "Booking reminder emails sent");
    } catch (err) {
      logger.error({ err }, "Booking reminder scheduler failed");
    }
  };

  // Run once on startup and then periodically.
  void run();
  setInterval(() => {
    void run();
  }, REMINDER_INTERVAL_MS);
}
