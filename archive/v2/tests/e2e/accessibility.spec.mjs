import { test, expect } from '@playwright/test';

const BASE_URL = '/pspf-explorer.html';

test.describe('Accessibility checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
  });

  test('navigation buttons have aria-current="page" on the active view', async ({ page }) => {
    // Home is the default active view
    await expect(page.locator('#homeBtn')).toHaveAttribute('aria-current', 'page');

    await page.click('#searchBtn');
    await expect(page.locator('#searchBtn')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#homeBtn')).not.toHaveAttribute('aria-current', 'page');

    await page.click('#progressBtn');
    await expect(page.locator('#progressBtn')).toHaveAttribute('aria-current', 'page');
  });

  test('main navigation landmark has an accessible label', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test('all modals have role="dialog" and aria-modal="true"', async ({ page }) => {
    const modalIds = [
      'projectModal',
      'riskModal',
      'incidentModal',
      'importReviewModal',
      'directionModal',
      'actionModal',
    ];
    for (const id of modalIds) {
      const modal = page.locator(`#${id}`);
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      await expect(modal).toHaveAttribute('aria-labelledby');
    }
  });

  test('compliance status buttons have aria-pressed attribute', async ({ page }) => {
    await page.locator('[data-action="view-domain"]').first().click();
    await page.locator('.requirement-item').first().waitFor({ state: 'visible' });
    await page.locator('.requirement-item').first().click();

    const buttons = page.locator('.compliance-status-buttons .compliance-status-button');
    await expect(buttons.first()).toBeVisible();
    const count = await buttons.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const pressed = await btn.getAttribute('aria-pressed');
      expect(['true', 'false']).toContain(pressed);
    }
  });

  test('compliance status updates aria-pressed when clicked', async ({ page }) => {
    await page.locator('[data-action="view-domain"]').first().click();
    await page.locator('.requirement-item').first().waitFor({ state: 'visible' });
    await page.locator('.requirement-item').first().click();

    const metBtn = page.locator('.compliance-status-button.status-yes');
    await expect(metBtn).toBeVisible();
    await metBtn.click();
    await expect(metBtn).toHaveAttribute('aria-pressed', 'true');

    const notMetBtn = page.locator('.compliance-status-button.status-no');
    await notMetBtn.click();
    await expect(notMetBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(metBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
