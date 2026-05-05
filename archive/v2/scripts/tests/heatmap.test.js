import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { PSPFExplorer } from '../main.js';

test('domain requirement heatmap renders tiles for every requirement', () => {
  const dom = new JSDOM(`<!DOCTYPE html><body>
    <div id="domainSummaryGrid"></div>
    <div id="domainsGrid"></div>
    <div id="domainRequirementsGrid"></div>
  </body></html>`, { url: 'http://localhost' });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
  globalThis.performance = dom.window.performance;

  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.domains = [
    { id: 'governance', title: 'Governance', requirements: ['GOV-001', 'GOV-002'] },
    { id: 'risk', title: 'Risk Management', requirements: ['RISK-001'] }
  ];
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', domainId: 'governance', title: 'Governance oversight', description: '' },
    'GOV-002': { id: 'GOV-002', domainId: 'governance', title: 'Leadership accountability', description: '' },
    'RISK-001': { id: 'RISK-001', domainId: 'risk', title: 'Risk appetite', description: '' }
  };
  explorer.compliance = {
    'GOV-001': { status: 'yes' },
    'GOV-002': { status: 'no' },
    'RISK-001': { status: 'partial' }
  };

  explorer.renderDomainRequirementHeatmap();

  const cards = dom.window.document.querySelectorAll('.domain-requirements-card');
  assert.strictEqual(cards.length, explorer.domains.length);

  const governanceChips = cards[0].querySelectorAll('.requirement-chip');
  assert.strictEqual(governanceChips.length, explorer.domains[0].requirements.length);
  assert.ok(governanceChips[0].classList.contains('yes'));
  assert.ok(governanceChips[1].classList.contains('no'));

  const riskChip = cards[1].querySelector('.requirement-chip');
  assert.ok(riskChip.classList.contains('partial'));
});
