import { test, expect } from '@playwright/test';

const BASE_URL = '/index.html';

test.describe('Welcome skip preference on index page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('pspf_welcome_seen');
      localStorage.removeItem('pspf_welcome_skip');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#welcomeModal')).toBeVisible();
  });

  test('checked skip hides modal on future visits', async ({ page }) => {
    const modal = page.locator('#welcomeModal');
    const closeBtn = page.locator('#closeWelcome');
    const skipCheckbox = page.locator('#welcomeSkip');

    await expect(skipCheckbox).toBeChecked();
    await closeBtn.click();
    await expect(modal).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(modal).toBeHidden();
  });

  test('unchecked skip allows modal to appear again', async ({ page }) => {
    const modal = page.locator('#welcomeModal');
    const closeBtn = page.locator('#closeWelcome');
    const skipCheckbox = page.locator('#welcomeSkip');

    await skipCheckbox.uncheck();
    await closeBtn.click();
    await expect(modal).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(modal).toBeVisible();
  });
});
