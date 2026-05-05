import { test } from 'node:test';
import assert from 'node:assert';
import { PSPFExplorer } from '../main.js';

function makeExplorer() {
  if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
  }
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.domains = [
    { id: 'governance', title: 'Governance', requirements: ['GOV-001', 'GOV-002'] },
    { id: 'risk', title: 'Risk', requirements: ['RISK-001'] }
  ];
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Req 1', domainId: 'governance' },
    'GOV-002': { id: 'GOV-002', title: 'Req 2', domainId: 'governance' },
    'RISK-001': { id: 'RISK-001', title: 'Req 3', domainId: 'risk' }
  };
  explorer.compliance = {};
  return explorer;
}

test('computeTrendWatchData flags stuck items with old/no timestamps', () => {
  const explorer = makeExplorer();
  const now = new Date('2026-01-17T00:00:00.000Z');

  // GOV-001: Not Met, last changed 60 days ago => stuck for 30d window
  explorer.compliance['GOV-001'] = {
    status: 'no',
    history: [{ status: 'no', timestamp: '2025-11-18T00:00:00.000Z', domainId: 'governance' }]
  };

  // GOV-002: Risk Managed, no history => treated as stuck
  explorer.compliance['GOV-002'] = { status: 'partial' };

  const data = explorer.computeTrendWatchData({ domainId: 'governance', days: 30, now });
  const stuckIds = data.stuck.map(x => x.reqId).sort();
  assert.deepStrictEqual(stuckIds, ['GOV-001', 'GOV-002']);
});

test('computeTrendWatchData detects regressions and improvements within window', () => {
  const explorer = makeExplorer();
  const now = new Date('2026-01-17T00:00:00.000Z');

  // Regression: yes -> no within 14 days
  explorer.compliance['GOV-001'] = {
    status: 'no',
    history: [
      { status: 'yes', timestamp: '2026-01-10T00:00:00.000Z', domainId: 'governance' },
      { status: 'no', timestamp: '2026-01-16T00:00:00.000Z', domainId: 'governance' }
    ]
  };

  // Improvement: no -> partial within 14 days (still in watch list because partial)
  explorer.compliance['GOV-002'] = {
    status: 'partial',
    history: [
      { status: 'no', timestamp: '2026-01-12T00:00:00.000Z', domainId: 'governance' },
      { status: 'partial', timestamp: '2026-01-16T12:00:00.000Z', domainId: 'governance' }
    ]
  };

  const data = explorer.computeTrendWatchData({ domainId: 'governance', days: 14, now });

  assert.deepStrictEqual(data.regressing.map(x => x.reqId), ['GOV-001']);
  assert.deepStrictEqual(data.improving.map(x => x.reqId), ['GOV-002']);
});
