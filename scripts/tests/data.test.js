import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { PSPFExplorer } from '../main.js';

function createSandboxDom() {
  const dom = new JSDOM('<!DOCTYPE html><body></body></html>', {
    url: 'http://localhost'
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  const raf = dom.window.requestAnimationFrame
    ? dom.window.requestAnimationFrame.bind(dom.window)
    : (callback) => setTimeout(callback, 0);
  global.requestAnimationFrame = raf;
  global.confirm = () => true;
  global.Blob = class {};
  global.URL = {
    createObjectURL: () => 'blob:test'
  };

  return dom;
}

test('validateImportData reports structural errors and warns on unknown version', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const payload = {
    version: '9.9',
    data: {
      projects: 'not-an-array',
      risks: [{ id: 'r-1', name: 'Risk 1', likelihood: 'insane', impact: 'unknown' }],
      incidents: [],
      compliance: { 'REQ-1': { status: 'yes' } }
    }
  };

  const result = explorer.validateImportData(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('Projects must be an array')));
  assert.ok(result.warnings.some(warning => warning.includes('Unknown version')));
});

test('sanitizeImportData normalizes unsafe strings and IDs', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const dirtyData = {
    projects: [
      {
        id: 'GOV-001<script>',
        name: 'Governance<script>alert(1)</script>',
        description: 'First project with <img src=x onerror=alert(1)>',
        status: 'unsupported',
        requirements: ['REQ-1', 'REQ-2']
      }
    ],
    risks: [
      {
        id: 'risk 1',
        name: 'Risk &gt; 1',
        likelihood: 'very-high',
        impact: 'very-high',
        severity: 'super-critical',
        mitigation: '<script>bad</script>'
      }
    ],
    incidents: [
      {
        id: 'incident-1',
        name: 'Incident <img>',
        description: '<script>bad()</script>',
        severity: 'very-low',
        resolution: '<img src=x onerror=alert(2)>',
        projectId: 'proj<script>'
      }
    ],
    compliance: {
      '<REQ 1>': { status: 'yes', comment: '<img>', url: 'javascript:alert(1)' }
    }
  };

  const sanitized = explorer.sanitizeImportData(dirtyData);
  assert.strictEqual(sanitized.projects[0].id, 'GOV-001script');
  assert.strictEqual(sanitized.projects[0].status, 'planning');
  assert.strictEqual(sanitized.risks[0].severity, 'medium');
  assert.ok(sanitized.risks[0].description !== '<script>bad</script>');
  assert.strictEqual(sanitized.incidents[0].severity, 'low');
  assert.ok(!sanitized.incidents[0].description.includes('<script>'));
  assert.strictEqual(sanitized.incidents[0].projectId, 'projscript');
  assert.strictEqual(Object.keys(sanitized.compliance)[0], 'REQ1');
  assert.strictEqual(sanitized.compliance.REQ1.status, 'yes');
  assert.strictEqual(sanitized.compliance.REQ1.url, 'alert(1)');
});

test('validateImportData enforces v2 optional arrays when present', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const payload = {
    version: '2.0',
    schema: { id: 'pspf-explorer.v2', version: '2.0' },
    data: {
      projects: [],
      risks: [],
      incidents: [],
      compliance: {},
      relationships: 'invalid'
    }
  };

  const result = explorer.validateImportData(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('relationships must be an array')));
});

test('sanitizeImportData maps v2 optional entities to safe defaults', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const sanitized = explorer.sanitizeImportData({
    projects: [],
    risks: [],
    incidents: [],
    compliance: {},
    actions: [{ id: 'a<script>', title: 'Action<script>' }],
    directions: [{ id: 'd<script>', title: 'Direction<script>' }],
    relationships: [{ id: 'l<script>', sourceType: 'requirement', sourceId: 'GOV-001', targetType: 'risk', targetId: 'R-001', relation: 'addresses' }]
  });

  assert.strictEqual(sanitized.actions.length, 1);
  assert.strictEqual(sanitized.actions[0].id, 'ascript');
  assert.strictEqual(sanitized.directions[0].id, 'dscript');
  assert.strictEqual(sanitized.relationships[0].id, 'lscript');
  assert.strictEqual(sanitized.relationships[0].relation, 'addresses');
});

