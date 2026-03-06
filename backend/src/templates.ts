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
      subject: "Сброс пароля",
      text: `Перейдите по ссылке для сброса пароля (действует 1 час):\n${resetLink}`,
      html: `<p>Перейдите по ссылке для сброса пароля (действует 1 час):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    }),
  },
  en: {
    passwordReset: ({ resetLink }) => ({
      subject: "Password reset",
      text: `Follow this link to reset your password (valid 1 hour):\n${resetLink}`,
      html: `<p>Follow this link to reset your password (valid 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
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
