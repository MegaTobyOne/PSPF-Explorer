import { test, expect } from '@playwright/test';

test('user can set compliance state and add evidence', async ({ page }) => {
  // Use a fresh origin per test run by clearing IDB before navigation.
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();

  // Open a requirement.
  await page
    .locator('pspf-app')
    .getByRole('link', { name: /Governance/ })
    .first()
    .click();
  await page.locator('pspf-domain-view').getByRole('link').first().click();
  const reqView = page.locator('pspf-requirement-view');
  await expect(reqView).toBeVisible();

  const editor = reqView.locator('pspf-compliance-editor');
  await expect(editor.getByRole('heading', { name: 'Update compliance' })).toBeVisible();

  // Pick "Compliant".
  await editor.getByRole('radio', { name: 'Compliant', exact: true }).check();

  // Header badge should now read "Compliant".
  await expect(reqView.locator('header pspf-compliance-badge')).toContainText('Compliant');

  // Domain summary line should reflect the change after going back.
  await page.goBack();
  await expect(page.locator('pspf-domain-view')).toContainText('1 compliant');

  // Add an evidence URL.
  await page.locator('pspf-domain-view').getByRole('link').first().click();
  await editor.getByLabel('Evidence value').fill('https://example.gov.au/policy');
  await editor.getByRole('button', { name: 'Add' }).click();
  await expect(editor.locator('ul li')).toContainText('https://example.gov.au/policy');
});