test('validateImportData rejects orphaned, duplicate, and self-referential relationships', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const payload = {
    version: '2.0',
    schema: { id: 'pspf-explorer.v2', version: '2.0' },
    data: {
      projects: [{ id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: [] }],
      risks: [{ id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low' }],
      incidents: [],
      compliance: {},
      relationships: [
        { id: 'L1', sourceType: 'project', sourceId: 'P1', targetType: 'risk', targetId: 'R1', relation: 'addresses' },
        { id: 'L2', sourceType: 'project', sourceId: 'P1', targetType: 'risk', targetId: 'R1', relation: 'addresses' },
        { id: 'L3', sourceType: 'risk', sourceId: 'R1', targetType: 'risk', targetId: 'R1', relation: 'depends' },
        { id: 'L4', sourceType: 'project', sourceId: 'MISSING', targetType: 'risk', targetId: 'R1', relation: 'addresses' }
      ]
    }
  };

  const result = explorer.validateImportData(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('Duplicate relationship detected')));
  assert.ok(result.errors.some(error => error.includes('Self-referential circular relationship')));
  assert.ok(result.errors.some(error => error.includes('orphaned')));
});

test('clearAllData removes stored records when user confirms', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'p-1' }];
  explorer.risks = [{ id: 'r-1' }];
  explorer.incidents = [{ id: 'i-1' }];
  explorer.compliance = { 'REQ-1': { status: 'yes' } };
  explorer.storageAvailable = true;

  localStorage.setItem('pspf_projects', JSON.stringify(explorer.projects));
  localStorage.setItem('pspf_risks', JSON.stringify(explorer.risks));
  localStorage.setItem('pspf_incidents', JSON.stringify(explorer.incidents));
  localStorage.setItem('pspf_compliance', JSON.stringify(explorer.compliance));

  explorer.updateDataStats = () => {};
  explorer.renderHome = () => {};
  explorer.showNotification = () => {};

  explorer.clearAllData();

  assert.deepStrictEqual(explorer.projects, []);
  assert.deepStrictEqual(explorer.risks, []);
  assert.deepStrictEqual(explorer.incidents, []);
  assert.deepStrictEqual(explorer.compliance, {});
  assert.strictEqual(localStorage.getItem('pspf_projects'), null);
  assert.strictEqual(localStorage.getItem('pspf_risks'), null);
  assert.strictEqual(localStorage.getItem('pspf_incidents'), null);
  assert.strictEqual(localStorage.getItem('pspf_compliance'), null);
});

test('record compliance history and domain snapshots when status changes', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.domains = [{ id: 'governance', requirements: ['GOV-001'] }];
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Test', description: 'Desc', domainId: 'governance' }
  };
  explorer.renderDomainsGrid = () => {};
  explorer.updateStats = () => {};

  explorer.updateCompliance('GOV-001', 'yes');
  assert.strictEqual(explorer.compliance['GOV-001'].history.length, 1);
  assert.strictEqual(explorer.progressHistory.governance.length, 1);
  assert.strictEqual(explorer.progressHistory.governance[0].percentage, 100);

  explorer.updateCompliance('GOV-001', 'yes');
  assert.strictEqual(explorer.compliance['GOV-001'].history.length, 1);

  explorer.updateCompliance('GOV-001', 'no');
  assert.strictEqual(explorer.compliance['GOV-001'].history.length, 2);
  assert.strictEqual(explorer.progressHistory.governance.length, 2);
  assert.strictEqual(explorer.progressHistory.governance[1].percentage, 0);
});

