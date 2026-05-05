import { test, expect } from '@playwright/test';

test('user can record and remove a requirement-risk relationship', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();

  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Relationships$/ })
    .click();
  const view = page.locator('pspf-relationships-view');
  await expect(view.locator('[data-testid="empty"]')).toBeVisible();

  await view.getByLabel('Requirement ID', { exact: false }).fill('GOV-1');
  await view.getByLabel('Risk ID').fill('R-001');
  await view.getByRole('button', { name: 'Add link' }).click();

  const row = view.locator('tbody tr').first();
  await expect(row).toContainText('Requirement ↔ Risk');
  await expect(row).toContainText('GOV-1');
  await expect(row).toContainText('R-001');

  // Survives reload
  await page.reload();
  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Relationships$/ })
    .click();
  await expect(page.locator('pspf-relationships-view tbody tr').first()).toContainText('GOV-1');

  // Delete
  page.once('dialog', (d) => void d.accept());
  await page
    .locator('pspf-relationships-view tbody tr')
    .first()
    .getByRole('button', { name: /Delete/ })
    .click();
  await expect(page.locator('pspf-relationships-view [data-testid="empty"]')).toBeVisible();
});
