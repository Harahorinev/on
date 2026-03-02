import { Router } from "express";
import {
  createUser,
  findUserByEmail,
  rowToUser,
  signToken,
  verifyPassword,
} from "../auth.js";
import { AppError } from "../errors.js";

export const authRouter = Router();

authRouter.post("/register", (req, res, next) => {
  const { email, password, name, role } = req.body ?? {};
  if (!email || !password || !name || !role) {
    next(new AppError(400, "email, password, name, role required"));
    return;
  }
  if (!["USER", "COMPANY"].includes(role)) {
    next(new AppError(400, "role must be USER or COMPANY"));
    return;
  }
  if (password.length < 6) {
    next(new AppError(400, "password at least 6 characters"));
    return;
  }
  if (findUserByEmail(email)) {
    next(new AppError(409, "Email already registered"));
    return;
  }
  try {
    const user = createUser(email, password, name, role);
    const accessToken = signToken(user);
    res.status(201).json({ accessToken, user });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "SQLITE_CANTOPEN" || err?.message?.includes("directory") || err?.message?.includes("ENOENT")) {
      next(new AppError(500, "Database path invalid or not writable. Check DB_PATH and permissions."));
      return;
    }
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      next(new AppError(409, "Email already registered"));
      return;
    }
    console.error("Register error:", e);
    next(new AppError(500, "Registration failed"));
  }
});

authRouter.post("/login", (req, res, next) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    next(new AppError(400, "email and password required"));
    return;
  }
  const row = findUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    next(new AppError(401, "Invalid email or password"));
    return;
  }
  const user = rowToUser(row);
  const accessToken = signToken(user);
  res.json({ accessToken, user });
});
