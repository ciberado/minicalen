import { expect, test } from '@playwright/test';

test('defaults to the two-month view on a smartphone', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('mobile-year-view')).toBeVisible();
  await expect(page.locator('year-grid .month')).toHaveCount(2);
  await expect(page.locator('app-sidebar')).not.toHaveAttribute('open', '');
});

test('navigates month pairs with the prev/next controls', async ({ page }) => {
  await page.goto('/');

  const range = page.locator('mobile-year-view .range');
  const next = page.locator('mobile-year-view button[title="Next months"]');
  const prev = page.locator('mobile-year-view button[title="Previous months"]');

  for (let index = 0; index < 8; index += 1) {
    if (await next.isDisabled()) {
      break;
    }
    await next.click();
  }

  await expect(next).toBeDisabled();
  await expect(range).toContainText('December');

  for (let index = 0; index < 8; index += 1) {
    if (await prev.isDisabled()) {
      break;
    }
    await prev.click();
  }

  await expect(prev).toBeDisabled();
  await expect(range).toContainText('January');
});

test('opens the sidebar drawer and marks a day', async ({ page }) => {
  await page.goto('/');

  await page.locator('.mobile-bar__menu').click();
  await expect(page.locator('app-sidebar')).toHaveAttribute('open', '');

  await page.locator('app-sidebar [title="Select Important"]').click();
  await expect(page.locator('app-sidebar')).not.toHaveAttribute('open', '');

  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
  const day = page.locator(`year-grid [data-date="${dateKey}"]`);

  await day.click();
  await expect(day).toHaveAttribute('style', /f44336/i);
});

test('stacks months in portrait and pairs them in landscape', async ({ page }) => {
  await page.goto('/');

  await page.setViewportSize({ width: 851, height: 393 });
  await expect(page.locator('year-grid .months')).toHaveAttribute('style', /repeat\(2/);

  await page.setViewportSize({ width: 393, height: 851 });
  await expect(page.locator('year-grid .months')).toHaveAttribute('style', /repeat\(1/);
});
