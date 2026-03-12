/**
 * Russian error messages for API responses.
 * B64: Localize backend error messages to Russian.
 */

export const msg = {
  // Common
  forbidden: "Доступ запрещён",
  notFound: "Не найдено",
  internalError: "Внутренняя ошибка сервера",

  // Auth (routes)
  auth_emailPasswordNameRoleRequired: "Укажите email, пароль, имя и роль",
  auth_invalidEmailFormat: "Неверный формат email",
  auth_roleMustBeUserOrCompany: "Роль должна быть USER или COMPANY",
  auth_emailAlreadyRegistered: "Email уже зарегистрирован",
  auth_dbPathInvalid: "Неверный путь к БД или нет прав на запись. Проверьте DB_PATH и права.",
  auth_registrationFailed: "Ошибка регистрации",
  auth_emailAndPasswordRequired: "Укажите email и пароль",
  auth_invalidEmailOrPassword: "Неверный email или пароль",
  auth_emailNotVerified: "Подтвердите email, перейдя по ссылке из письма.",

  // Auth (middleware)
  auth_unauthorized: "Требуется авторизация",
  auth_invalidOrExpiredToken: "Недействительный или просроченный токен",
  auth_userNotFound: "Пользователь не найден",

  // Rate limit
  auth_tooManyAttempts: "Слишком много попыток входа. Попробуйте позже.",

  // B62: Forgot password
  auth_forgotPasswordSuccess:
    "Если указанный email зарегистрирован, на него отправлена ссылка для сброса пароля.",
  auth_resetTokenInvalid: "Недействительная или просроченная ссылка сброса пароля.",
  auth_resetEmailRequired: "Укажите email",
  auth_resetTokenAndPasswordRequired: "Укажите токен сброса и новый пароль",

  // B74: Email verification
  auth_verifyTokenInvalid: "Недействительная или просроченная ссылка подтверждения email.",
  auth_verifySuccess: "Email успешно подтверждён.",

  // Companies
  company_notFound: "Компания не найдена",
  company_onlyCompanyCanCreate: "Создавать компанию может только пользователь с ролью COMPANY",
  company_nameRequired: "Укажите название",
  company_nameNonEmpty: "Название не должно быть пустым",
  company_alreadyHaveCompany: "У вас уже есть компания",
  company_timezoneMax: (max: number) => `Часовой пояс — не более ${max} символов`,
  company_exportFormatInvalid: "Формат экспорта должен быть csv или ical",

  // Directions
  direction_notFound: "Направление не найдено",
  direction_onlyCompanyCanManage: "Управлять направлениями может только компания",
  direction_nameRequired: "Укажите название",
  direction_nameNonEmpty: "Название не должно быть пустым",

  // Slots
  slot_notFound: "Слот не найден",
  slot_companyIdRequired: "Укажите companyId",
  slot_startEndCapacityRequired: "Укажите начало, конец и вместимость",
  slot_invalidStartOrEnd: "Неверные дата или время начала или конца",
  slot_endAfterStart: "Время окончания должно быть позже начала",
  slot_startNotInPast: "Время начала не может быть в прошлом",
  slot_invalidStatus: "Неверный статус",

  // Bookings
  booking_notFound: "Бронирование не найдено",
  booking_onlyUserCanCreate: "Создавать бронирования может только пользователь с ролью USER",
  slot_notAvailable: "Слот недоступен",
  booking_alreadyBooked: "Вы уже забронировали этот слот",
  slot_full: "Слот заполнен",

  // User events
  event_onlyUserCanHave: "Личные события доступны только пользователям с ролью USER",
  event_onlyUserCanCreate: "Создавать личные события может только пользователь с ролью USER",
  event_titleRequired: "Укажите название",
  event_titleNonEmpty: "Название не должно быть пустым",
  event_startEndRequired: "Укажите начало и конец",
  event_invalidStartOrEnd: "Неверные дата или время начала или конца",
  event_endAfterStart: "Время окончания должно быть позже начала",
  event_notFound: "Событие не найдено",
  event_invalidStart: "Неверная дата начала",
  event_invalidEnd: "Неверная дата окончания",

  // User (preferences, password)
  user_notifyEmailBoolean: "notifyEmail должно быть true или false",
  user_notifyInAppBoolean: "notifyInApp должно быть true или false",
  user_calendarViewWeekOrMonth: "calendarView должно быть week или month",
  user_calendarRangeValues: "calendarRange должно быть 7, 14 или 30",
  user_currentAndNewPasswordRequired: "Укажите текущий и новый пароль",
  user_currentPasswordIncorrect: "Текущий пароль неверен",

  // Chat (B55)
  chat_messageRequired: "Укажите текст сообщения.",
  chat_conversationNotFound: "Диалог не найден или недоступен.",
} as const;

/** Validation messages (used by validation.ts). */
export const validation = {
  fieldMustBeString: (fieldName: string) => `${fieldName} должно быть строкой`,
  fieldMaxLength: (fieldName: string, max: number) => `Поле «${fieldName}»: не более ${max} символов`,
  passwordMustBeString: "Пароль должен быть строкой",
  passwordMin: (min: number) => `Пароль: не менее ${min} символов`,
  passwordMax: (max: number) => `Пароль: не более ${max} символов`,
};
