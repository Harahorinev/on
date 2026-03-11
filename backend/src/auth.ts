import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import express, { type Request } from "express";
import jwt from "jsonwebtoken";
import { db, uuid } from "./db.js";
import { AppError } from "./errors.js";
import { logger } from "./logger.js";
import { msg } from "./messages.js";

const DEV_JWT_SECRET = "dev-secret-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET ?? DEV_JWT_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET) {
    logger.fatal("JWT_SECRET must be set to a secure value in production. Do not use the default.");
    process.exit(1);
  }
}

const SALT_LEN = 16;
const KEY_LEN = 64;

export type UserRole = "USER" | "COMPANY";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  email_verified?: number | null;
  email_verified_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const key = scryptSync(password, salt, KEY_LEN);
  return `${salt}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const key = Buffer.from(keyHex, "hex");
  const derived = scryptSync(password, salt, KEY_LEN);
  return key.length === derived.length && timingSafeEqual(key, derived);
}

export function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  options?: { emailVerified?: boolean }
): User {
  const id = uuid();
  const password_hash = hashPassword(password);
  const emailLower = email.toLowerCase();
  const emailVerified = options?.emailVerified === false ? 0 : 1;
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, emailLower, password_hash, name, role, emailVerified);
  return { id, email: emailLower, name, role };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
}

export function signToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): { sub: string; role: UserRole } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: UserRole;
    };
    return payload;
  } catch {
    return null;
  }
}

export function rowToUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function updatePassword(userId: string, newPassword: string): void {
  const hash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
}

/** B62: Create a password reset token for user, valid 1 hour. Returns the token. */
export function createPasswordResetToken(userId: string): string {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );
  return token;
}

/** B62: If token is valid and not expired, returns userId and deletes the token. Otherwise null. */
export function consumePasswordResetToken(token: string): string | null {
  const row = db
    .prepare(
      "SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')"
    )
    .get(token) as { user_id: string } | undefined;
  if (!row) return null;
  db.prepare("DELETE FROM password_reset_tokens WHERE token = ?").run(token);
  return row.user_id;
}

/** B74: Create an email verification token for user, valid 24 hours. Returns the token. */
export function createEmailVerificationToken(userId: string): string {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(token, userId, expiresAt);
  return token;
}

/** B74: If token valid and not expired, marks user as verified and deletes token. Returns userId or null. */
export function consumeEmailVerificationToken(token: string): string | null {
  const row = db
    .prepare(
      "SELECT user_id FROM email_verification_tokens WHERE token = ? AND expires_at > datetime('now')"
    )
    .get(token) as { user_id: string } | undefined;
  if (!row) return null;
  db.prepare(
    "UPDATE users SET email_verified = 1, email_verified_at = datetime('now') WHERE id = ?"
  ).run(row.user_id);
  db.prepare("DELETE FROM email_verification_tokens WHERE token = ?").run(token);
  return row.user_id;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      userRole?: UserRole;
    }
  }
}

export function authMiddleware(
  req: Request,
  _res: express.Response,
  next: express.NextFunction
): void {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    next(new AppError(401, msg.auth_unauthorized));
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next(new AppError(401, msg.auth_invalidOrExpiredToken));
    return;
  }
  const row = findUserById(payload.sub);
  if (!row) {
    next(new AppError(401, msg.auth_userNotFound));
    return;
  }
  req.user = rowToUser(row);
  req.userId = row.id;
  req.userRole = row.role;
  next();
}