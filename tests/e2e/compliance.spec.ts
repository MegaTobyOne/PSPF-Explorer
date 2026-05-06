import { test, expect } from './fixtures';

test('user can set compliance state and add evidence', async ({ page }) => {
  // Use a fresh origin per test run by clearing IDB before navigation.
  await page.goto('./');
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

  // Pick "Fully implemented".
  await editor.getByRole('radio', { name: 'Fully implemented', exact: true }).check();

  // Save a note and ensure it persists across status changes.
  await editor.locator('textarea').fill('Initial implementation evidence captured');
  await editor.getByRole('button', { name: 'Save notes' }).click();
  await editor.getByRole('radio', { name: 'Risk-managed', exact: true }).check();
  await expect(editor.locator('textarea')).toHaveValue('Initial implementation evidence captured');

  // Header badge should now reflect the current state.
  await expect(reqView.locator('header pspf-compliance-badge')).toContainText('Risk-managed');

  // History should include the transition from fully implemented to risk-managed.
  await expect(editor).toContainText('Fully implemented → Risk-managed');

  // Domain summary line should reflect the change after going back.
  await page.goBack();
  await expect(page.locator('pspf-domain-view')).toContainText('0 fully implemented');

  // Add an evidence URL.
  await page.locator('pspf-domain-view').getByRole('link').first().click();
  await editor.getByLabel('Evidence value').fill('https://example.gov.au/policy');
  await editor.getByRole('button', { name: 'Add' }).click();
  await expect(editor.locator('ul.evidence li')).toContainText('https://example.gov.au/policy');
});
