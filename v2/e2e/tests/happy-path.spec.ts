import { expect, test } from '@playwright/test';

test('anonymous calendar marks a date and keeps it after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('year-grid .month')).toHaveCount(12);

  await page.locator('app-sidebar [title="Select Important"]').click();

  const day = page.locator('year-grid [data-date="2026-03-10"]');
  await day.click();
  await expect(day).toHaveAttribute('style', /f44336/i);

  await page.locator('button[title="Save"]').click();
  await expect(page).toHaveURL(/#[0-9a-f-]{36}/);

  await page.reload();
  await expect(page.locator('year-grid [data-date="2026-03-10"]')).toHaveAttribute(
    'style',
    /f44336/i,
  );
});

test('user can sign up and create an owned calendar', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/');
  await page.locator('app-sidebar summary').click();
  await page.getByRole('button', { name: 'Sign in / Sign up' }).click();
  await page.getByRole('button', { name: 'Need an account?' }).click();

  await page.locator('input[placeholder="Name"]').fill('E2E User');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('password-1234');
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('app-sidebar')).toContainText('Save to account');

  await page.locator('button[title="Save"]').click();
  await expect(page).toHaveURL(/#[0-9a-f-]{36}/);

  const menu = page.locator('app-sidebar details');
  const isOpen = await menu.evaluate((element: HTMLDetailsElement) => element.open);

  if (!isOpen) {
    await page.locator('app-sidebar summary').click();
  }

  await page.getByRole('button', { name: 'My Calendars' }).click();
  await expect(page.getByRole('heading', { name: 'My Calendars' })).toBeVisible();
});
