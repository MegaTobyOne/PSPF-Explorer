import { test, expect } from '@playwright/test';

const BASE_URL = '/pspf-explorer.html';

test.describe('Analytics panel and usage tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
  });

  test('analytics panel is visible in the Help view', async ({ page }) => {
    await page.click('#helpBtn');
    await expect(page.locator('#helpView')).toHaveClass(/active/);
    await expect(page.locator('#analyticsOptIn')).toBeVisible();
    await expect(page.locator('#analyticsPanel')).toBeVisible();
  });

  test('analytics opt-in toggle enables panel and persists across reload', async ({ page }) => {
    await page.click('#helpBtn');
    const toggle = page.locator('#analyticsOptIn');
    await expect(toggle).not.toBeChecked();

    await toggle.check();
    await expect(toggle).toBeChecked();

    // Panel should now show usage tables, not the "off" notice
    await expect(page.locator('#analyticsPanel .analytics-grid')).toBeVisible();
    await expect(page.locator('#analyticsPanel .analytics-off-notice')).toHaveCount(0);

    // Reload and verify opt-in persists
    await page.reload({ waitUntil: 'networkidle' });
    await page.addInitScript(() => {
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.click('#helpBtn');
    await expect(page.locator('#analyticsOptIn')).toBeChecked();
  });

  test('opt-out shows off-notice in analytics panel', async ({ page }) => {
    await page.click('#helpBtn');
    const toggle = page.locator('#analyticsOptIn');

    // Ensure it is unchecked (default)
    if (await toggle.isChecked()) {
      await toggle.uncheck();
    }
    await expect(page.locator('#analyticsPanel .analytics-off-notice')).toBeVisible();
  });

  test('reset counters button is visible when analytics enabled', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pspf_analytics_optin', 'true');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });

    await page.click('#helpBtn');
    await expect(page.locator('button[data-action="reset-analytics"]')).toBeVisible();
    await page.locator('button[data-action="reset-analytics"]').click();
    // After reset, the panel re-renders with zeroes — counts should still be visible
    await expect(page.locator('#analyticsPanel .analytics-grid')).toBeVisible();
  });
});

test.describe('Data export and compliance persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
  });

  test('compliance status persists after page reload', async ({ page }) => {
    await page.locator('[data-action="view-domain"]').first().click();
    await page.locator('.requirement-item').first().waitFor({ state: 'visible' });
    await page.locator('.requirement-item').first().click();

    // Set status to "Met"
    const metBtn = page.locator('.compliance-status-button.status-yes');
    await metBtn.click();
    await expect(metBtn).toHaveAttribute('aria-pressed', 'true');

    // Get the requirement id for later check
    const reqId = await page.locator('.requirement-item').first().getAttribute('data-req');

    // Reload and navigate back
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
    await page.locator('[data-action="view-domain"]').first().click();
    await page.locator('.requirement-item').first().waitFor({ state: 'visible' });
    await page.locator('.requirement-item').first().click();

    // Verify it is still Met
    await expect(page.locator('.compliance-status-button.status-yes')).toHaveAttribute('aria-pressed', 'true');
  });

  test('full export download is triggered from Data view', async ({ page }) => {
    await page.click('#dataBtn');
    await expect(page.locator('#dataView')).toHaveClass(/active/);

    // Wait for download when Export All Data button is clicked
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportDataBtn').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/pspf-explorer-backup.*\.json/);
  });
});
