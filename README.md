# ON

Сервис для записи на слоты к компаниям: компании создают расписание, пользователи записываются на свободные слоты.

## Локальный запуск

- **Бэкенд:** в папке `backend`: `npm install`, `npm run dev`. По умолчанию слушает порт **3001** (переменная `PORT` в `.env`).
- **Фронт:** в папке `frontend`: `npm install`, `npm run dev`. Dev-сервер на порту 5173, запросы к `/api` проксируются на бэкенд **http://localhost:3001**.
- Для продакшена URL API задаётся через `VITE_API_URL` при сборке фронта (в dev по умолчанию используется 3001).

### Микрофронтенды (host + remotes)

Фронт разбит на host (`frontend/`) и три remote-приложения: **auth** (логин/регистрация), **user** (компании, записи, календарь, настройки), **company** (кабинет компании). В dev для работы с remotes нужно собрать их и поднять preview: из корня проекта:

```bash
cd frontend-auth && npm install && npm run build && npm run preview &
cd frontend-user && npm install && npm run build && npm run preview &
cd frontend-company && npm install && npm run build && npm run preview &
cd frontend && npm run dev
```

По умолчанию host рендерит локальные страницы. Чтобы использовать микрофронтенды локально: `VITE_USE_MF=true` в `frontend/.env` и запуск remotes на 5174, 5175, 5176. В проде при деплое remotes собираются и кладутся в `frontend/dist/remote-auth`, `remote-user`, `remote-company`; host собирается с `VITE_USE_MF=true` и URL вида `https://och-net.ru/remote-auth` и т.д. (один домен, статика remotes по путям `/remote-auth/`, `/remote-user/`, `/remote-company/`).

## Деплой и окружение — см. [DEPLOY.md](DEPLOY.md) и [docs/deploy-cd.md](docs/deploy-cd.md).

## Структура проекта

Описание папок, файлов и рекомендации для новых тасков — в [docs/structure.md](docs/structure.md).

---

# Работа с задачами

У каждой задачи есть свой префикс, в зависимости от того к какому скоупу она относится
    M(main) - в основоном сюда относятся задачи скоуп которых не относятся ни к фронту ни к бэку
    B(backend) - задачи для бэка
    F(frontend) - задачи для фронта

Под каждую задачу из борды заводится своя ветка, ей дается название в соответсвтие с названием таска

## Коммиты делаются таким образом

Сначала указывается область в которой произошли изменеия, затем указывается что именно произошло в коммите