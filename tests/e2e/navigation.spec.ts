import { test, expect } from '@playwright/test';

test('home view renders all six domains and links to domain pages', async ({ page }) => {
  await page.goto('/');
  const app = page.locator('pspf-app');
  await expect(app).toBeVisible();

  // Wait for store boot + router mount.
  await expect(app.getByRole('heading', { name: 'PSPF domains' })).toBeVisible();

  for (const name of ['Governance', 'Information', 'Personnel', 'Physical', 'Risk', 'Technology']) {
    await expect(app.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
  }

  // Each domain card has a progress meter starting at 0%.
  await expect(app.getByRole('progressbar')).toHaveCount(6);
  for (const bar of await app.getByRole('progressbar').all()) {
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
  }
});

test('navigates to a domain page and back to home', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('pspf-app')
    .getByRole('link', { name: /Governance/ })
    .first()
    .click();

  await expect(page.locator('pspf-domain-view')).toBeVisible();
  await expect(page.locator('pspf-domain-view').getByRole('heading')).toHaveText(/Governance/);

  // First requirement link should navigate to a requirement view.
  await page.locator('pspf-domain-view').getByRole('link').first().click();
  await expect(page.locator('pspf-requirement-view')).toBeVisible();
});

test('unknown route shows the not-found view', async ({ page }) => {
  await page.goto('/#/no-such-route');
  await expect(page.locator('pspf-not-found-view')).toBeVisible();
});
