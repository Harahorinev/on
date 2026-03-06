/**
 * Email templates for notifications. B78: subject/body, localization-ready.
 * Template keys can be extended for other locales (e.g. templates.en, templates.ru).
 */

export type Locale = "ru" | "en";

const templates: Record<
  Locale,
  {
    passwordReset: (params: { resetLink: string }) => { subject: string; text: string; html: string };
  }
> = {
  ru: {
    passwordReset: ({ resetLink }) => ({
      subject: "On — сброс пароля",
      text: [
        "Здравствуйте!",
        "",
        "Вы запросили сброс пароля в сервисе On.",
        "",
        "Если это были вы, перейдите по ссылке ниже. Ссылка действует 1 час:",
        resetLink,
        "",
        "Если вы не запрашивали сброс пароля, просто игнорируйте это письмо — пароль останется без изменений.",
        "",
        "С уважением,",
        "Команда On",
      ].join("\n"),
      html: [
        "<p>Здравствуйте!</p>",
        "<p>Вы запросили сброс пароля в сервисе <strong>On</strong>.</p>",
        '<p>Если это были вы, перейдите по ссылке ниже. Ссылка действует 1 час:</p>',
        `<p><a href="${resetLink}">${resetLink}</a></p>`,
        "<p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо — пароль останется без изменений.</p>",
        "<p>С уважением,<br/>Команда On</p>",
      ].join(""),
    }),
  },
  en: {
    passwordReset: ({ resetLink }) => ({
      subject: "On — password reset",
      text: [
        "Hello,",
        "",
        "You requested a password reset in On.",
        "",
        "If this was you, follow the link below. The link is valid for 1 hour:",
        resetLink,
        "",
        "If you did not request a password reset, you can safely ignore this email and your password will stay unchanged.",
        "",
        "Best regards,",
        "On Team",
      ].join("\n"),
      html: [
        "<p>Hello,</p>",
        "<p>You requested a password reset in <strong>On</strong>.</p>",
        "<p>If this was you, follow the link below. The link is valid for 1 hour:</p>",
        `<p><a href="${resetLink}">${resetLink}</a></p>`,
        "<p>If you did not request a password reset, you can safely ignore this email and your password will stay unchanged.</p>",
        "<p>Best regards,<br/>On Team</p>",
      ].join(""),
    }),
  },
};

export function getPasswordResetEmail(
  resetLink: string,
  locale: Locale = "ru"
): { subject: string; text: string; html: string } {
  const t = templates[locale] ?? templates.ru;
  return t.passwordReset({ resetLink });
}
