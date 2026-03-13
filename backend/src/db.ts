import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(__dirname, "..", "data.db");

function resolveDbPath(): string {
  const fromEnv = process.env.DB_PATH;
  if (!fromEnv) return path.resolve(defaultDbPath);
  const resolved = path.resolve(fromEnv);
  const dbDir = path.dirname(resolved);
  try {
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    return resolved;
  } catch {
    logger.warn({ defaultDbPath }, "DB_PATH directory not writable, using default");
    return path.resolve(defaultDbPath);
  }
}

const dbPathResolved = resolveDbPath();
export const db = new Database(dbPathResolved);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('USER', 'COMPANY')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    owner_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS slots (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT REFERENCES employees(id),
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CANCELLED', 'CLOSED')),
    title TEXT,
    description TEXT,
    location TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES slots(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(slot_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS directions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

  /* B91: Join table for many-to-many: employees ↔ directions.
   * employee_id will reference users(id) or a future employees table when B44/B50 (Employee entity) is implemented.
   * Currently only used to clean up rows when a direction is deleted (see directions router). */
  CREATE TABLE IF NOT EXISTS employee_directions (
    employee_id TEXT NOT NULL,
    direction_id TEXT NOT NULL REFERENCES directions(id),
    PRIMARY KEY (employee_id, direction_id)
  );
  CREATE INDEX IF NOT EXISTS idx_employee_directions_direction ON employee_directions(direction_id);

  CREATE TABLE IF NOT EXISTS user_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    preferences TEXT NOT NULL DEFAULT '{}'
  );

  /* B55: Chat conversations between users and assistants (and, в будущем, user↔user).
   * type:
   *  - 'assistant' — диалог пользователь ↔ AI
   *  - 'direct'    — зарезервировано под user↔user (будет реализовано позже)
   */
  CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('assistant', 'direct')),
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner ON chat_conversations(owner_user_id);
  CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON chat_conversations(type);

  /* B55: Chat messages. Для user↔user в будущем sender_user_id будет ссылаться на пользователей,
   * для AI-ответов sender_role='assistant' и sender_user_id=NULL.
   */
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK(sender_role IN ('user', 'assistant')),
    sender_user_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    booking_id TEXT REFERENCES bookings(id),
    user_event_id TEXT REFERENCES user_events(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_role, sender_user_id);

  /* B62: Tokens for forgot-password flow. Expire after 1 hour; invalidate after use. */
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

  /* B74: Email verification tokens. Used to confirm user email ownership. */
  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);

  /* B84: Generic log of sent email notifications (extensible by type/entity/channel use-cases). */
  CREATE TABLE IF NOT EXISTS email_notification_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    type TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, entity_type, entity_id, type)
  );
  CREATE INDEX IF NOT EXISTS idx_email_notification_logs_entity ON email_notification_logs(entity_type, entity_id, type);
  CREATE INDEX IF NOT EXISTS idx_email_notification_logs_user ON email_notification_logs(user_id);

  CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
  CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_slots_company ON slots(company_id);
  CREATE INDEX IF NOT EXISTS idx_slots_employee ON slots(employee_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_directions_company ON directions(company_id);
`);

// B74: Email verification flags. Added via ALTER to avoid breaking existing DBs.
try {
  db.exec("ALTER TABLE employees ADD COLUMN deleted_at TEXT;");
} catch {
  // ignore if column already exists
}
try {
  db.exec("ALTER TABLE slots ADD COLUMN employee_id TEXT REFERENCES employees(id);");
} catch {
  // ignore if column already exists
}
try {
  db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;");
} catch {
  // ignore if column already exists
}
try {
  db.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT;");
} catch {
  // ignore if column already exists
}
db.exec("CREATE INDEX IF NOT EXISTS idx_slots_employee ON slots(employee_id);");

export function uuid() {
  return randomUUID();
}
