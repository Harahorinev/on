import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = '123456';

test.describe('Вход', () => {
  test('отображается форма входа', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toBeVisible();
  });

  test('успешный вход под test@example.com ведёт на страницу компаний', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Пароль').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL(/\/companies/);
    await expect(page.getByRole('link', { name: 'Мой календарь' })).toBeVisible();
  });
});
