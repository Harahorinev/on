/**
 * Shared validation helpers and limits for request body fields.
 * B90: email format and max lengths for names, passwords, text fields.
 */

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
  if (typeof value !== "string") return `${fieldName} must be a string`;
  if (value.length > max) return `${fieldName} must be at most ${max} characters`;
  return null;
}

export function validatePasswordLength(password: unknown): string | null {
  if (typeof password !== "string") return "password must be a string";
  if (password.length < LIMITS.PASSWORD_MIN)
    return `password must be at least ${LIMITS.PASSWORD_MIN} characters`;
  if (password.length > LIMITS.PASSWORD_MAX)
    return `password must be at most ${LIMITS.PASSWORD_MAX} characters`;
  return null;
}
