import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { PSPFExplorer } from '../main.js';

function createTestDom() {
  const dom = new JSDOM(`<!DOCTYPE html><body>
    <div id="domainSummaryGrid"></div>
  </body></html>`, { url: 'http://localhost' });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;

  return dom;
}

test('domain summary widget renders cards for every domain', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.domains = [
    { id: 'governance', title: 'Governance', description: 'Leadership controls', requirements: ['GOV-001', 'GOV-002'] },
    { id: 'risk', title: 'Risk', description: 'Risk oversight', requirements: ['RISK-001'] }
  ];
  explorer.compliance = {
    'GOV-001': { status: 'yes' },
    'GOV-002': { status: 'no' },
    'RISK-001': { status: 'partial' }
  };

  explorer.renderDomainSummary();
  const cards = dom.window.document.querySelectorAll('.domain-summary-card');
  assert.strictEqual(cards.length, explorer.domains.length);

  const firstCard = cards[0];
  assert.strictEqual(firstCard.dataset.domainId, 'governance');
  assert.ok(firstCard.textContent.includes('Leadership controls'));
  assert.strictEqual(firstCard.querySelector('.domain-summary-count').textContent, '2 requirements');

  const secondCard = cards[1];
  assert.strictEqual(secondCard.dataset.domainId, 'risk');
  assert.strictEqual(secondCard.querySelector('.domain-summary-desc').textContent, 'Risk oversight');
  const governanceHealth = explorer.calculateDomainHealth('governance');
  const riskHealth = explorer.calculateDomainHealth('risk');
  const firstDot = firstCard.querySelector('.pulse-dot');
  const secondDot = secondCard.querySelector('.pulse-dot');
  assert.ok(firstDot.classList.contains(governanceHealth.status));
  assert.ok(secondDot.classList.contains(riskHealth.status));
});
