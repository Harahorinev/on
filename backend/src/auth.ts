import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import express, { type Request } from "express";
import jwt from "jsonwebtoken";
import { db, uuid } from "./db.js";
import { AppError } from "./errors.js";

const DEV_JWT_SECRET = "dev-secret-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET ?? DEV_JWT_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET) {
    console.error("Fatal: JWT_SECRET must be set to a secure value in production. Do not use the default.");
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
  role: UserRole
): User {
  const id = uuid();
  const password_hash = hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email.toLowerCase(), password_hash, name, role);
  return { id, email: email.toLowerCase(), name, role };
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
    next(new AppError(401, "Unauthorized"));
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next(new AppError(401, "Invalid or expired token"));
    return;
  }
  const row = findUserById(payload.sub);
  if (!row) {
    next(new AppError(401, "User not found"));
    return;
  }
  req.user = rowToUser(row);
  req.userId = row.id;
  req.userRole = row.role;
  next();
}