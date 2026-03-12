# Nginx на сервере (как на локали: фронт + API)

Чтобы на сервере работало так же, как локально: один домен, фронт отдаёт nginx, все запросы к API проксируются на бэкенд.

## 1. Где что крутится

- **Бэкенд** — Node (Express), например на порту `3001` (или из `backend/.env` `PORT`).
- **Фронт** — собранная папка `frontend/dist/`, отдаётся nginx.

## 2. Пример конфига nginx

**Если приходит 405 на POST `/api/user/events`** — запрос не проксируется на бэкенд: nginx обрабатывает его как статику (`location /`), а для статики POST запрещён. Нужен блок `location /api/` в **том же** `server`, что обрабатывает твой хост (IP или домен).

Подставь свои значения:
- `yourdomain.com` или `_` для приёма по IP (46.29.162.75);
- `/var/www/on/frontend/dist` — полный путь до папки со сборкой фронта;
- `http://127.0.0.1:3001` — порт как в `backend/.env` (PORT).

**Готовый вариант для доступа по IP (46.29.162.75):**

```nginx
server {
    listen 80 default_server;
    server_name _;

    # Сначала API — чтобы POST /api/... проксировался на бэкенд
    # Обязательно слэш в конце proxy_pass: иначе на бэк будет /api/user/events → 404
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Статика фронта (React SPA)
    root /var/www/on/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Путь к папке фронта замени на свой (где лежит `index.html` после `npm run build`). Порт `3001` должен совпадать с `PORT` в `backend/.env`.

**Куда вставить:** в тот файл, который реально обрабатывает запросы по IP. Обычно это:
- `sudo nano /etc/nginx/sites-available/default`
- или свой файл в `sites-available`, потом `sudo ln -s /etc/nginx/sites-available/on /etc/nginx/sites-enabled/on`.

После правок:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

Важно: в `proxy_pass` слэш в конце (`http://127.0.0.1:3001/`) — тогда запрос `POST /api/user/events` уходит на бэкенд как `POST /user/events`, и роуты Express совпадают.

## 3. Фронт должен ходить на /api

При сборке фронта на сервере в `frontend/.env` задай базовый URL API — тот же хост, путь `/api`:

```bash
# На сервере перед сборкой (frontend/.env)
VITE_API_URL=https://yourdomain.com/api
```

Если заходишь по IP:

```bash
VITE_API_URL=http://ТВОЙ_IP/api
```

После изменения `.env` пересобери:

```bash
cd frontend && npm run build
```

## 4. Бэкенд на сервере

- В `backend/.env` укажи `PORT=3001` (или другой, главное чтобы совпадал с портом в nginx `proxy_pass`).
- Запускай бэкенд как обычно (например `node dist/index.js` или через pm2).

## 5. Проверка

- Открыть в браузере `https://yourdomain.com` — должна открыться SPA.
- Логин, календарь, создание события — запросы уходят на `https://yourdomain.com/api/...`, nginx проксирует их на бэкенд, 405 не должно быть.

**HTTPS (сертификаты):** чтобы сайт показывался как «Защищён», настрой SSL по инструкции [SSL-сертификаты на сервере](ssl-certificates.md) (M68). Там описаны Let's Encrypt, Certbot и пример конфига Nginx для 443.

## 6. Отладка 404 при слэше в proxy_pass

1. **Проверить, что прокси и бэкенд живы:** в браузере открой `http://ТВОЙ_IP/api/health`. Должно быть `{"ok":true,"timestamp":"..."}`. Если 404 — nginx не проксирует или бэкенд не слушает порт из `proxy_pass`.

2. **На сервере напрямую к бэкенду:**
   ```bash
   curl -s http://127.0.0.1:3001/health
   ```
   Должен быть JSON с `ok: true`. Если пусто или «Connection refused» — бэкенд не запущен или слушает другой порт (проверь `backend/.env` PORT).

3. **Проверить путь до бэкенда:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/user/events
   ```
   Ожидаемо `401` (нет токена), не `404`. Если 404 — на сервере запущена старая сборка бэкенда без роутов `/user/events`. Нужно заново собрать и перезапустить:
   ```bash
   cd /path/to/on/backend && npm run build && pm2 restart on-backend
   ```
   (или как ты запускаешь бэкенд).

