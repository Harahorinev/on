import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = '123456';

test.describe('Мой календарь', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Пароль').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/companies/);
  });

  test('страница календаря открывается, видна сетка недели', async ({ page }) => {
    await page.getByRole('link', { name: 'Мой календарь' }).click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole('heading', { name: 'Мой календарь' })).toBeVisible();
    await expect(page.getByText(/Неделя:/)).toBeVisible();
    const dayCards = page.locator('.card-calendar-day');
    await expect(dayCards).toHaveCount(7);
  });

  test('кнопка «Добавить событие» открывает форму', async ({ page }) => {
    await page.getByRole('link', { name: 'Мой календарь' }).click();
    await expect(page.getByRole('heading', { name: 'Мой календарь' })).toBeVisible();
    await page.getByRole('button', { name: 'Добавить событие' }).click();
    await expect(page.getByRole('heading', { name: 'Новое событие' })).toBeVisible();
    await expect(page.getByLabel('Название')).toBeVisible();
  });
});
