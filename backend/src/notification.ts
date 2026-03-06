/**
 * B78: Notification delivery abstraction. Primary channel: email (nodemailer).
 * When SMTP is not configured (e.g. test or missing env), sendEmail no-ops and logs.
 */
import nodemailer from "nodemailer";
import { logger } from "./logger.js";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "noreply@localhost";
const FROM_NAME = process.env.MAIL_FROM_NAME ?? "On";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== null) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return transporter;
  } catch (e) {
    logger.warn({ err: e }, "Failed to create SMTP transporter");
    return null;
  }
}

/** True if SMTP env is set and sending is possible. */
export function isEmailConfigured(): boolean {
  return getTransporter() !== null;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email. No-ops if SMTP not configured (logs at debug).
 * Errors are logged but not thrown so callers (e.g. auth) can still return 200.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV !== "test") {
      logger.debug("Email not sent: SMTP not configured");
    }
    return false;
  }
  try {
    await transport.sendMail({
      from: FROM_NAME ? `"${FROM_NAME}" <${FROM_EMAIL}>` : FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text,
    });
    logger.info({ to: options.to, subject: options.subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, "Email send failed");
    return false;
  }
}
