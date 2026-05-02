import { test, expect } from '@playwright/test';

const BASE_URL = '/pspf-explorer.html';

test.describe('Navigation flow across views', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
  });

  test('cycles through each main navigation tab and exercises search', async ({ page }) => {
    await page.click('#searchBtn');
    await expect(page.locator('#searchView')).toHaveClass(/active/);
    await page.fill('#searchInput', 'compliance');
    await expect(page.locator('#searchInput')).toHaveValue('compliance');

    await page.click('#progressBtn');
    await expect(page.locator('#progressView')).toHaveClass(/active/);
    await expect(page.locator('#statsOverview')).toBeVisible();

    await page.click('#projectBtn');
    await expect(page.locator('#projectView')).toHaveClass(/active/);
    await expect(page.locator('#projectsList')).toBeVisible();

    await page.click('#dataBtn');
    await expect(page.locator('#dataView')).toHaveClass(/active/);
    await expect(page.locator('#dataProjectCount')).toHaveText('0');

    await page.click('#helpBtn');
    await expect(page.locator('#helpView')).toHaveClass(/active/);
    await expect(page.locator('#helpView h2')).toContainText('Help & Support');

    await page.click('#homeBtn');
    await expect(page.locator('#homeView')).toHaveClass(/active/);
    await expect(page.locator('#welcomeDashboard')).toBeVisible();
  });
});
