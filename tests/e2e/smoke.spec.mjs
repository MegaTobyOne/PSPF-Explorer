import { test, expect } from '@playwright/test';

test.describe('PSPF Explorer - index.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('PSPF Explorer 2026');
  });

  test('does not show the out-of-support site notice', async ({ page }) => {
    const notice = page.locator('.site-notice');
    await expect(notice).toHaveCount(0);
  });

  test('welcome modal contains 2026 branding', async ({ page }) => {
    const modalTitle = page.locator('#welcomeModalTitle');
    await expect(modalTitle).toContainText('2026');
  });

  test('footer contains 2026 reference', async ({ page }) => {
    const footer = page.locator('.footer-meta');
    await expect(footer).toContainText('2026');
  });

  test('domain cards are rendered', async ({ page }) => {
    // Close welcome modal first if it is open
    const closeBtn = page.locator('#closeWelcome');
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    }
    const grid = page.locator('#domainsGrid');
    await expect(grid).toBeVisible();
    const cards = grid.locator('.domain-card');
    await expect(cards).toHaveCount(6);
  });
});

test.describe('PSPF Explorer - pspf-explorer.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pspf-explorer.html');
  });

  test('has correct 2026 title', async ({ page }) => {
    await expect(page).toHaveTitle('PSPF Explorer 2026');
  });

  test('does not show a site notice banner', async ({ page }) => {
    const notice = page.locator('.site-notice');
    await expect(notice).toHaveCount(0);
  });
});
