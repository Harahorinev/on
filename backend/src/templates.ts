/**
 * Email templates for notifications. B78: subject/body, localization-ready.
 * Template keys can be extended for other locales (e.g. templates.en, templates.ru).
 */

export type Locale = "ru" | "en";
type BookingEmailParams = {
  companyName: string;
  startAt: string;
  endAt: string;
  title?: string;
  location?: string;
};

const templates: Record<
  Locale,
  {
    passwordReset: (params: { resetLink: string }) => { subject: string; text: string; html: string };
    emailVerification: (params: { verifyLink: string }) => {
      subject: string;
      text: string;
      html: string;
    };
    bookingCreated: (params: BookingEmailParams) => { subject: string; text: string; html: string };
    bookingCancelled: (params: BookingEmailParams) => { subject: string; text: string; html: string };
    bookingReminder24h: (params: BookingEmailParams) => { subject: string; text: string; html: string };
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
    emailVerification: ({ verifyLink }) => ({
      subject: "On — подтверждение email",
      text: [
        "Здравствуйте!",
        "",
        "Вы зарегистрировались в сервисе On.",
        "",
        "Чтобы завершить регистрацию и подтвердить свой email, перейдите по ссылке ниже (она действует 24 часа):",
        verifyLink,
        "",
        "Если вы не регистрировались в On, просто игнорируйте это письмо.",
        "",
        "С уважением,",
        "Команда On",
      ].join("\n"),
      html: [
        "<p>Здравствуйте!</p>",
        "<p>Вы зарегистрировались в сервисе <strong>On</strong>.</p>",
        "<p>Чтобы завершить регистрацию и подтвердить свой email, перейдите по ссылке ниже (она действует 24 часа):</p>",
        `<p><a href="${verifyLink}">${verifyLink}</a></p>`,
        "<p>Если вы не регистрировались в On, просто игнорируйте это письмо.</p>",
        "<p>С уважением,<br/>Команда On</p>",
      ].join(""),
    }),
    bookingCreated: ({ companyName, startAt, endAt, title, location }) => ({
      subject: "On — запись подтверждена",
      text: [
        "Здравствуйте!",
        "",
        "Ваша запись подтверждена.",
        `Компания: ${companyName}`,
        title ? `Услуга: ${title}` : null,
        `Начало: ${startAt}`,
        `Окончание: ${endAt}`,
        location ? `Место: ${location}` : null,
        "",
        "С уважением,",
        "Команда On",
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        "<p>Здравствуйте!</p>",
        "<p>Ваша запись подтверждена.</p>",
        `<p>Компания: <strong>${companyName}</strong><br/>`,
        title ? `Услуга: <strong>${title}</strong><br/>` : "",
        `Начало: <strong>${startAt}</strong><br/>`,
        `Окончание: <strong>${endAt}</strong><br/>`,
        location ? `Место: <strong>${location}</strong>` : "",
        "</p>",
        "<p>С уважением,<br/>Команда On</p>",
      ].join(""),
    }),
    bookingCancelled: ({ companyName, startAt, endAt, title, location }) => ({
      subject: "On — запись отменена",
      text: [
        "Здравствуйте!",
        "",
        "Ваша запись отменена.",
        `Компания: ${companyName}`,
        title ? `Услуга: ${title}` : null,
        `Начало: ${startAt}`,
        `Окончание: ${endAt}`,
        location ? `Место: ${location}` : null,
        "",
        "С уважением,",
        "Команда On",
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        "<p>Здравствуйте!</p>",
        "<p>Ваша запись отменена.</p>",
        `<p>Компания: <strong>${companyName}</strong><br/>`,
        title ? `Услуга: <strong>${title}</strong><br/>` : "",
        `Начало: <strong>${startAt}</strong><br/>`,
        `Окончание: <strong>${endAt}</strong><br/>`,
        location ? `Место: <strong>${location}</strong>` : "",
        "</p>",
        "<p>С уважением,<br/>Команда On</p>",
      ].join(""),
    }),
    bookingReminder24h: ({ companyName, startAt, endAt, title, location }) => ({
      subject: "On — напоминание о записи (24 часа)",
      text: [
        "Здравствуйте!",
        "",
        "Напоминаем: до вашей записи осталось менее 24 часов.",
        `Компания: ${companyName}`,
        title ? `Услуга: ${title}` : null,
        `Начало: ${startAt}`,
        `Окончание: ${endAt}`,
        location ? `Место: ${location}` : null,
        "",
        "С уважением,",
        "Команда On",
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        "<p>Здравствуйте!</p>",
        "<p>Напоминаем: до вашей записи осталось менее 24 часов.</p>",
        `<p>Компания: <strong>${companyName}</strong><br/>`,
        title ? `Услуга: <strong>${title}</strong><br/>` : "",
        `Начало: <strong>${startAt}</strong><br/>`,
        `Окончание: <strong>${endAt}</strong><br/>`,
        location ? `Место: <strong>${location}</strong>` : "",
        "</p>",
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
    emailVerification: ({ verifyLink }) => ({
      subject: "On — email confirmation",
      text: [
        "Hello,",
        "",
        "Thank you for signing up to On.",
        "",
        "To complete your registration and confirm your email address, please follow the link below (valid for 24 hours):",
        verifyLink,
        "",
        "If you did not sign up to On, you can safely ignore this email.",
        "",
        "Best regards,",
        "On Team",
      ].join("\n"),
      html: [
        "<p>Hello,</p>",
        "<p>Thank you for signing up to <strong>On</strong>.</p>",
        "<p>To complete your registration and confirm your email address, please follow the link below (valid for 24 hours):</p>",
        `<p><a href="${verifyLink}">${verifyLink}</a></p>`,
        "<p>If you did not sign up to On, you can safely ignore this email.</p>",
        "<p>Best regards,<br/>On Team</p>",
      ].join(""),
    }),
    bookingCreated: ({ companyName, startAt, endAt, title, location }) => ({
      subject: "On — booking confirmed",
      text: [
        "Hello,",
        "",
        "Your booking is confirmed.",
        `Company: ${companyName}`,
        title ? `Service: ${title}` : null,
        `Start: ${startAt}`,
        `End: ${endAt}`,
        location ? `Location: ${location}` : null,
        "",
        "Best regards,",
        "On Team",
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        "<p>Hello,</p>",
        "<p>Your booking is confirmed.</p>",
        `<p>Company: <strong>${companyName}</strong><br/>`,
        title ? `Service: <strong>${title}</strong><br/>` : "",
        `Start: <strong>${startAt}</strong><br/>`,
        `End: <strong>${endAt}</strong><br/>`,
        location ? `Location: <strong>${location}</strong>` : "",
        "</p>",
        "<p>Best regards,<br/>On Team</p>",
      ].join(""),
    }),
    bookingCancelled: ({ companyName, startAt, endAt, title, location }) => ({
      subject: "On — booking cancelled",
      text: [
        "Hello,",
        "",
        "Your booking has been cancelled.",
        `Company: ${companyName}`,
        title ? `Service: ${title}` : null,
        `Start: ${startAt}`,
        `End: ${endAt}`,
        location ? `Location: ${location}` : null,
        "",
        "Best regards,",
        "On Team",
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        "<p>Hello,</p>",
        "<p>Your booking has been cancelled.</p>",
        `<p>Company: <strong>${companyName}</strong><br/>`,
        title ? `Service: <strong>${title}</strong><br/>` : "",
        `Start: <strong>${startAt}</strong><br/>`,
        `End: <strong>${endAt}</strong><br/>`,
        location ? `Location: <strong>${location}</strong>` : "",
        "</p>",
        "<p>Best regards,<br/>On Team</p>",
      ].join(""),
    }),
    bookingReminder24h: ({ companyName, startAt, endAt, title, location }) => ({
      subject: "On — booking reminder (24h)",
      text: [
        "Hello,",
        "",
        "Reminder: your booking starts in less than 24 hours.",
        `Company: ${companyName}`,
        title ? `Service: ${title}` : null,
        `Start: ${startAt}`,
        `End: ${endAt}`,
        location ? `Location: ${location}` : null,
        "",
        "Best regards,",
        "On Team",
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        "<p>Hello,</p>",
        "<p>Reminder: your booking starts in less than 24 hours.</p>",
        `<p>Company: <strong>${companyName}</strong><br/>`,
        title ? `Service: <strong>${title}</strong><br/>` : "",
        `Start: <strong>${startAt}</strong><br/>`,
        `End: <strong>${endAt}</strong><br/>`,
        location ? `Location: <strong>${location}</strong>` : "",
        "</p>",
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

export function getEmailVerificationEmail(
  verifyLink: string,
  locale: Locale = "ru"
): { subject: string; text: string; html: string } {
  const t = templates[locale] ?? templates.ru;
  return t.emailVerification({ verifyLink });
}

export type BookingEmailType = "booking_created" | "booking_cancelled" | "booking_reminder_24h";

export function getBookingEmail(
  type: BookingEmailType,
  params: BookingEmailParams,
  locale: Locale = "ru"
): { subject: string; text: string; html: string } {
  const t = templates[locale] ?? templates.ru;
  if (type === "booking_created") return t.bookingCreated(params);
  if (type === "booking_cancelled") return t.bookingCancelled(params);
  return t.bookingReminder24h(params);
}
