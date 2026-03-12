import { db, uuid } from "./db.js";
import { logger } from "./logger.js";
import { incMetric, recordSchedulerRun } from "./monitoring.js";
import { sendEmail } from "./notification.js";
import { type BookingEmailType, getBookingEmail, getBookingReminderEmail } from "./templates.js";

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
const REMINDER_OFFSETS_MINUTES_RAW = process.env.BOOKING_REMINDER_OFFSETS_MINUTES ?? "1440";
const ENTITY_TYPE_BOOKING = "booking";
const MINUTE_MS = 60 * 1000;

type BookingEmailLogType = BookingEmailType | `booking_reminder_${number}m`;

function parseReminderOffsetsMinutes(): number[] {
  const parsed = REMINDER_OFFSETS_MINUTES_RAW
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0) as number[];
  if (parsed.length === 0) return [1440];
  return [...new Set(parsed)].sort((a, b) => b - a);
}
const REMINDER_OFFSETS_MINUTES = parseReminderOffsetsMinutes();

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

function wasEmailNotificationSent(userId: string, bookingId: string, type: BookingEmailLogType): boolean {
  const row = db
    .prepare(
      "SELECT id FROM email_notification_logs WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND type = ?"
    )
    .get(userId, ENTITY_TYPE_BOOKING, bookingId, type) as { id: string } | undefined;
  return Boolean(row);
}

function markEmailNotificationSent(userId: string, bookingId: string, type: BookingEmailLogType): void {
  db.prepare(
    `INSERT OR IGNORE INTO email_notification_logs (id, user_id, entity_type, entity_id, type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), userId, ENTITY_TYPE_BOOKING, bookingId, type);
}

export async function sendBookingEmailNotification(
  bookingId: string,
  type: BookingEmailType
): Promise<boolean> {
  incMetric("bookingEmailAttempts");
  const row = getBookingNotificationRow(bookingId);
  if (!row) {
    incMetric("bookingEmailSkippedNoBooking");
    return false;
  }
  if (!isNotifyEmailEnabled(row.user_id)) {
    incMetric("bookingEmailSkippedDisabled");
    return false;
  }
  if (wasEmailNotificationSent(row.user_id, bookingId, type)) {
    incMetric("bookingEmailSkippedDuplicate");
    return false;
  }

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
  if (sent) {
    incMetric("bookingEmailSent");
    markEmailNotificationSent(row.user_id, bookingId, type);
  } else {
    incMetric("bookingEmailFailed");
  }
  return sent;
}

export async function sendUpcomingBookingReminders(now = new Date()): Promise<number> {
  incMetric("reminderSweeps");
  let sentCount = 0;
  for (const minutesBefore of REMINDER_OFFSETS_MINUTES) {
    const upperBound = new Date(now.getTime() + minutesBefore * MINUTE_MS);
    const lowerBound = new Date(upperBound.getTime() - REMINDER_INTERVAL_MS);
    const rows = db
      .prepare(
        `SELECT b.id as booking_id
           FROM bookings b
           JOIN slots s ON s.id = b.slot_id
          WHERE b.status = 'CONFIRMED'
            AND s.start_at > ?
            AND s.start_at <= ?`
      )
      .all(lowerBound.toISOString(), upperBound.toISOString()) as Array<{ booking_id: string }>;
    incMetric("reminderCandidates", rows.length);

    for (const row of rows) {
      const details = getBookingNotificationRow(row.booking_id);
      if (!details) {
        incMetric("reminderSkippedNoBooking");
        continue;
      }
      if (!isNotifyEmailEnabled(details.user_id)) {
        incMetric("reminderSkippedDisabled");
        continue;
      }
      const reminderType = `booking_reminder_${minutesBefore}m` as const;
      if (wasEmailNotificationSent(details.user_id, details.booking_id, reminderType)) {
        incMetric("reminderSkippedDuplicate");
        continue;
      }

      const message = getBookingReminderEmail({
        companyName: details.company_name,
        startAt: details.start_at,
        endAt: details.end_at,
        title: details.title ?? undefined,
        location: details.location ?? undefined,
        minutesBefore,
      });
      const sent = await sendEmail({
        to: details.user_email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      if (!sent) {
        incMetric("reminderFailed");
        continue;
      }
      markEmailNotificationSent(details.user_id, details.booking_id, reminderType);
      incMetric("reminderSent");
      sentCount += 1;
    }
  }
  return sentCount;
}

export function startBookingReminderScheduler(): void {
  if (process.env.NODE_ENV === "test") return;
  if (!Number.isFinite(REMINDER_INTERVAL_MS) || REMINDER_INTERVAL_MS <= 0) return;

  const run = async () => {
    const startedAt = Date.now();
    try {
      const sent = await sendUpcomingBookingReminders();
      const durationMs = Date.now() - startedAt;
      recordSchedulerRun({ sent, durationMs });
      logger.info(
        { sent, durationMs, offsetsMinutes: REMINDER_OFFSETS_MINUTES, intervalMs: REMINDER_INTERVAL_MS },
        "Booking reminder scheduler run completed"
      );
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      recordSchedulerRun({
        sent: 0,
        durationMs,
        error: err instanceof Error ? err.message : "unknown error",
      });
      logger.error({ err }, "Booking reminder scheduler failed");
    }
  };

  // Run once on startup and then periodically.
  void run();
  setInterval(() => {
    void run();
  }, REMINDER_INTERVAL_MS);
}
