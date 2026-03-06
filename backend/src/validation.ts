/**
 * Shared validation helpers and limits for request body fields.
 * B90: email format and max lengths for names, passwords, text fields.
 * B64: validation messages in Russian.
 */

import { validation as v } from "./messages.js";

export const LIMITS = {
  USER_NAME_MAX: 256,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 72,
  COMPANY_NAME_MAX: 500,
  DESCRIPTION_MAX: 2000,
  TITLE_MAX: 500,
  LOCATION_MAX: 500,
  TIMEZONE_MAX: 64,
} as const;

/** Human-readable field names for validation messages. */
const FIELD_NAMES: Record<string, string> = {
  name: "Имя",
  description: "Описание",
  title: "Название",
  location: "Место",
  timezone: "Часовой пояс",
};

function fieldLabel(fieldName: string): string {
  return FIELD_NAMES[fieldName] ?? fieldName;
}

/** Simple email format: local@domain with at least one dot in domain. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

export function validateMaxLength(
  value: unknown,
  max: number,
  fieldName: string
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return v.fieldMustBeString(fieldLabel(fieldName));
  if (value.length > max) return v.fieldMaxLength(fieldLabel(fieldName), max);
  return null;
}

export function validatePasswordLength(password: unknown): string | null {
  if (typeof password !== "string") return v.passwordMustBeString;
  if (password.length < LIMITS.PASSWORD_MIN)
    return v.passwordMin(LIMITS.PASSWORD_MIN);
  if (password.length > LIMITS.PASSWORD_MAX)
    return v.passwordMax(LIMITS.PASSWORD_MAX);
  return null;
}
