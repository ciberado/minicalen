import { expect, test } from '@playwright/test';

test('anonymous calendar marks a date and keeps it after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('year-grid .month')).toHaveCount(12);

  await page.locator('app-sidebar [title="Select Important"]').click();

  const day = page.locator('year-grid [data-date="2026-03-10"]');
  await day.click();
  await expect(day).toHaveAttribute('style', /e0a097/i);

  await page.locator('button[title="Save"]').click();
  await expect(page).toHaveURL(/#[0-9a-f-]{36}/);

  await page.reload();
  await expect(page.locator('year-grid [data-date="2026-03-10"]')).toHaveAttribute(
    'style',
    /e0a097/i,
  );
});

test('adds, removes and combines two categories on a day', async ({ page }) => {
  await page.goto('/');

  const day = page.locator('year-grid [data-date="2026-04-10"]');
  const select = (title: string) => page.locator(`app-sidebar [title="Select ${title}"]`);

  await select('Important').click();
  await day.click();
  await expect(day).toHaveAttribute('style', /e0a097/i);

  await day.click();
  await expect(day).not.toHaveAttribute('style', /e0a097/i);

  await day.click();
  await select('Work').click();
  await day.click();
  await expect(day).toHaveAttribute('style', /linear-gradient/i);
  await expect(day).toHaveAttribute('style', /e0a097/i);
  await expect(day).toHaveAttribute('style', /9fbed6/i);

  await select('Personal').click();
  await day.click();
  await expect(day).toHaveAttribute('style', /linear-gradient/i);
  await expect(day).not.toHaveAttribute('style', /e0a097/i);
  await expect(day).toHaveAttribute('style', /9fbed6/i);
  await expect(day).toHaveAttribute('style', /a6c4a0/i);
});

test('switches sessions when the hash changes without a full reload', async ({ page }) => {
  await page.goto('/');

  const status = page.locator('app-sidebar .status');

  await page.locator('button[title="Save"]').click();
  await expect(page).toHaveURL(/#[0-9a-f-]{36}/);
  await expect(status).toContainText('connected');

  const sessionId = new URL(page.url()).hash.slice(1);

  await page.evaluate(() => {
    window.location.hash = '';
  });
  await expect(status).toContainText('local');

  await page.evaluate((id) => {
    window.location.hash = id;
  }, sessionId);
  await expect(status).toContainText('connected');
});

test('an anonymous session opened from the magic link syncs on another device', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.locator('app-sidebar [title="Select Important"]').click();
  await page.locator('year-grid [data-date="2026-06-10"]').click();
  await page.locator('button[title="Save"]').click();
  await expect(page).toHaveURL(/#[0-9a-f-]{36}\?k=/);

  const shareUrl = page.url();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(shareUrl);

  await expect(otherPage.locator('app-sidebar .status')).toContainText('connected');
  await expect(otherPage.locator('year-grid [data-date="2026-06-10"]')).toHaveAttribute(
    'style',
    /e0a097/i,
  );

  await otherPage.locator('app-sidebar [title="Select Important"]').click();
  await otherPage.locator('year-grid [data-date="2026-06-11"]').click();
  await expect(page.locator('year-grid [data-date="2026-06-11"]')).toHaveAttribute(
    'style',
    /e0a097/i,
  );

  await other.close();
});

test('prints the year grid on a single page', async ({ page }) => {
  await page.goto('/');

  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' },
  });

  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBe(1);
});

test('does not offer the months view on desktop', async ({ page }) => {
  await page.goto('/');

  const viewSwitch = page.locator('.view-switch');
  await expect(viewSwitch.getByRole('button', { name: 'Grid' })).toBeVisible();
  await expect(viewSwitch.getByRole('button', { name: 'Print' })).toBeVisible();
  await expect(viewSwitch.getByRole('button', { name: 'Months' })).toHaveCount(0);
});

test('scales the year grid down on short viewports instead of overflowing', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 620 });
  await page.goto('/');

  await expect(page.locator('year-grid .months')).toHaveAttribute('style', /scale\(/);

  const overflows = await page.evaluate(() => {
    const main = document.querySelector('app-shell')?.shadowRoot?.querySelector('main');
    return (main?.scrollHeight ?? 0) > (main?.clientHeight ?? 0);
  });

  expect(overflows).toBe(false);
});

test('navigates between years with the subtle year control', async ({ page }) => {
  await page.goto('/');

  const yearLabel = page.locator('.year-nav__label');
  const current = new Date().getFullYear();

  await expect(yearLabel).toHaveText(String(current));

  await page.locator('.year-nav button[title="Next year"]').click();
  await expect(yearLabel).toHaveText(String(current + 1));

  await yearLabel.click();
  await expect(yearLabel).toHaveText(String(current));
});

test('new calendar starts from a clean slate', async ({ page }) => {
  await page.goto('/');

  await page.locator('app-sidebar [title="Select Important"]').click();
  const day = page.locator('year-grid [data-date="2026-07-10"]');
  await day.click();
  await expect(day).toHaveAttribute('style', /e0a097/i);

  await page.locator('app-sidebar [title="New calendar"]').click();
  await expect(day).not.toHaveAttribute('style', /e0a097/i);
});

test('print button triggers the browser print dialog', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __printed?: boolean }).__printed = false;
    window.print = () => {
      (window as unknown as { __printed?: boolean }).__printed = true;
    };
  });

  await page.goto('/');

  const title = await page.locator('.print-title__name').textContent();
  expect(title?.trim().length ?? 0).toBeGreaterThan(0);

  await page.locator('button[title="Print"]').click();

  expect(await page.evaluate(() => (window as unknown as { __printed?: boolean }).__printed)).toBe(
    true,
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
