import { test, expect } from '@playwright/test';

const BASE_URL = '/pspf-explorer.html';

test.describe('Welcome splash formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('pspf_welcome_seen');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#welcomeModal')).toBeVisible();
  });

  test('welcome steps have margin and aligned numbering', async ({ page }) => {
    const steps = page.locator('.welcome-steps');
    const marginTop = await steps.evaluate(el => getComputedStyle(el).marginTop);
    expect(marginTop).not.toBe('0px');

    const step = page.locator('.welcome-steps .step').first();
    const stepStyles = await step.evaluate(el => {
      const computed = getComputedStyle(el);
      return { display: computed.display, alignItems: computed.alignItems };
    });

    expect(stepStyles.display).toBe('flex');
    expect(stepStyles.alignItems).toBe('flex-start');

    const numberBadge = page.locator('.welcome-steps .step-number').first();
    await expect(numberBadge).toBeVisible();
  });

});
