# ON Backend

Node.js + Express + TypeScript API для приложения «Расписание» (компании, слоты, бронирования).

## Запуск

```bash
cd backend
cp .env.example .env   # опционально
npm install
npm run dev
```

Сервер: `http://localhost:3001`

Переменные окружения (`.env`): `PORT`, `JWT_SECRET`, `DB_PATH` (путь к SQLite, по умолчанию `data.db` в папке backend).

## API

- `POST /auth/register`, `POST /auth/login` — регистрация и вход (JWT)
- `GET/POST /companies`, `GET/PATCH /companies/me`, `GET /companies/:id` — компании
- `GET/POST /companies/:companyId/directions`, `GET/PATCH/DELETE /companies/:companyId/directions/:directionId` — направления компании (CRUD; только владелец компании)
- `GET/POST /companies/:id/slots`, `GET/PATCH/DELETE /companies/:id/slots/:slotId` — слоты
- `GET /slots/:id` — слот по id
- `POST /slots/:slotId/bookings` — записаться на слот
- `GET /bookings/me`, `GET/DELETE /bookings/:id` — мои записи
- `GET /health` — проверка работы

## Скрипты

- `npm run dev` — разработка с hot reload (tsx)
- `npm run build` — сборка в `dist/`
- `npm run start` — запуск собранного приложения
