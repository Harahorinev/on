import "dotenv/config";
import "../src/db.js";
import { createUser, findUserByEmail } from "../src/auth.js";
import { db, uuid } from "../src/db.js";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "123456";

function seed() {
  if (findUserByEmail(TEST_EMAIL)) {
    console.log("Тестовые данные уже есть. Вход: test@example.com / 123456");
    process.exit(0);
  }

  createUser(TEST_EMAIL, TEST_PASSWORD, "Test", "USER");
  createUser("company@example.com", "123456", "Company", "COMPANY");

  const testUser = findUserByEmail(TEST_EMAIL)!;
  const companyUser = findUserByEmail("company@example.com")!;

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

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const slot1Id = uuid();
  const start1 = new Date(today);
  start1.setHours(10, 0, 0, 0);
  const end1 = new Date(today);
  end1.setHours(11, 0, 0, 0);
  db.prepare(
    "INSERT INTO slots (id, company_id, start_at, end_at, capacity, status, title) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(slot1Id, companyId, start1.toISOString(), end1.toISOString(), 5, "OPEN", "Утро");

  const slot2Id = uuid();
  const start2 = new Date(today);
  start2.setHours(14, 0, 0, 0);
  const end2 = new Date(today);
  end2.setHours(15, 0, 0, 0);
  db.prepare(
    "INSERT INTO slots (id, company_id, start_at, end_at, capacity, status, title) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(slot2Id, companyId, start2.toISOString(), end2.toISOString(), 3, "OPEN", "День");

  db.prepare(
    "INSERT INTO bookings (id, slot_id, user_id, status) VALUES (?, ?, ?, ?)"
  ).run(uuid(), slot1Id, testUser.id, "CONFIRMED");

  console.log("Тестовые данные созданы.");
  console.log("  Пользователь: test@example.com / 123456 (Test)");
  console.log("  Компания:    company@example.com / 123456 (Company)");
  console.log("  Компания «Тестовая компания», 2 слота, у Test — 1 запись.");
}

seed();
