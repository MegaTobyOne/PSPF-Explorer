import { test, expect } from './fixtures';

test('user can set global posture and per-domain overrides, persisting across reload', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();

  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Posture$/ })
    .click();

  const view = page.locator('pspf-posture-view');
  await expect(view.getByRole('heading', { name: /Posture/ })).toBeVisible();

  const globalPanel = view.locator('section[aria-label="Global posture"]');
  const threatSelect = globalPanel.locator('select').nth(0);
  const postureSelect = globalPanel.locator('select').nth(1);
  await threatSelect.selectOption('high');
  await postureSelect.selectOption('shields-up');
  await expect(globalPanel.locator('span.meta')).not.toContainText('never');

  // Reload and verify persistence
  await page.reload();
  await page
    .locator('pspf-app')
    .getByRole('link', { name: /^Posture$/ })
    .click();
  await expect(globalPanel.locator('span.meta')).not.toContainText('never');
  await expect(threatSelect).toHaveValue('high');
  await expect(postureSelect).toHaveValue('shields-up');

  // Per-domain override on technology
  await view.getByLabel('Threat for technology').selectOption('critical');
  await expect(
    view.locator('tr', { hasText: 'technology' }).locator('span.badge', { hasText: 'critical' }),
  ).toBeVisible();
});
