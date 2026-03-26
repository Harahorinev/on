import "dotenv/config";
import "../src/db.js";
import { createUser, findUserByEmail } from "../src/auth.js";
import { db, uuid } from "../src/db.js";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "123456";
const TEST_EMAILS = [
  "test@example.com",
  "test2@example.com",
  "test3@example.com",
  "company@example.com",
  "company2@example.com",
];

function dayAt(h: number, m: number, dayOffset: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

function clearTestData() {
  const userIds = TEST_EMAILS.map((e) => findUserByEmail(e)?.id).filter(Boolean) as string[];
  if (userIds.length === 0) return;
  const companyUserIds = [findUserByEmail("company@example.com")?.id, findUserByEmail("company2@example.com")?.id].filter(
    Boolean
  ) as string[];
  const placeholders = userIds.map(() => "?").join(",");
  const companyPlaceholders = companyUserIds.map(() => "?").join(",");

  // Important: delete children first because many tables reference users/bookings/events without ON DELETE CASCADE.
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM email_notification_logs WHERE user_id IN (${placeholders})`).run(...userIds);
    db.prepare(`DELETE FROM password_reset_tokens WHERE user_id IN (${placeholders})`).run(...userIds);
    db.prepare(`DELETE FROM email_verification_tokens WHERE user_id IN (${placeholders})`).run(...userIds);
    db.prepare(`DELETE FROM user_preferences WHERE user_id IN (${placeholders})`).run(...userIds);

    db.prepare(
      `DELETE FROM chat_messages
       WHERE sender_user_id IN (${placeholders})
          OR conversation_id IN (
            SELECT id FROM chat_conversations WHERE owner_user_id IN (${placeholders})
          )`
    ).run(...userIds, ...userIds);
    db.prepare(`DELETE FROM chat_conversations WHERE owner_user_id IN (${placeholders})`).run(...userIds);

    db.prepare(`DELETE FROM chat_messages WHERE booking_id IN (SELECT id FROM bookings WHERE user_id IN (${placeholders}))`).run(
      ...userIds
    );
    db.prepare(`DELETE FROM bookings WHERE user_id IN (${placeholders})`).run(...userIds);

    if (companyUserIds.length > 0) {
      const companyIds = db
        .prepare(`SELECT id FROM companies WHERE owner_id IN (${companyPlaceholders})`)
        .all(...companyUserIds) as { id: string }[];

      if (companyIds.length > 0) {
        const ids = companyIds.map((c) => c.id);
        const companyIdsPlaceholders = ids.map(() => "?").join(",");

        db.prepare(
          `DELETE FROM chat_messages WHERE booking_id IN (
             SELECT id FROM bookings WHERE slot_id IN (SELECT id FROM slots WHERE company_id IN (${companyIdsPlaceholders}))
           )`
        ).run(...ids);
        db.prepare(
          `DELETE FROM chat_messages WHERE user_event_id IN (
             SELECT id FROM user_events WHERE user_id IN (${placeholders})
           )`
        ).run(...userIds);
        db.prepare(`DELETE FROM bookings WHERE slot_id IN (SELECT id FROM slots WHERE company_id IN (${companyIdsPlaceholders}))`).run(
          ...ids
        );
        db.prepare(`DELETE FROM slots WHERE company_id IN (${companyIdsPlaceholders})`).run(...ids);
        db.prepare(`DELETE FROM employee_directions WHERE employee_id IN (SELECT id FROM employees WHERE company_id IN (${companyIdsPlaceholders}))`).run(
          ...ids
        );
        db.prepare(`DELETE FROM employees WHERE company_id IN (${companyIdsPlaceholders})`).run(...ids);
        db.prepare(`DELETE FROM directions WHERE company_id IN (${companyIdsPlaceholders})`).run(...ids);
        db.prepare(`DELETE FROM companies WHERE id IN (${companyIdsPlaceholders})`).run(...ids);
      }
    }

    db.prepare(`DELETE FROM chat_messages WHERE user_event_id IN (SELECT id FROM user_events WHERE user_id IN (${placeholders}))`).run(
      ...userIds
    );
    db.prepare(`DELETE FROM user_events WHERE user_id IN (${placeholders})`).run(...userIds);
    db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...userIds);
  });

  tx();
  console.log("Старые тестовые данные удалены.");
}

function seed() {
  if (findUserByEmail(TEST_EMAIL)) {
    clearTestData();
  }

  createUser(TEST_EMAIL, TEST_PASSWORD, "Test", "USER");
  createUser("test2@example.com", TEST_PASSWORD, "Анна", "USER");
  createUser("test3@example.com", TEST_PASSWORD, "Борис", "USER");
  createUser("company@example.com", TEST_PASSWORD, "Company", "COMPANY");
  createUser("company2@example.com", TEST_PASSWORD, "Салон Ольги", "COMPANY");

  const testUser = findUserByEmail(TEST_EMAIL)!;
  const test2User = findUserByEmail("test2@example.com")!;
  const test3User = findUserByEmail("test3@example.com")!;
  const companyUser = findUserByEmail("company@example.com")!;
  const company2User = findUserByEmail("company2@example.com")!;

  const companyId = uuid();
  db.prepare(
    "INSERT INTO companies (id, name, description, timezone, owner_id) VALUES (?, ?, ?, ?, ?)"
  ).run(
    companyId,
    "Тестовая компания",
    "Для проверки расписания и записей",
    "Europe/Moscow",
    companyUser.id
  );

  const company2Id = uuid();
  db.prepare(
    "INSERT INTO companies (id, name, description, timezone, owner_id) VALUES (?, ?, ?, ?, ?)"
  ).run(
    company2Id,
    "Салон красоты «Ольга»",
    "Стрижки, маникюр, окрашивание",
    "Europe/Moscow",
    company2User.id
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const slots: { id: string; company_id: string; start: Date; end: Date; capacity: number; title: string }[] = [];

  // Компания 1: слоты на сегодня, завтра, послезавтра, через 3 дня
  for (const dayOffset of [0, 1, 2, 3]) {
    slots.push({
      id: uuid(),
      company_id: companyId,
      start: dayAt(9, 0, dayOffset),
      end: dayAt(10, 0, dayOffset),
      capacity: 3,
      title: "Утро",
    });
    slots.push({
      id: uuid(),
      company_id: companyId,
      start: dayAt(10, 0, dayOffset),
      end: dayAt(11, 0, dayOffset),
      capacity: 5,
      title: "Слот 10–11",
    });
    slots.push({
      id: uuid(),
      company_id: companyId,
      start: dayAt(14, 0, dayOffset),
      end: dayAt(15, 0, dayOffset),
      capacity: 4,
      title: "День",
    });
    slots.push({
      id: uuid(),
      company_id: companyId,
      start: dayAt(16, 0, dayOffset),
      end: dayAt(17, 0, dayOffset),
      capacity: 2,
      title: "Вечер",
    });
  }

  // Компания 2: слоты на сегодня и завтра
  for (const dayOffset of [0, 1]) {
    slots.push({
      id: uuid(),
      company_id: company2Id,
      start: dayAt(11, 0, dayOffset),
      end: dayAt(12, 0, dayOffset),
      capacity: 2,
      title: "Маникюр",
    });
    slots.push({
      id: uuid(),
      company_id: company2Id,
      start: dayAt(12, 30, dayOffset),
      end: dayAt(13, 30, dayOffset),
      capacity: 1,
      title: "Стрижка",
    });
    slots.push({
      id: uuid(),
      company_id: company2Id,
      start: dayAt(15, 0, dayOffset),
      end: dayAt(16, 0, dayOffset),
      capacity: 2,
      title: "Окрашивание",
    });
  }

  const insertSlot = db.prepare(
    "INSERT INTO slots (id, company_id, start_at, end_at, capacity, status, title) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const s of slots) {
    insertSlot.run(s.id, s.company_id, s.start.toISOString(), s.end.toISOString(), s.capacity, "OPEN", s.title);
  }

  const bookings: { slot_id: string; user_id: string }[] = [];

  // Test: несколько записей в разные дни (календарь заполнен)
  bookings.push({ slot_id: slots[1].id, user_id: testUser.id });   // сегодня 10–11
  bookings.push({ slot_id: slots[2].id, user_id: testUser.id });   // сегодня 14–15
  bookings.push({ slot_id: slots[5].id, user_id: testUser.id });   // завтра 10–11
  bookings.push({ slot_id: slots[6].id, user_id: testUser.id });   // завтра 14–15
  bookings.push({ slot_id: slots[9].id, user_id: testUser.id });   // послезавтра 10–11
  bookings.push({ slot_id: slots[17].id, user_id: testUser.id });  // компания 2, сегодня 12:30–13:30
  bookings.push({ slot_id: slots[19].id, user_id: testUser.id });  // компания 2, завтра 11–12

  // Анна (test2)
  bookings.push({ slot_id: slots[0].id, user_id: test2User.id });
  bookings.push({ slot_id: slots[3].id, user_id: test2User.id });
  bookings.push({ slot_id: slots[17].id, user_id: test2User.id });

  // Борис (test3)
  bookings.push({ slot_id: slots[4].id, user_id: test3User.id });
  bookings.push({ slot_id: slots[19].id, user_id: test3User.id });

  const insertBooking = db.prepare(
    "INSERT INTO bookings (id, slot_id, user_id, status) VALUES (?, ?, ?, ?)"
  );
  for (const b of bookings) {
    insertBooking.run(uuid(), b.slot_id, b.user_id, "CONFIRMED");
  }

  console.log("Тестовые данные созданы.");
  console.log("  Пользователи: test@example.com, test2@example.com, test3@example.com — пароль 123456");
  console.log("  Компании:     company@example.com, company2@example.com — пароль 123456");
  console.log("  Компании: «Тестовая компания», «Салон красоты Ольга»");
  console.log("  Слотов:", slots.length, "| Записей:", bookings.length);
}

seed();
