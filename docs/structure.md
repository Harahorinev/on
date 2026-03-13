# Структура проекта

Документ описывает фактическую структуру репозитория после разделения host + microfrontends.

## Корень

```text
on/
├── backend/            # Express + SQLite API
├── docs/               # Техническая документация и deployment notes
├── frontend/           # Host SPA (shell, shared UI, fallback pages)
├── frontend-auth/      # Remote для login/register
├── frontend-user/      # Remote для пользовательских маршрутов
├── frontend-company/   # Remote для кабинета компании
├── README.md
└── .github/workflows/  # CI/CD
```

## Backend

```text
backend/
├── src/
│   ├── index.ts                 # Express app, middleware, подключение роутов
│   ├── db.ts                    # SQLite schema + compatibility ALTERs
│   ├── db-types.ts              # Типы строк для better-sqlite3 query results
│   ├── auth.ts                  # JWT auth middleware
│   ├── errors.ts                # AppError + error handlers
│   ├── emailNotifications.ts    # Email reminders/notifications scheduler
│   ├── monitoring.ts            # Snapshot для /health
│   ├── slotViews.ts             # Shared slot filters/order/mappers
│   ├── employeeLifecycle.ts     # Soft-delete сотрудника и обработка future slots
│   └── routes/
│       ├── auth.ts
│       ├── companies.ts
│       ├── directions.ts
│       ├── employees.ts
│       ├── slots.ts
│       ├── bookings.ts
│       ├── user.ts
│       ├── userEvents.ts
│       └── chat.ts
├── scripts/
│   ├── seed.ts                  # Тестовые/демо данные
│   └── backup.ts                # Ручной backup SQLite
├── package.json
└── .env.example
```

Ключевые особенности backend-структуры:

- Бизнес-логика пока в основном живёт рядом с роутами, но общие части уже вынесены в `slotViews.ts` и `employeeLifecycle.ts`.
- `index.ts` подключает также `/chat`, `/user/preferences`, `/user/password`, `/companies/:id/export`, `/companies/:companyId/employees`.
- Напоминания по email стартуют автоматически вне test-окружения через `startBookingReminderScheduler()`.

## Frontend host

```text
frontend/
├── e2e/                        # Playwright smoke/user flows
├── src/
│   ├── routes.tsx              # Решает: local pages или module federation remotes
│   ├── components/
│   │   ├── ActionDialog.tsx
│   │   ├── CreateCompanyForm.tsx
│   │   ├── CreateSlotForm.tsx
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── company/            # Блоки кабинета компании
│   │       ├── DeleteEmployeeDialog.tsx
│   │       ├── EmployeeSection.tsx
│   │       ├── SlotFilters.tsx
│   │       └── SlotList.tsx
│   ├── contexts/               # AuthContext / NotificationContext
│   ├── lib/
│   │   ├── api.ts
│   │   ├── date.ts
│   │   └── slotQuery.ts
│   ├── pages/                  # Local fallback pages и host-only pages
│   └── test/
└── package.json
```

Host отвечает за:

- глобальный layout и protected routing;
- shared CSS (`index.css`);
- fallback-страницы, если remotes недоступны;
- интеграцию remotes через `VITE_USE_MF`.

## Microfrontends

### `frontend-auth`

- Лёгкий remote только для auth-flow.
- Основные файлы: `src/App.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/lib/api.ts`.

### `frontend-user`

- Remote для пользовательских маршрутов: компании, расписание компании, бронирования, календарь, настройки.
- Содержит собственный `ActionDialog` и свой API client, синхронизированный по контракту с host.

### `frontend-company`

- Remote для кабинета компании.
- Содержит company dashboard, формы создания слотов и сотрудников, employee delete dialog и свой API client.

## Документация

| Файл | Назначение |
|------|------------|
| `docs/structure.md` | Текущая структура репозитория |
| `docs/database-schema.md` | Актуальная SQLite schema |
| `docs/env-vars.md` | Переменные окружения backend/frontend |
| `docs/email-setup.md` | SMTP и email-flow |
| `docs/deploy-cd.md` | Deploy/CD |
| `docs/nginx-server.md` | Nginx и reverse proxy |
| `docs/ssl-certificates.md` | HTTPS / Let's Encrypt |

## Что учитывать в новых задачах

- Если меняется API-контракт, проверять и host `frontend/src/lib/api.ts`, и remote `frontend-auth|user|company/src/lib/api.ts`.
- Если меняется маршрут из `frontend/src/routes.tsx`, проверять поведение и в local fallback, и в remote-app.
- Если backend-роут начинает дублировать slot/bookings логику, дополнять `backend/src/slotViews.ts` или выносить новый shared helper рядом.
- При изменениях в БД обновлять одновременно `backend/src/db.ts` и `docs/database-schema.md`.
