# Database schema

SQLite-схема и все `ALTER TABLE` живут в `backend/src/db.ts`.

## Основные таблицы

### `users`

- Аккаунты приложения.
- Ключевые поля: `id`, `email`, `password_hash`, `name`, `role`, `email_verified`, `email_verified_at`, `created_at`.
- `role` ограничен значениями `USER` и `COMPANY`.

### `companies`

- Организации, которыми владеют пользователи с ролью `COMPANY`.
- Ключевые поля: `id`, `name`, `description`, `timezone`, `owner_id`, `created_at`.
- Связь: `owner_id -> users.id`.

### `employees`

- Сотрудники конкретной компании.
- Ключевые поля: `id`, `company_id`, `name`, `description`, `photo_url`, `created_at`, `deleted_at`.
- Связь: `company_id -> companies.id`.
- Удаление мягкое: при удалении сотрудника заполняется `deleted_at`, а сам ряд остаётся в БД.
- Это позволяет сохранять исполнителя на прошедших слотах для истории.

### `directions`

- Направления/категории компании.
- Ключевые поля: `id`, `company_id`, `name`, `description`, `sort_order`, `created_at`.
- Связь: `company_id -> companies.id`.

### `employee_directions`

- M:N-связь между сотрудниками и направлениями.
- Ключевые поля: `employee_id`, `direction_id`.
- Первичный ключ составной: `(employee_id, direction_id)`.
- `direction_id -> directions.id`.
- Используется в CRUD сотрудников и для очистки связей при удалении направления/сотрудника.

### `slots`

- События/слоты компании.
- Ключевые поля: `id`, `company_id`, `employee_id`, `start_at`, `end_at`, `capacity`, `status`, `title`, `description`, `location`, `created_at`.
- Связи:
  - `company_id -> companies.id`
  - `employee_id -> employees.id` (nullable)
- `employee_id` необязателен: компания может создать слот без исполнителя и назначить его позже.
- При soft-delete сотрудника:
  - будущие слоты могут быть либо удалены, либо оставлены без исполнителя;
  - прошедшие слоты могут сохранить `employee_id` для истории.

### `bookings`

- Бронирования пользователей на слоты.
- Ключевые поля: `id`, `slot_id`, `user_id`, `status`, `created_at`.
- Связи:
  - `slot_id -> slots.id`
  - `user_id -> users.id`
- Ограничение: `UNIQUE(slot_id, user_id)`.
- `status`: `CONFIRMED` или `CANCELLED`.

### `user_events`

- Личные события пользователя в календаре.
- Ключевые поля: `id`, `user_id`, `title`, `description`, `start_at`, `end_at`, `created_at`.
- Связь: `user_id -> users.id`.

### `user_preferences`

- Пользовательские настройки календаря и уведомлений.
- Ключевые поля: `user_id`, `preferences`.
- `user_id` одновременно является PK и FK на `users.id`.

## Chat и email-flow

### `chat_conversations`

- Диалоги, привязанные к владельцу.
- Ключевые поля: `id`, `owner_user_id`, `type`, `title`, `created_at`, `last_message_at`.
- `type` поддерживает `assistant` и зарезервированный `direct`.

### `chat_messages`

- Сообщения внутри диалога.
- Ключевые поля: `id`, `conversation_id`, `sender_role`, `sender_user_id`, `content`, `booking_id`, `user_event_id`, `created_at`.
- `conversation_id -> chat_conversations.id`.
- `booking_id -> bookings.id`, `user_event_id -> user_events.id`.

### `password_reset_tokens`

- Токены сброса пароля.
- Ключевые поля: `token`, `user_id`, `expires_at`, `created_at`.

### `email_verification_tokens`

- Токены подтверждения email.
- Ключевые поля: `token`, `user_id`, `expires_at`, `created_at`.

### `email_notification_logs`

- Лог отправленных email-уведомлений.
- Ключевые поля: `id`, `user_id`, `entity_type`, `entity_id`, `type`, `sent_at`.
- Уникальность: `(user_id, entity_type, entity_id, type)`.

## Индексы и совместимость

- В `db.ts` создаются индексы для компаний, слотов, сотрудников, бронирований, токенов, chat и email logs.
- Для уже существующих БД схема поддерживается через `ALTER TABLE`:
  - `employees.deleted_at`
  - `slots.employee_id`
  - `users.email_verified`
  - `users.email_verified_at`
