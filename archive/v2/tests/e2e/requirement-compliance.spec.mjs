import { test, expect } from '@playwright/test';

test.describe('Requirement compliance workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.goto('/pspf-explorer.html');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
  });

  test('mark a requirement as met and verify progress', async ({ page }) => {
    const complianceRate = page.locator('#complianceRate');
    const initialCompliance = await complianceRate.textContent();

    await page.locator('[data-action="view-domain"]').first().click();
    const firstRequirement = page.locator('.requirement-item').first();
    await firstRequirement.waitFor({ state: 'visible' });
    await firstRequirement.click();

    const statusPicker = page.locator('.compliance-status-buttons');
    await expect(statusPicker).toBeVisible();
    const yesButton = statusPicker.locator('.compliance-status-button.status-yes');
    await yesButton.click();
    const activeButton = statusPicker.locator('.compliance-status-button.active');
    await expect(activeButton).toHaveCount(1);
    await expect(activeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(activeButton).toHaveClass(/status-yes/);

    await page.locator('#progressBtn').click();
    const overallCompliance = page.locator('#overallCompliance');
    await expect(overallCompliance).not.toHaveText(initialCompliance || '0%');

    const compliancePercent = page.locator('#compliancePercent');
    await expect(compliancePercent).not.toHaveText('0%');
    await expect(compliancePercent).toContainText('%');
  });
});
