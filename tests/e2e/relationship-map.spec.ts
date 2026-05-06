import { test, expect } from './fixtures';

test('relationship map renders nodes from a direction linked to a requirement', async ({
  page,
}) => {
  await page.goto('./');
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

test('relationship map shows work connected to compliance gaps', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          (window as Window & { __copiedMapSummary?: string }).__copiedMapSummary = text;
          return Promise.resolve();
        },
      },
      configurable: true,
    });
  });
  await page.goto('./');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();

  await page.evaluate(async () => {
    const request = indexedDB.open('pspf-explorer.v3');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onerror = () => reject(request.error ?? new Error('Failed to open PSPF database'));
      request.onsuccess = () => resolve(request.result);
    });
    const now = new Date('2026-05-07T00:00:00.000Z').toISOString();
    const tx = db.transaction(
      ['compliance', 'workTracking', 'risks', 'actions', 'directions'],
      'readwrite',
    );
    tx.objectStore('compliance').put({
      requirementId: 'GOV-001',
      state: 'no',
      evidence: [{ kind: 'note', value: 'Gap accepted for uplift plan', addedAt: now }],
      createdAt: now,
      updatedAt: now,
    });
    tx.objectStore('compliance').put({
      requirementId: 'GOV-002',
      state: 'no',
      evidence: [],
      createdAt: now,
      updatedAt: now,
    });
    tx.objectStore('workTracking').put({
      id: 'work-map-1',
      requirementId: 'GOV-001',
      note: 'Started remediation planning',
      effort: '2h',
      createdAt: now,
      updatedAt: now,
    });
    tx.objectStore('risks').put({
      id: 'risk-map-1',
      title: 'Control gap remains untreated',
      likelihood: 4,
      impact: 4,
      status: 'open',
      requirementIds: ['GOV-001'],
      actionIds: ['action-map-1'],
      createdAt: now,
      updatedAt: now,
    });
    tx.objectStore('actions').put({
      id: 'action-map-1',
      title: 'Implement uplift plan',
      type: 'remediation',
      status: 'blocked',
      dueAt: '2026-01-01',
      requirementIds: ['GOV-001'],
      riskIds: ['risk-map-1'],
      createdAt: now,
      updatedAt: now,
    });
    tx.objectStore('directions').put({
      id: 'direction-map-1',
      reference: 'PSPF Direction 123-2026',
      title: 'Report treatment progress',
      issuedAt: '2026-05-01',
      requirementIds: ['GOV-001'],
      responseState: 'not-set',
      evidence: [],
      createdAt: now,
      updatedAt: now,
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to seed map test data'));
      tx.onabort = () => reject(tx.error ?? new Error('Map test data transaction aborted'));
    });
    db.close();
  });
  await page.reload();

  await page.locator('pspf-app').getByRole('link', { name: /^Map$/ }).click();
  const view = page.locator('pspf-relationship-map-view');
  await expect(view.getByTestId('counts')).toContainText('5 nodes');
  await expect(view.getByText('Gaps with work')).toBeVisible();
  await expect(view.locator('.metric').filter({ hasText: 'Gaps with work' })).toContainText('1');
  await expect(view.locator('.metric').filter({ hasText: 'Gaps without work' })).toContainText('1');
  await expect(
    view.locator('.metric').filter({ hasText: 'Blocked/overdue actions' }),
  ).toContainText('1');
  await expect(
    view.locator('.metric').filter({ hasText: 'Directions needing response' }),
  ).toContainText('1');

  await expect(view.getByTestId('map-inspector')).toContainText('GOV-001');
  await expect(view.getByTestId('map-inspector')).toContainText('Not yet implemented');
  await expect(view.getByTestId('map-inspector')).toContainText('1 open / 1 total');
  await expect(view.getByTestId('map-inspector')).toContainText('1 active / 1 total');
  await expect(view.getByTestId('map-inspector')).toContainText('1 entries');
  await expect(view.getByTestId('map-inspector')).toContainText('1 items');

  const adjacency = view.locator('[data-testid="adjacency"]');
  await expect(adjacency).toContainText('Risk affects requirement');
  await expect(adjacency).toContainText('Action remediates requirement');
  await expect(adjacency).toContainText('Action treats risk');
  await expect(adjacency).toContainText('Direction modifies requirement');

  await expect(view.getByTestId('map-legend')).toContainText('Risk affects requirement');
  await expect(view.getByTestId('map-legend')).toContainText('Direction modifies requirement');

  await view.getByTestId('copy-map-summary').click();
  await expect(view.getByRole('status')).toContainText('Copied map summary.');
  const copied = await page.evaluate(
    () => (window as Window & { __copiedMapSummary?: string }).__copiedMapSummary,
  );
  expect(copied).toContain('Relationship map summary');
  expect(copied).toContain('GOV-001:');
  expect(copied).toContain('Control gap remains untreated');

  await view.getByTestId('unlinked-gaps-only').check();
  await expect(view.getByTestId('counts')).toContainText('1 nodes');
  await expect(view.getByTestId('counts')).toContainText('0 edges');
  await expect(view.getByTestId('map-inspector')).toContainText('GOV-002');
});
