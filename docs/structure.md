# Структура проекта

Описывает текущую организацию папок и файлов и рекомендации для будущих тасков.

## Корень репозитория

```
on/
├── .cursor/rules/     # Правила для AI (например, тесты для новых компонентов)
├── .github/workflows/  # CI/CD (lint, build, e2e, deploy)
├── backend/           # Node.js + Express API
├── docs/              # Документация (deploy, nginx, structure)
├── frontend/          # React + Vite SPA
├── README.md
└── .gitignore
```

---

## Backend (`backend/`)

```
backend/
├── src/
│   ├── index.ts       # Точка входа, подключение роутов и middleware
│   ├── db.ts          # Инициализация SQLite
│   ├── auth.ts        # JWT middleware
│   └── routes/        # Роуты по доменам (один файл = один ресурс/домен)
│       ├── auth.ts
│       ├── companies.ts
│       ├── slots.ts
│       ├── bookings.ts
│       ├── directions.ts
│       └── userEvents.ts
├── scripts/
│   └── seed.ts        # Сид для тестовых данных
├── package.json
└── .env.example
```

**Рекомендации для будущих тасков:**

- **Новый домен (например, «Уведомления»):** добавить `routes/notifications.ts` и подключить в `index.ts`.
- **Рост логики в роутах:** вынести бизнес-логику в `src/services/` (например, `services/bookingService.ts`), роуты оставить тонкими (валидация → вызов сервиса → ответ).
- **Общие типы/хелперы:** при дублировании завести `src/types.ts` или `src/utils/`.
- **Миграции БД:** при появлении миграций — папка `scripts/migrations/` или отдельный пакет миграций.

---

## Frontend (`frontend/`)

```
frontend/
├── e2e/               # Playwright E2E-тесты
│   ├── auth.spec.ts
│   ├── calendar.spec.ts
│   └── README.md
├── public/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/    # Переиспользуемые UI-компоненты
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── CreateCompanyForm.tsx
│   │   ├── CreateSlotForm.tsx
│   │   └── *.test.tsx
│   ├── contexts/      # React Context (auth, notifications)
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── pages/         # Страницы (роуты)
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── CompaniesPage.tsx
│   │   ├── CompanySchedulePage.tsx
│   │   ├── CompanyPage.tsx
│   │   ├── BookingsPage.tsx
│   │   ├── MyCalendarPage.tsx
│   │   └── *.test.tsx
│   ├── lib/           # API-клиент, типы, утилиты
│   │   └── api.ts     # axios instance + типы + authApi, companiesApi, ...
│   └── test/
│       └── setup.ts   # setup для Vitest (jest-dom и т.п.)
├── package.json
├── vite.config.ts
├── playwright.config.ts
└── eslint.config.js
```

**Рекомендации для будущих тасков:**

- **Новая страница:** `pages/NewFeaturePage.tsx` + `pages/NewFeaturePage.test.tsx`, маршрут в `App.tsx`. По конвенции (.cursor/rules) — тесты обязательны.
- **Новый переиспользуемый компонент:** `components/ComponentName.tsx` + `*.test.tsx`. Если появятся много мелких UI-кирпичиков (кнопки, инпуты, модалки) — выделить подпапку `components/ui/`.
- **Разрастание `lib/api.ts`:** разбить на `lib/api/client.ts`, `lib/api/types.ts`, `lib/api/auth.ts`, `lib/api/companies.ts` и т.д., в `lib/api/index.ts` реэкспортировать. Пока один файл допустим.
- **Переиспользуемая логика (хуки):** при повторении — папка `src/hooks/` (например, `useCompanies.ts`, `useAuthGuard.ts`).
- **E2E:** новые сценарии — новые `e2e/*.spec.ts` по фичам (auth, calendar, bookings, …).

---

## Документация (`docs/`)

| Файл | Назначение |
|------|------------|
| `structure.md` | Структура проекта (этот файл) |
| `database-schema.md` | Описание таблиц SQLite, в т.ч. employee_directions (B91) |
| `env-vars.md` | Единая памятка по переменным окружения backend/frontend (M36) |
| `email-setup.md` | Настройка отправки email (FRONTEND_URL, SMTP, сброс пароля) |
| `deploy-cd.md` | CD через GitHub Actions, секреты, сервер |
| `nginx-server.md` | Nginx для фронта и прокси `/api` на бэкенд |
| `ssl-certificates.md` | HTTPS: Let's Encrypt, Certbot, настройка Nginx (M68) |

При добавлении новых способов развёртывания, API-контрактов или архитектурных решений — дополнять `docs/` и при необходимости ссылаться из README.

---

## Итог

- **Сейчас:** структура плоская и понятная; тесты рядом с компонентами/страницами; один файл API на фронте — ок для текущего размера.
- **По мере роста:** выносить логику бэка в `services/`, дробить `lib/api.ts` и добавлять `hooks/` и `components/ui/` на фронте, не меняя общую схему папок.

При новых тасках ориентироваться на этот документ и конвенции в `.cursor/rules/`.