test('renderRecentUpdatesList shows latest requirement statuses', () => {
  createSandboxDom();
  const updatesContainer = document.createElement('div');
  updatesContainer.id = 'recentUpdatesList';
  document.body.appendChild(updatesContainer);

  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.domains = [{ id: 'governance', requirements: ['GOV-001'] }];
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Timeline test', description: 'Details', domainId: 'governance' }
  };
  explorer.renderDomainsGrid = () => {};
  explorer.updateStats = () => {};

  explorer.updateCompliance('GOV-001', 'partial');
  explorer.renderRecentUpdatesList();

  const entries = updatesContainer.querySelectorAll('.recent-update');
  assert.strictEqual(entries.length, 1);
  assert.ok(updatesContainer.textContent.includes('GOV-001'));
  assert.ok(updatesContainer.textContent.includes('Risk Managed'));
});

test('runDataModelMigrations derives legacy relationships and stamps model version', () => {
  createSandboxDom();
  localStorage.setItem('pspf_projects', JSON.stringify([
    { id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: ['GOV-001'] }
  ]));
  localStorage.setItem('pspf_risks', JSON.stringify([
    { id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'P1' }
  ]));
  localStorage.setItem('pspf_incidents', JSON.stringify([
    { id: 'I1', name: 'Incident 1', description: '', severity: 'low', projectId: 'P1' }
  ]));
  localStorage.setItem('pspf_relationships', JSON.stringify([]));

  const explorer = new PSPFExplorer({ autoInit: false });

  assert.ok(Array.isArray(explorer.relationships));
  assert.ok(explorer.relationships.length >= 3);
  assert.ok(explorer.relationships.some(link => link.sourceType === 'requirement' && link.targetType === 'project'));
  assert.ok(explorer.relationships.some(link => link.sourceType === 'project' && link.targetType === 'risk'));
  assert.ok(explorer.relationships.some(link => link.sourceType === 'project' && link.targetType === 'incident'));
  assert.strictEqual(localStorage.getItem('pspf_data_model_version'), '2.0');
});

test('runDataModelMigrations is idempotent for derived relationships', () => {
  createSandboxDom();
  localStorage.setItem('pspf_projects', JSON.stringify([
    { id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: ['GOV-001'] }
  ]));
  localStorage.setItem('pspf_risks', JSON.stringify([
    { id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'P1' }
  ]));
  localStorage.setItem('pspf_relationships', JSON.stringify([]));

  const explorer = new PSPFExplorer({ autoInit: false });
  const firstCount = explorer.relationships.length;
  explorer.runDataModelMigrations();
  const secondCount = explorer.relationships.length;
  explorer.runDataModelMigrations();
  const thirdCount = explorer.relationships.length;

  assert.strictEqual(firstCount, secondCount);
  assert.strictEqual(secondCount, thirdCount);
});

test('saveData writes canonical local state envelope', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: [] }];
  explorer.risks = [];
  explorer.incidents = [];
  explorer.compliance = {};

  explorer.saveData();
  const envelope = JSON.parse(localStorage.getItem('pspf_state_v2'));

  assert.strictEqual(envelope.schema.id, 'pspf-explorer.v2');
  assert.strictEqual(envelope.scope.type, 'local-state');
  assert.strictEqual(Array.isArray(envelope.data.projects), true);
  assert.strictEqual(envelope.data.projects.length, 1);
});

test('constructor prefers canonical local state envelope over legacy keys', () => {
  createSandboxDom();
  localStorage.setItem('pspf_projects', JSON.stringify([
    { id: 'LEGACY', name: 'Legacy Project', description: '', status: 'planning', requirements: [] }
  ]));
  localStorage.setItem('pspf_state_v2', JSON.stringify({
    version: '2.0',
    schema: { id: 'pspf-explorer.v2', version: '2.0' },
    scope: { type: 'local-state' },
    data: {
      projects: [{ id: 'ENV', name: 'Envelope Project', description: '', status: 'active', requirements: [] }],
      risks: [],
      incidents: [],
      compliance: {},
      actions: [],
      directions: [],
      relationships: [],
      evidenceRecords: [],
      importBatches: [],
      mergeReviews: []
    }
  }));

  const explorer = new PSPFExplorer({ autoInit: false });
  assert.strictEqual(explorer.projects.length, 1);
  assert.strictEqual(explorer.projects[0].id, 'ENV');
});

