import { test, expect } from '@playwright/test';

test('relationship map renders nodes from a direction linked to a requirement', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();

  // Empty state first
  await page.locator('pspf-app').getByRole('link', { name: /^Map$/ }).click();
  await expect(page.locator('pspf-relationship-map-view [data-testid="empty"]')).toBeVisible();

  // Seed a direction linked to GOV-001
  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Directions$/ })
    .click();
  const dirs = page.locator('pspf-directions-view');
  await dirs.getByLabel('Reference').fill('PSPF Direction 099-2025');
  await dirs.getByLabel('Title').fill('Map test direction');
  await dirs.getByLabel('Issued').fill('2025-04-01');
  await dirs.getByLabel(/Linked requirement IDs/i).fill('GOV-001');
  await dirs.getByRole('button', { name: 'Add direction' }).click();

  // Visit the map
  await page.locator('pspf-app').getByRole('link', { name: /^Map$/ }).click();
  const view = page.locator('pspf-relationship-map-view');
  await expect(view.getByTestId('counts')).toContainText('2 nodes');
  await expect(view.getByTestId('counts')).toContainText('1 edges');
  await expect(view.locator('[data-testid="adjacency"] tr')).toHaveCount(1);
  await expect(view.locator('[data-testid="adjacency"]')).toContainText('GOV-001');
});
