# ON Backend

Express + TypeScript API для платформы компаний, сотрудников, слотов, бронирований, личного календаря, чата и email-flow.

## Быстрый старт

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

По умолчанию сервер поднимается на `http://localhost:3001`.

## Переменные окружения

Базовые:

- `PORT`
- `JWT_SECRET`
- `DB_PATH`

Дополнительно используются переменные для:

- SMTP / email notifications
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- AI/chat integration

Смотри также `docs/env-vars.md` и `docs/email-setup.md`.

## Что есть в API

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/verify-email`

### Companies

- `GET /companies`
- `POST /companies`
- `GET /companies/me`
- `GET /companies/:id`
- `PATCH /companies/:id`
- `GET /companies/:id/bookings`
- `GET /companies/:id/export?format=csv|ical`

### Directions

- `GET /companies/:companyId/directions`
- `POST /companies/:companyId/directions`
- `GET /companies/:companyId/directions/:directionId`
- `PATCH /companies/:companyId/directions/:directionId`
- `DELETE /companies/:companyId/directions/:directionId`

### Employees

- `GET /companies/:companyId/employees`
- `POST /companies/:companyId/employees`
- `PATCH /companies/:companyId/employees/:employeeId`
- `DELETE /companies/:companyId/employees/:employeeId`

Удаление сотрудника мягкое: сотрудник получает `deleted_at`, будущие слоты можно удалить или оставить без исполнителя, а прошедшие слоты могут сохранить его для истории.

### Slots and bookings

- `GET /companies/:companyId/slots`
- `POST /companies/:companyId/slots`
- `GET /companies/:companyId/slots/:slotId`
- `PATCH /companies/:companyId/slots/:slotId`
- `DELETE /companies/:companyId/slots/:slotId`
- `GET /slots/:id`
- `POST /slots/:slotId/bookings`
- `GET /bookings/me`
- `GET /bookings/:id`
- `DELETE /bookings/:id`

`slots`, company bookings и export поддерживают фильтры `dateFrom`, `dateTo`, `employeeId`, `sortBy`, `sortOrder`.

### User area

- `GET /user/events`
- `POST /user/events`
- `GET /user/events/:id`
- `PATCH /user/events/:id`
- `DELETE /user/events/:id`
- `GET /user/preferences`
- `PATCH /user/preferences`
- `PATCH /user/password`

### Chat and service routes

- `POST /chat/ai`
- `GET /health`

## Внутренняя структура

- `src/db.ts` — schema и compatibility `ALTER TABLE`
- `src/slotViews.ts` — общие slot filters/order/serialization helpers
- `src/employeeLifecycle.ts` — soft-delete сотрудника и cleanup future slots
- `src/routes/*.ts` — маршруты по доменам
- `scripts/seed.ts` — seed данных
- `scripts/backup.ts` — ручной backup SQLite

## Скрипты

- `npm run dev` — dev server с `tsx watch`
- `npm run build` — компиляция TypeScript в `dist/`
- `npm run start` — запуск `dist/index.js`
- `npm run test` — Vitest
- `npm run seed` — наполнить базу тестовыми данными
- `npm run backup` — создать backup БД

## Примечания

- Напоминания о бронированиях стартуют автоматически вне `NODE_ENV=test`.
- Healthcheck возвращает не только `ok`, но и snapshot monitoring-метрик.
- Актуальная схема БД описана в `docs/database-schema.md`.