test('computeDataIntegrityDiagnostics reports orphan links and relationship errors', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: [] }];
  explorer.risks = [{ id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'MISSING' }];
  explorer.incidents = [{ id: 'I1', name: 'Incident 1', description: '', severity: 'low', projectId: 'MISSING' }];
  explorer.relationships = [
    { id: 'L1', sourceType: 'project', sourceId: 'P1', targetType: 'risk', targetId: 'UNKNOWN', relation: 'addresses' }
  ];
  explorer.actions = [];
  explorer.directions = [];
  explorer.compliance = {};

  const diagnostics = explorer.computeDataIntegrityDiagnostics();
  assert.strictEqual(diagnostics.orphanRiskLinks, 1);
  assert.strictEqual(diagnostics.orphanIncidentLinks, 1);
  assert.ok(diagnostics.relationshipErrors >= 1);
  assert.ok(diagnostics.totalIssues >= 3);
});

test('renderDataIntegrityDiagnostics updates panel state', () => {
  createSandboxDom();
  const panel = document.createElement('div');
  panel.id = 'dataIntegrityPanel';
  document.body.appendChild(panel);

  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [];
  explorer.risks = [];
  explorer.incidents = [];
  explorer.relationships = [];
  explorer.actions = [];
  explorer.directions = [];
  explorer.compliance = {};

  explorer.renderDataIntegrityDiagnostics();
  assert.ok(panel.classList.contains('healthy'));

  explorer.risks = [{ id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'MISSING' }];
  explorer.renderDataIntegrityDiagnostics();
  assert.ok(panel.classList.contains('warning'));
  assert.ok(panel.textContent.includes('anomaly'));
});

test('computeIntegrityDiagnosticsForData supports payload preflight checks', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const diagnostics = explorer.computeIntegrityDiagnosticsForData({
    projects: [{ id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: [] }],
    risks: [{ id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'P1' }],
    incidents: [],
    compliance: {},
    actions: [],
    directions: [],
    relationships: [{ id: 'L1', sourceType: 'project', sourceId: 'P1', targetType: 'risk', targetId: 'R1', relation: 'addresses' }]
  });

  assert.strictEqual(diagnostics.totalIssues, 0);
  assert.strictEqual(diagnostics.relationshipErrors, 0);
});

test('buildIntegrityReportPayload includes summary and schema metadata', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'P1', name: 'Project 1', description: '', status: 'planning', requirements: [] }];
  explorer.risks = [{ id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'MISSING' }];
  explorer.incidents = [];
  explorer.relationships = [];
  explorer.actions = [];
  explorer.directions = [];

  const payload = explorer.buildIntegrityReportPayload();
  assert.strictEqual(payload.schema.id, 'pspf-explorer.v2');
  assert.strictEqual(payload.scope.type, 'integrity-report');
  assert.ok(payload.summary.totalIssues >= 1);
});

test('exportIntegrityReport calls download helper with expected prefix', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  let calledPrefix = '';
  explorer.downloadJsonFile = (_payload, prefix) => {
    calledPrefix = prefix;
  };
  explorer.showNotification = () => {};

  explorer.exportIntegrityReport();
  assert.strictEqual(calledPrefix, 'pspf-integrity-report');
});

test('renderDataIntegrityDiagnostics includes action buttons when anomalies exist', () => {
  createSandboxDom();
  const panel = document.createElement('div');
  panel.id = 'dataIntegrityPanel';
  document.body.appendChild(panel);

  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [];
  explorer.risks = [{ id: 'R1', name: 'Risk 1', description: '', likelihood: 'low', impact: 'low', projectId: 'MISSING' }];
  explorer.incidents = [];
  explorer.relationships = [];
  explorer.actions = [];
  explorer.directions = [];
  explorer.compliance = {};

  explorer.renderDataIntegrityDiagnostics();
  assert.ok(panel.querySelector('[data-action="review-integrity-issues"]'));
  assert.ok(panel.querySelector('[data-action="export-integrity-report"]'));
});
