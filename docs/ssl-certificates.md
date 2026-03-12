# M68: Сертификаты на сервере (HTTPS)

Чтобы в браузере не показывало «Не защищено», сайт должен открываться по HTTPS. Ниже — пошаговая настройка бесплатных сертификатов Let's Encrypt и Nginx.

## Важно: нужен домен

Let's Encrypt выдаёт сертификаты только для **доменных имён**, не для IP. Нужно:

1. Завести домен (например, через регистратора или бесплатный сервис).
2. Настроить у домена **A-запись** на IP вашего сервера (например, `46.29.162.75`).
3. Подождать распространения DNS (от нескольких минут до часов).

Проверка с вашего компьютера:
```bash
ping yourdomain.com
# Должен отвечать IP вашего сервера
```

Без домена бесплатный доверенный HTTPS недоступен. Для теста по IP можно использовать только самоподписанный сертификат (браузер будет показывать предупреждение).

---

## 1. Установка Certbot (Ubuntu/Debian)

На сервере:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

`python3-certbot-nginx` — плагин для автоматической настройки Nginx (директивы SSL и путь к сертификатам).

---

## 2. Получение сертификата и настройка Nginx

Подставьте свой домен вместо `yourdomain.com`.

### Вариант A: Certbot сам правит конфиг Nginx

Certbot добавит в ваш `server` блок директивы SSL и путь к сертификатам:

```bash
sudo certbot --nginx -d yourdomain.com
```

Ответьте на вопросы (email для уведомлений, согласие с условиями). Certbot:

- получит сертификат;
- изменит конфиг Nginx (listen 443 ssl, ssl_certificate, ssl_certificate_key);
- при необходимости настроит редирект с HTTP на HTTPS.

Проверка и перезагрузка Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Вариант B: Ручной конфиг Nginx

Если хотите сами прописать SSL, сначала получите сертификат:

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

На время выдачи сертификата порт 80 должен быть свободен (временно остановите Nginx: `sudo systemctl stop nginx`, после certbot — `sudo systemctl start nginx`).

Сертификаты появятся в:
- `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

Пример блока Nginx с HTTPS и редиректом с HTTP:

```nginx
# Редирект HTTP → HTTPS
server {
    listen 80 default_server;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl default_server;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key  /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    root /var/www/on/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Замените `yourdomain.com` и путь `root` на свои. Затем:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. Фронт должен ходить по HTTPS

На сервере в `frontend/.env` укажите API по HTTPS:

```bash
VITE_API_URL=https://yourdomain.com/api
```

Пересоберите фронт:

```bash
cd /var/www/on/frontend && npm run build
```

Иначе запросы к API могут уходить по `http://`, и в смешанном контенте браузер будет блокировать или помечать страницу как небезопасную.

---

## 4. Продление сертификата

Сертификаты Let's Encrypt действуют 90 дней. Certbot при установке обычно добавляет задачу в cron или systemd timer.

Проверить продление вручную:

```bash
sudo certbot renew --dry-run
```

Если команда проходит без ошибок, автообновление настроено. После реального обновления (`sudo certbot renew`) достаточно перезагрузить Nginx:

```bash
sudo systemctl reload nginx
```

---

## 5. Проверка

- В браузере откройте `https://yourdomain.com` — должна открыться SPA, соединение «Защищено».
- Логин и запросы к API идут на `https://yourdomain.com/api/...`, без предупреждений о небезопасном соединении.

---

## Если домена нет (только IP)

Для доступа по IP доверенный сертификат (без предупреждения в браузере) получить нельзя. Варианты:

1. **Взять домен** (в т.ч. бесплатный, например noip.com, duckdns.org) и настроить A-запись на IP — затем выполнить шаги выше.
2. **Самоподписанный сертификат** — для внутреннего/тестового доступа. Браузер будет показывать предупреждение, его нужно принять вручную. Генерация и пример для Nginx:
   ```bash
   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /etc/ssl/private/on-selfsigned.key \
     -out /etc/ssl/certs/on-selfsigned.crt \
     -subj "/CN=46.29.162.75"
   ```
   В конфиге Nginx указать `ssl_certificate` и `ssl_certificate_key` на эти файлы.
