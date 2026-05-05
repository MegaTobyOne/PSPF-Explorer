import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/risks',
  '/actions',
  '/tags',
  '/views',
  '/posture',
  '/analytics',
  '/directions',
  '/backup',
  '/restore',
  '/help',
];

for (const route of ROUTES) {
  test(`axe: ${route} has no detectable WCAG 2.1 A/AA violations`, async ({ page }) => {
    await page.goto(`/#${route}`);
    // Wait until the app shell has rendered an outlet child for this route
    await page.locator('pspf-app').waitFor();
    // Give the lazy-loaded view a tick to mount
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    if (results.violations.length > 0) {
      // Pretty-print to make the failure actionable
      console.log(
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
          })),
          null,
          2,
        ),
      );
    }
    expect(results.violations).toEqual([]);
  });
}
