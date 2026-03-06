import { Router } from "express";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createUser,
  findUserByEmail,
  rowToUser,
  signToken,
  updatePassword,
  verifyPassword,
} from "../auth.js";
import { AppError } from "../errors.js";
import { logger } from "../logger.js";
import { msg } from "../messages.js";
import { sendEmail } from "../notification.js";
import { getPasswordResetEmail } from "../templates.js";
import type { Locale } from "../templates.js";
import { LIMITS, isValidEmail, validateMaxLength, validatePasswordLength } from "../validation.js";

export const authRouter = Router();

authRouter.post("/register", (req, res, next) => {
  const { email, password, name, role } = req.body ?? {};
  if (!email || !password || !name || !role) {
    next(new AppError(400, msg.auth_emailPasswordNameRoleRequired));
    return;
  }
  if (!isValidEmail(email)) {
    next(new AppError(400, msg.auth_invalidEmailFormat));
    return;
  }
  if (!["USER", "COMPANY"].includes(role)) {
    next(new AppError(400, msg.auth_roleMustBeUserOrCompany));
    return;
  }
  const pwdErr = validatePasswordLength(password);
  if (pwdErr) {
    next(new AppError(400, pwdErr));
    return;
  }
  const nameErr = validateMaxLength(name, LIMITS.USER_NAME_MAX, "name");
  if (nameErr) {
    next(new AppError(400, nameErr));
    return;
  }
  if (findUserByEmail(email)) {
    next(new AppError(409, msg.auth_emailAlreadyRegistered));
    return;
  }
  try {
    const user = createUser(email, password, name, role);
    const accessToken = signToken(user);
    res.status(201).json({ accessToken, user });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "SQLITE_CANTOPEN" || err?.message?.includes("directory") || err?.message?.includes("ENOENT")) {
      next(new AppError(500, msg.auth_dbPathInvalid));
      return;
    }
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      next(new AppError(409, msg.auth_emailAlreadyRegistered));
      return;
    }
    logger.error({ err: e }, "Register error");
    next(new AppError(500, msg.auth_registrationFailed));
  }
});

authRouter.post("/login", (req, res, next) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    next(new AppError(400, msg.auth_emailAndPasswordRequired));
    return;
  }
  if (!isValidEmail(email)) {
    next(new AppError(400, msg.auth_invalidEmailFormat));
    return;
  }
  const row = findUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    next(new AppError(401, msg.auth_invalidEmailOrPassword));
    return;
  }
  const user = rowToUser(row);
  const accessToken = signToken(user);
  res.json({ accessToken, user });
});

/** B62: POST /auth/forgot-password — request password reset. Body: { email }. Rate-limited with /auth. */
authRouter.post("/forgot-password", (req, res, next) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string" || !email.trim()) {
    next(new AppError(400, msg.auth_resetEmailRequired));
    return;
  }
  if (!isValidEmail(email)) {
    next(new AppError(400, msg.auth_invalidEmailFormat));
    return;
  }
  const row = findUserByEmail(email);
  if (row) {
    const token = createPasswordResetToken(row.id);
    const baseUrl = (process.env.FRONTEND_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
    const acceptLanguage = req.headers["accept-language"]?.toString().toLowerCase() ?? "";
    const locale: Locale = acceptLanguage.startsWith("ru") ? "ru" : "en";
    if (baseUrl) {
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const { subject, text, html } = getPasswordResetEmail(resetLink, locale);
      void sendEmail({ to: row.email, subject, text, html }).catch(() => {
        /* already logged in notification */
      });
    }
  }
  res.status(200).json({ message: msg.auth_forgotPasswordSuccess });
});

/** B62: POST /auth/reset-password — set new password with token. Body: { token, newPassword }. */
authRouter.post("/reset-password", (req, res, next) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || typeof token !== "string" || !token.trim() || newPassword === undefined) {
    next(new AppError(400, msg.auth_resetTokenAndPasswordRequired));
    return;
  }
  const pwdErr = validatePasswordLength(newPassword);
  if (pwdErr) {
    next(new AppError(400, pwdErr));
    return;
  }
  const userId = consumePasswordResetToken(token.trim());
  if (!userId) {
    next(new AppError(400, msg.auth_resetTokenInvalid));
    return;
  }
  updatePassword(userId, newPassword as string);
  res.status(204).send();
});
