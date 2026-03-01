# Тесты фронтенда

**Unit-тесты (Vitest):** из папки `frontend`: `npm run test` (или `npm run test:watch` для режима наблюдения).

---

# E2E-тесты (Playwright)

Перед запуском **запусти бэкенд** (иначе вход и календарь не сработают):

```bash
# В отдельном терминале
cd ../backend && npm run dev
```

Запуск тестов (из папки `frontend`):

```bash
npm run test:e2e
```

Playwright сам поднимет фронт на http://localhost:5173, если он ещё не запущен. Тесты используют пользователя `test@example.com` / пароль `123456` (из seed).

- Открыть отчёт после прогона: `npx playwright show-report`
- Запуск в видимом браузере: `npx playwright test --headed`
