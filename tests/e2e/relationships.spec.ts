import { test, expect } from './fixtures';

test('user can record and remove a requirement-risk relationship', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();

  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Directions$/ })
    .click();
  const directions = page.locator('pspf-directions-view');
  await directions.getByLabel('Reference').fill('DIR-001');
  await directions.getByLabel('Title').fill('Interim uplift direction');
  await directions.getByLabel('Issued').fill('2026-01-01');
  await directions.getByRole('button', { name: 'Add direction' }).click();
  const directionId = await directions.locator('li.direction').first().getAttribute('data-id');
  expect(directionId).toBeTruthy();

  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Relationships$/ })
    .click();
  const view = page.locator('pspf-relationships-view');
  await expect(view.locator('[data-testid="empty"]')).toBeVisible();

  await view.locator('form.create').getByLabel('Kind').selectOption('requirement-direction');
  await view.getByRole('combobox', { name: 'Requirement' }).selectOption('GOV-001');
  await view.getByRole('combobox', { name: 'Direction' }).selectOption(directionId ?? '');
  await view.getByRole('button', { name: 'Add link' }).click();

  const row = view.locator('tbody tr').first();
  await expect(row).toContainText('Requirement ↔ Direction');
  await expect(row).toContainText('GOV-001');
  await expect(row).toContainText('DIR-001');

  // Survives reload
  await page.reload();
  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Relationships$/ })
    .click();
  await expect(page.locator('pspf-relationships-view tbody tr').first()).toContainText('GOV-001');

  // Delete
  page.once('dialog', (d) => void d.accept());
  await page
    .locator('pspf-relationships-view tbody tr')
    .first()
    .getByRole('button', { name: /Delete/ })
    .click();
  await expect(page.locator('pspf-relationships-view [data-testid="empty"]')).toBeVisible();
});
