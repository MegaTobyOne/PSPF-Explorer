import { test, expect } from '@playwright/test';

const BASE_URL = '/pspf-explorer.html';

test.describe('UI alignment & layout checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pspf_welcome_seen', 'true');
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.locator('#domainsGrid .domain-card').first().waitFor({ state: 'visible' });
  });

  test('domain grid uses a consistent 6-column layout', async ({ page }) => {
    const grid = page.locator('#domainsGrid');
    await expect(grid).toHaveCSS('display', 'grid');
    const templateColumns = await grid.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    const columns = templateColumns.trim().split(/\s+/);
    expect(columns).toHaveLength(6);
    const firstCard = page.locator('#domainsGrid .domain-card').first();
    await expect(firstCard).toBeVisible();
    const gridWidth = await grid.evaluate((el) => el.clientWidth);
    const cardWidth = await firstCard.evaluate((el) => el.getBoundingClientRect().width);
    expect(cardWidth).toBeGreaterThan(0);
    expect(cardWidth).toBeLessThan(gridWidth);
  });

  test('requirement detail sections stack vertically in the expected order', async ({ page }) => {
    await page.locator('[data-action="view-domain"]').first().click();
    const firstRequirement = page.locator('.requirement-item').first();
    await firstRequirement.waitFor({ state: 'visible' });
    await firstRequirement.click();

    const positions = await page.evaluate(() => {
      const getTop = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.getBoundingClientRect().top : null;
      };
      return {
        statusPicker: getTop('.compliance-status-picker'),
        history: getTop('.requirement-history'),
        linkedProjects: getTop('.linked-projects-section'),
        tags: getTop('.tag-manager')
      };
    });

    expect(positions.statusPicker).not.toBeNull();
    expect(positions.history).not.toBeNull();
    expect(positions.linkedProjects).not.toBeNull();
    expect(positions.tags).not.toBeNull();

    expect(positions.statusPicker).toBeLessThan(positions.history);
    expect(positions.history).toBeLessThan(positions.linkedProjects);
    expect(positions.linkedProjects).toBeLessThan(positions.tags);

    const statusButtons = page.locator('.compliance-status-buttons');
    await expect(statusButtons).toHaveCSS('display', 'flex');
    await expect(statusButtons.locator('.compliance-status-button')).toHaveCount(5);
  });

  test('primary container keeps content centered with consistent gutters', async ({ page }) => {
    const container = page.locator('main .container');
    await expect(container).toBeVisible();
    const measurements = await container.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      return {
        paddingLeft: parseFloat(computed.paddingLeft),
        paddingRight: parseFloat(computed.paddingRight),
        maxWidth: computed.maxWidth,
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth
      };
    });

    expect(measurements.maxWidth).toBe('1440px');
    expect(measurements.paddingLeft).toBeCloseTo(24, 1);
    expect(measurements.paddingRight).toBeCloseTo(24, 1);
    const leftGap = measurements.left;
    const rightGap = measurements.viewportWidth - measurements.right;
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);
  });

  test('requirements layout preserves list/splitter/details rhythm and spacing scale', async ({ page }) => {
    await page.locator('[data-action="view-domain"]').first().click();
    await page.locator('#requirementsSection').waitFor({ state: 'visible' });

    const layoutStyles = await page.locator('#requirementsSection .requirements-layout').evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const list = el.querySelector('.requirements-list');
      const details = el.querySelector('.requirement-details');
      return {
        display: computed.display,
        template: computed.gridTemplateColumns.trim(),
        columnGap: computed.columnGap,
        rowGap: computed.rowGap,
        listTop: list?.getBoundingClientRect().top ?? 0,
        detailTop: details?.getBoundingClientRect().top ?? 0
      };
    });

    expect(layoutStyles.display).toBe('grid');
    const columnWidths = layoutStyles.template
      .split(' ')
      .map((value) => parseFloat(value))
      .filter((value) => !Number.isNaN(value));

    expect(columnWidths).toHaveLength(3);
    const [listWidth, splitterWidth, detailsWidth] = columnWidths;
    expect(splitterWidth).toBeCloseTo(10, 0);
    expect(listWidth).toBeGreaterThanOrEqual(280);
    expect(detailsWidth).toBeGreaterThan(listWidth);
    expect(layoutStyles.columnGap).toBe('16px');
    expect(layoutStyles.rowGap).toBe('16px');
    expect(Math.abs(layoutStyles.listTop - layoutStyles.detailTop)).toBeLessThanOrEqual(4);
  });

  test('progress overview stat cards share spacing, padding, and baseline alignment', async ({ page }) => {
    await page.locator('#progressBtn').click();
    await page.locator('#progressView').waitFor({ state: 'visible' });

    const statsGrid = page.locator('#progressView .stats-overview');
    const gridStyles = await statsGrid.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        rowGap: computed.rowGap,
        columnGap: computed.columnGap
      };
    });

    expect(gridStyles.display).toBe('grid');
    expect(gridStyles.rowGap).toBe('24px');
    expect(gridStyles.columnGap).toBe('24px');

    const cardMetrics = await statsGrid.locator('.stat-card').evaluateAll((cards) => cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const styles = window.getComputedStyle(card);
      return {
        paddingTop: parseFloat(styles.paddingTop),
        paddingBottom: parseFloat(styles.paddingBottom),
        borderRadius: styles.borderRadius,
        top: rect.top,
        height: rect.height
      };
    }));

    expect(cardMetrics.length).toBeGreaterThan(1);
    cardMetrics.forEach((metrics) => {
      expect(metrics.paddingTop).toBeCloseTo(24, 1);
      expect(metrics.paddingBottom).toBeCloseTo(24, 1);
      expect(metrics.borderRadius).toBe('16px');
    });

    const firstRowTop = cardMetrics[0].top;
    expect(Math.abs(cardMetrics[1].top - firstRowTop)).toBeLessThanOrEqual(2);
    const heights = cardMetrics.map((metrics) => metrics.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    expect(maxHeight - minHeight).toBeLessThan(5);
  });

  test('data view trends grid keeps responsive columns and consistent gutter', async ({ page }) => {
    await page.locator('#dataBtn').click();
    await page.locator('#dataView').waitFor({ state: 'visible' });

    const gridStyles = await page.locator('#dataView .data-trends').evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const columns = computed.gridTemplateColumns
        .trim()
        .split(/\s+/)
        .map((value) => parseFloat(value))
        .filter((value) => !Number.isNaN(value));
      return {
        display: computed.display,
        gap: computed.gap,
        columns
      };
    });

    expect(gridStyles.display).toBe('grid');
    expect(gridStyles.gap).toBe('16px');
    const activeColumns = gridStyles.columns.filter((value) => value > 0);
    expect(activeColumns.length).toBeGreaterThanOrEqual(2);
    activeColumns.forEach((width) => {
      expect(width).toBeGreaterThanOrEqual(240);
    });
  });

  test('data cards column stays aligned with info panel and keeps breathing room', async ({ page }) => {
    await page.locator('#dataBtn').click();
    await page.locator('#dataView').waitFor({ state: 'visible' });

    const measurements = await page.evaluate(() => {
      const section = document.querySelector('#dataView .data-section');
      const info = document.querySelector('#dataView .data-info');
      const sectionRect = section?.getBoundingClientRect();
      const infoRect = info?.getBoundingClientRect();
      return {
        leftDelta: sectionRect && infoRect ? Math.abs(sectionRect.left - infoRect.left) : null,
        widthDelta: sectionRect && infoRect ? Math.abs(sectionRect.width - infoRect.width) : null,
        verticalGap: sectionRect && infoRect ? infoRect.top - sectionRect.bottom : null
      };
    });

    expect(measurements.leftDelta).not.toBeNull();
    expect(measurements.verticalGap).not.toBeNull();
    expect(measurements.leftDelta).toBeLessThanOrEqual(2);
    expect(measurements.widthDelta).toBeLessThanOrEqual(2);
    expect(measurements.verticalGap).toBeGreaterThanOrEqual(20);
    expect(measurements.verticalGap).toBeLessThanOrEqual(40);
  });

  test('data trend cards reuse the same padding system and rounded corners', async ({ page }) => {
    await page.locator('#dataBtn').click();
    await page.locator('#dataView').waitFor({ state: 'visible' });

    const cardMetrics = await page.locator('#dataView .trend-card').evaluateAll((cards) => cards.map((card) => {
      const styles = window.getComputedStyle(card);
      return {
        paddingTop: parseFloat(styles.paddingTop),
        paddingRight: parseFloat(styles.paddingRight),
        paddingBottom: parseFloat(styles.paddingBottom),
        paddingLeft: parseFloat(styles.paddingLeft),
        borderRadius: parseFloat(styles.borderRadius)
      };
    }));

    expect(cardMetrics.length).toBeGreaterThanOrEqual(2);
    cardMetrics.forEach((metrics) => {
      expect(metrics.paddingTop).toBeCloseTo(16, 0);
      expect(metrics.paddingRight).toBeCloseTo(16, 0);
      expect(metrics.paddingBottom).toBeCloseTo(16, 0);
      expect(metrics.paddingLeft).toBeCloseTo(16, 0);
      expect(metrics.borderRadius).toBeCloseTo(8, 0);
    });
  });

  test('project layout maintains two-column rhythm with consistent spacing', async ({ page }) => {
    await page.locator('#projectBtn').click();
    await page.locator('#projectView').waitFor({ state: 'visible' });

    const layoutStyles = await page.locator('#projectView .projects-layout').evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const columns = computed.gridTemplateColumns
        .trim()
        .split(/\s+/)
        .map((value) => parseFloat(value))
        .filter((value) => !Number.isNaN(value));
      return {
        display: computed.display,
        columnGap: computed.columnGap,
        rowGap: computed.rowGap,
        columns
      };
    });

    expect(layoutStyles.display).toBe('grid');
    expect(layoutStyles.columnGap).toBe('32px');
    expect(layoutStyles.rowGap).toBe('32px');
    expect(layoutStyles.columns).toHaveLength(2);
    const ratio = layoutStyles.columns[0] / layoutStyles.columns[1];
    expect(ratio).toBeCloseTo(0.5, 1);
  });

  test('project panels stay aligned while preserving padding and radius scale', async ({ page }) => {
    await page.locator('#projectBtn').click();
    await page.locator('#projectView').waitFor({ state: 'visible' });

    const panelMetrics = await page.evaluate(() => {
      const list = document.querySelector('#projectView .projects-list-panel');
      const detail = document.querySelector('#projectView .project-details-panel');
      const listRect = list?.getBoundingClientRect();
      const detailRect = detail?.getBoundingClientRect();
      const getStyles = (el) => (el ? window.getComputedStyle(el) : null);
      const listStyles = getStyles(list);
      const detailStyles = getStyles(detail);
      return {
        topDelta: listRect && detailRect ? Math.abs(listRect.top - detailRect.top) : null,
        gap: listRect && detailRect ? detailRect.left - listRect.right : null,
        listPadding: listStyles ? parseFloat(listStyles.paddingTop) : null,
        detailPadding: detailStyles ? parseFloat(detailStyles.paddingTop) : null,
        listRadius: listStyles ? parseFloat(listStyles.borderRadius) : null,
        detailRadius: detailStyles ? parseFloat(detailStyles.borderRadius) : null
      };
    });

    expect(panelMetrics.topDelta).not.toBeNull();
    expect(panelMetrics.gap).not.toBeNull();
    expect(panelMetrics.topDelta).toBeLessThanOrEqual(2);
    expect(panelMetrics.gap).toBeCloseTo(32, 0);
    expect(panelMetrics.listPadding).toBeGreaterThanOrEqual(24);
    expect(panelMetrics.detailPadding).toBeGreaterThanOrEqual(32);
    expect(Math.abs(panelMetrics.detailPadding - panelMetrics.listPadding)).toBeLessThanOrEqual(8);
    expect(panelMetrics.listRadius).toBeCloseTo(12, 0);
    expect(panelMetrics.detailRadius).toBeCloseTo(12, 0);
  });
});
