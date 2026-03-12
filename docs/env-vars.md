# Переменные окружения

Единая памятка по переменным окружения для `backend` и `frontend`.
Актуальные примеры также лежат в `backend/.env.example` и `frontend/.env.example`.

## Backend (`backend/.env`)

| Переменная | Обязательность | Назначение | Пример |
|---|---|---|---|
| `PORT` | опционально | Порт HTTP API | `3001` |
| `DB_PATH` | опционально | Путь к SQLite базе (если пусто, используется `backend/data.db`) | `/var/www/on/backend/data.db` |
| `JWT_SECRET` | обязательно в production | Секрет для JWT-подписи. В production без безопасного значения сервер завершится. | `super-long-random-secret` |
| `ALLOWED_ORIGINS` | опционально | Разрешённые CORS-origin через запятую | `https://och-net.ru,https://app.och-net.ru` |
| `FRONTEND_URL` | рекомендуется | Базовый URL фронта для ссылок в email (reset/verify) | `https://och-net.ru` |
| `SMTP_HOST` | обязательно для email | SMTP хост | `smtp.yandex.ru` |
| `SMTP_PORT` | обязательно для email | SMTP порт | `465` |
| `SMTP_SECURE` | обязательно для email | TLS/SSL режим SMTP (`true`/`false`) | `true` |
| `SMTP_USER` | обязательно для email | SMTP логин | `example@yandex.ru` |
| `SMTP_PASS` | обязательно для email | SMTP пароль/пароль приложения | `***` |
| `MAIL_FROM` | опционально | Email отправителя (по умолчанию `SMTP_USER`) | `noreply@och-net.ru` |
| `MAIL_FROM_NAME` | опционально | Имя отправителя писем | `On` |
| `OPENAI_API_KEY` | опционально | Ключ AI-провайдера (если пусто, используется stub-клиент) | `sk-...` |
| `OPENAI_MODEL` | опционально | Модель AI | `gpt-4o-mini` |
| `OPENAI_BASE_URL` | опционально | Базовый URL OpenAI-compatible API | `https://api.openai.com/v1` |
| `AI_TIMEOUT_MS` | опционально | Таймаут AI-запроса в мс | `15000` |
| `BOOKING_REMINDER_INTERVAL_MS` | опционально | Интервал проверки напоминаний о записи (B84) | `900000` |
| `BOOKING_REMINDER_OFFSETS_MINUTES` | опционально | Смещения напоминаний в минутах через запятую (B40) | `1440,60` |

## Frontend (`frontend/.env`)

| Переменная | Обязательность | Назначение | Пример |
|---|---|---|---|
| `VITE_API_URL` | обязательно | Базовый URL API для фронта | `http://localhost:3001` |
| `VITE_USE_MF` | опционально | Включение микрофронтендов (`true`/`false`) | `true` |
| `VITE_REMOTE_AUTH_URL` | при `VITE_USE_MF=true` | URL remote auth | `https://och-net.ru/remote-auth` |
| `VITE_REMOTE_USER_URL` | при `VITE_USE_MF=true` | URL remote user | `https://och-net.ru/remote-user` |
| `VITE_REMOTE_COMPANY_URL` | при `VITE_USE_MF=true` | URL remote company | `https://och-net.ru/remote-company` |

## Где использовать

- Локально: создавайте `backend/.env` и `frontend/.env` на основе `.env.example`.
- На сервере: задавайте переменные в окружении процесса (`pm2`, `systemd`, Docker secrets).
- Не коммитьте реальные секреты (`JWT_SECRET`, `SMTP_PASS`, `OPENAI_API_KEY`) в git.
