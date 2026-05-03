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

// ── Phase 2: Evidence records ─────────────────────────────────────────────

test('addEvidenceRecord creates a typed record with correct fields', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const record = explorer.addEvidenceRecord('GOV-001', { type: 'policy', note: 'Security policy v2', url: 'https://example.gov.au/policy' });

  assert.strictEqual(record.requirementId, 'GOV-001');
  assert.strictEqual(record.type, 'policy');
  assert.strictEqual(record.note, 'Security policy v2');
  assert.strictEqual(record.url, 'https://example.gov.au/policy');
  assert.ok(typeof record.id === 'string' && record.id.startsWith('ev-'));
  assert.ok(typeof record.createdAt === 'string');
  assert.strictEqual(explorer.evidenceRecords.length, 1);
});

test('addEvidenceRecord falls back to other for unknown type', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const record = explorer.addEvidenceRecord('GOV-002', { type: 'unknown-type', note: 'test' });

  assert.strictEqual(record.type, 'other');
});

test('removeEvidenceRecord removes only the targeted record', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  explorer.addEvidenceRecord('GOV-001', { type: 'policy', note: 'First' });
  const second = explorer.addEvidenceRecord('GOV-001', { type: 'process', note: 'Second' });
  explorer.addEvidenceRecord('GOV-002', { type: 'attestation', note: 'Other req' });

  assert.strictEqual(explorer.evidenceRecords.length, 3);

  explorer.removeEvidenceRecord(second.id);

  assert.strictEqual(explorer.evidenceRecords.length, 2);
  assert.ok(!explorer.evidenceRecords.some(r => r.id === second.id));
  assert.ok(explorer.evidenceRecords.some(r => r.note === 'First'));
  assert.ok(explorer.evidenceRecords.some(r => r.requirementId === 'GOV-002'));
});

test('getEvidenceForRequirement returns only records for that requirement', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  explorer.addEvidenceRecord('GOV-001', { type: 'policy', note: 'A' });
  explorer.addEvidenceRecord('GOV-001', { type: 'process', note: 'B' });
  explorer.addEvidenceRecord('GOV-002', { type: 'attestation', note: 'C' });

  const forGov001 = explorer.getEvidenceForRequirement('GOV-001');
  const forGov002 = explorer.getEvidenceForRequirement('GOV-002');
  const forGov003 = explorer.getEvidenceForRequirement('GOV-003');

  assert.strictEqual(forGov001.length, 2);
  assert.strictEqual(forGov002.length, 1);
  assert.strictEqual(forGov003.length, 0);
});

// ── Phase 2: Compliance review ────────────────────────────────────────────

test('reviewCompliance stamps lastReviewedAt on the compliance entry', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.requirements = { 'GOV-001': { id: 'GOV-001', title: 'Test', domainId: 'governance' } };
  explorer.showRequirementDetails = () => {};

  const before = Date.now();
  explorer.reviewCompliance('GOV-001', 'Annual review complete');
  const after = Date.now();

  const compliance = explorer.compliance['GOV-001'];
  assert.ok(compliance, 'Compliance entry should exist');
  assert.ok(typeof compliance.lastReviewedAt === 'string');
  const ts = new Date(compliance.lastReviewedAt).getTime();
  assert.ok(ts >= before && ts <= after, 'Timestamp should be within test window');
  assert.strictEqual(compliance.lastReviewedNotes, 'Annual review complete');
});

test('reviewCompliance preserves existing compliance status', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.requirements = { 'GOV-001': { id: 'GOV-001', title: 'Test', domainId: 'governance' } };
  explorer.renderDomainsGrid = () => {};
  explorer.updateStats = () => {};
  explorer.showRequirementDetails = () => {};

  explorer.updateCompliance('GOV-001', 'yes');
  explorer.reviewCompliance('GOV-001', '');

  assert.strictEqual(explorer.compliance['GOV-001'].status, 'yes');
  assert.ok(explorer.compliance['GOV-001'].lastReviewedAt);
});


// ── Phase 3: Directions ───────────────────────────────────────────────────

test('saveDirection creates a direction with correct fields', () => {
  createSandboxDom();
  // Provide stub elements for saveDirection to read
  document.body.innerHTML = `
    <input id="directionTitle" value="Direction One" />
    <input id="directionInstrumentNumber" value="2025-01" />
    <input id="directionIssuedAt" value="2025-01-01" />
    <textarea id="directionDescription">Test description</textarea>
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.editingDirection = null;
  explorer.renderDirections = () => {};
  explorer.hideModal = () => {};

  explorer.saveDirection();

  assert.strictEqual(explorer.directions.length, 1);
  const dir = explorer.directions[0];
  assert.strictEqual(dir.title, 'Direction One');
  assert.strictEqual(dir.instrumentNumber, '2025-01');
  assert.strictEqual(dir.issuedAt, '2025-01-01');
  assert.strictEqual(dir.description, 'Test description');
  assert.ok(dir.id.startsWith('dir-'));
  assert.ok(typeof dir.createdAt === 'string');
});

test('saveDirection updates an existing direction when editingDirection is set', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input id="directionTitle" value="Updated Title" />
    <input id="directionInstrumentNumber" value="" />
    <input id="directionIssuedAt" value="" />
    <textarea id="directionDescription">Updated</textarea>
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.directions = [{ id: 'dir-001', title: 'Original', instrumentNumber: '', issuedAt: null, description: '', createdAt: new Date().toISOString() }];
  explorer.editingDirection = 'dir-001';
  explorer.renderDirections = () => {};
  explorer.hideModal = () => {};

  explorer.saveDirection();

  assert.strictEqual(explorer.directions.length, 1);
  assert.strictEqual(explorer.directions[0].title, 'Updated Title');
  assert.strictEqual(explorer.directions[0].description, 'Updated');
  assert.strictEqual(explorer.directions[0].id, 'dir-001');
});

test('deleteDirection removes direction and cleans up relationships', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.renderDirections = () => {};
  explorer.directions = [
    { id: 'dir-001', title: 'Dir A', createdAt: new Date().toISOString() },
    { id: 'dir-002', title: 'Dir B', createdAt: new Date().toISOString() },
  ];
  explorer.relationships = [
    { id: 'rel-1', sourceType: 'direction', sourceId: 'dir-001', targetType: 'requirement', targetId: 'GOV-001', relation: 'supports', createdAt: new Date().toISOString() },
    { id: 'rel-2', sourceType: 'direction', sourceId: 'dir-002', targetType: 'requirement', targetId: 'GOV-001', relation: 'supports', createdAt: new Date().toISOString() },
  ];

  explorer.deleteDirection('dir-001');

  assert.strictEqual(explorer.directions.length, 1);
  assert.strictEqual(explorer.directions[0].id, 'dir-002');
  assert.strictEqual(explorer.relationships.length, 1);
  assert.strictEqual(explorer.relationships[0].id, 'rel-2');
});

// ── Phase 3: Actions ──────────────────────────────────────────────────────

test('saveAction creates an action with type and status', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input id="actionTitle" value="Fix gap" />
    <select id="actionType"><option value="remediation" selected>Remediation</option></select>
    <select id="actionStatus"><option value="in-progress" selected>In Progress</option></select>
    <input id="actionDueDate" value="2025-12-31" />
    <textarea id="actionDescription">Must fix before audit</textarea>
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.editingAction = null;
  explorer.renderActions = () => {};
  explorer.hideModal = () => {};

  explorer.saveAction();

  assert.strictEqual(explorer.actions.length, 1);
  const action = explorer.actions[0];
  assert.strictEqual(action.title, 'Fix gap');
  assert.strictEqual(action.type, 'remediation');
  assert.strictEqual(action.status, 'in-progress');
  assert.strictEqual(action.dueDate, '2025-12-31');
  assert.ok(action.id.startsWith('act-'));
});

test('saveAction defaults to other/not-started for unknown type/status', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input id="actionTitle" value="Fallback Test" />
    <select id="actionType"><option value="unknown-type" selected>?</option></select>
    <select id="actionStatus"><option value="bad-status" selected>?</option></select>
    <input id="actionDueDate" value="" />
    <textarea id="actionDescription"></textarea>
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.editingAction = null;
  explorer.renderActions = () => {};
  explorer.hideModal = () => {};

  explorer.saveAction();

  assert.strictEqual(explorer.actions[0].type, 'other');
  assert.strictEqual(explorer.actions[0].status, 'not-started');
});

test('deleteAction removes action and cleans up relationships', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.renderActions = () => {};
  explorer.actions = [
    { id: 'act-001', title: 'Action A', type: 'remediation', status: 'not-started', createdAt: new Date().toISOString() },
    { id: 'act-002', title: 'Action B', type: 'uplift', status: 'completed', createdAt: new Date().toISOString() },
  ];
  explorer.relationships = [
    { id: 'rel-1', sourceType: 'action', sourceId: 'act-001', targetType: 'requirement', targetId: 'GOV-001', relation: 'addresses', createdAt: new Date().toISOString() },
  ];

  explorer.deleteAction('act-001');

  assert.strictEqual(explorer.actions.length, 1);
  assert.strictEqual(explorer.actions[0].id, 'act-002');
  assert.strictEqual(explorer.relationships.length, 0);
});

// ── Phase 3: Relationships ────────────────────────────────────────────────

test('addRelationship creates a link between two entities', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const rel = explorer.addRelationship('requirement', 'GOV-001', 'risk', 'risk-001', 'addresses');

  assert.ok(rel);
  assert.strictEqual(rel.sourceType, 'requirement');
  assert.strictEqual(rel.sourceId, 'GOV-001');
  assert.strictEqual(rel.targetType, 'risk');
  assert.strictEqual(rel.targetId, 'risk-001');
  assert.strictEqual(rel.relation, 'addresses');
  assert.ok(rel.id.startsWith('rel-'));
  assert.strictEqual(explorer.relationships.length, 1);
});

test('addRelationship prevents duplicate links', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  explorer.addRelationship('requirement', 'GOV-001', 'risk', 'risk-001', 'addresses');
  const dup = explorer.addRelationship('requirement', 'GOV-001', 'risk', 'risk-001', 'addresses');

  assert.strictEqual(dup, null);
  assert.strictEqual(explorer.relationships.length, 1);
});

test('addRelationship prevents self-reference', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const self = explorer.addRelationship('requirement', 'GOV-001', 'requirement', 'GOV-001', 'supports');

  assert.strictEqual(self, null);
  assert.strictEqual(explorer.relationships.length, 0);
});

test('removeRelationship removes only the targeted link', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const r1 = explorer.addRelationship('requirement', 'GOV-001', 'risk', 'risk-001', 'addresses');
  const r2 = explorer.addRelationship('requirement', 'GOV-002', 'risk', 'risk-001', 'addresses');

  explorer.removeRelationship(r1.id);

  assert.strictEqual(explorer.relationships.length, 1);
  assert.strictEqual(explorer.relationships[0].id, r2.id);
});

test('getLinkedEntities returns all links for an entity in either direction', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  explorer.addRelationship('requirement', 'GOV-001', 'risk', 'risk-001', 'addresses');
  explorer.addRelationship('direction', 'dir-001', 'requirement', 'GOV-001', 'governs');
  explorer.addRelationship('requirement', 'GOV-002', 'risk', 'risk-001', 'addresses');

  const links = explorer.getLinkedEntities('requirement', 'GOV-001');

  assert.strictEqual(links.length, 2);
  const ids = links.map(r => r.id);
  assert.ok(ids.every(id => id));
});

// ── Stage 4: Relationship Map data layer ─────────────────────────────────

test('_buildMapData returns only linked entities when showUnlinked is false', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input type="checkbox" id="mapFilterDirections" checked>
    <input type="checkbox" id="mapFilterRequirements" checked>
    <input type="checkbox" id="mapFilterRisks" checked>
    <input type="checkbox" id="mapFilterActions" checked>
    <input type="checkbox" id="mapFilterUnlinked">
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.directions = [
    { id: 'dir-001', title: 'Dir A', createdAt: new Date().toISOString() },
    { id: 'dir-002', title: 'Dir B', createdAt: new Date().toISOString() },
  ];
  explorer.risks = [];
  explorer.actions = [];
  explorer.relationships = [
    { id: 'rel-1', sourceType: 'direction', sourceId: 'dir-001', targetType: 'requirement', targetId: 'GOV-001', relation: 'governs', createdAt: new Date().toISOString() },
  ];
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Req 1', domainId: 'governance' },
    'GOV-002': { id: 'GOV-002', title: 'Req 2', domainId: 'governance' },
  };

  const { nodes } = explorer._buildMapData();

  // Only dir-001 and GOV-001 are linked; dir-002 and GOV-002 should be excluded
  const ids = nodes.map(n => n.id);
  assert.ok(ids.includes('dir-001'));
  assert.ok(ids.includes('GOV-001'));
  assert.ok(!ids.includes('dir-002'));
  assert.ok(!ids.includes('GOV-002'));
});

test('_buildMapData includes unlinked entities when showUnlinked is checked', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input type="checkbox" id="mapFilterDirections" checked>
    <input type="checkbox" id="mapFilterRequirements" checked>
    <input type="checkbox" id="mapFilterRisks" checked>
    <input type="checkbox" id="mapFilterActions" checked>
    <input type="checkbox" id="mapFilterUnlinked" checked>
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.directions = [
    { id: 'dir-001', title: 'Dir A', createdAt: new Date().toISOString() },
    { id: 'dir-002', title: 'Dir B', createdAt: new Date().toISOString() },
  ];
  explorer.risks = [];
  explorer.actions = [];
  explorer.relationships = [];
  explorer.requirements = {};

  const { nodes } = explorer._buildMapData();

  const ids = nodes.map(n => n.id);
  assert.ok(ids.includes('dir-001'));
  assert.ok(ids.includes('dir-002'));
});

test('_buildMapData builds edges only for visible nodes', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input type="checkbox" id="mapFilterDirections" checked>
    <input type="checkbox" id="mapFilterRequirements" checked>
    <input type="checkbox" id="mapFilterRisks" checked>
    <input type="checkbox" id="mapFilterActions" checked>
    <input type="checkbox" id="mapFilterUnlinked">
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.directions = [{ id: 'dir-001', title: 'Dir A', createdAt: new Date().toISOString() }];
  explorer.risks = [{ id: 'risk-001', name: 'Risk A', severity: 'high', createdAt: new Date().toISOString() }];
  explorer.actions = [];
  explorer.requirements = { 'GOV-001': { id: 'GOV-001', title: 'Req 1', domainId: 'governance' } };
  explorer.relationships = [
    { id: 'rel-1', sourceType: 'direction', sourceId: 'dir-001', targetType: 'requirement', targetId: 'GOV-001', relation: 'governs', createdAt: new Date().toISOString() },
    { id: 'rel-2', sourceType: 'requirement', sourceId: 'GOV-001', targetType: 'risk', targetId: 'risk-001', relation: 'addresses', createdAt: new Date().toISOString() },
  ];

  const { nodes, edges } = explorer._buildMapData();

  assert.strictEqual(nodes.length, 3); // dir-001, GOV-001, risk-001
  assert.strictEqual(edges.length, 2);
});

test('_buildMapData respects type filter checkboxes', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <input type="checkbox" id="mapFilterDirections" checked>
    <input type="checkbox" id="mapFilterRequirements">
    <input type="checkbox" id="mapFilterRisks" checked>
    <input type="checkbox" id="mapFilterActions" checked>
    <input type="checkbox" id="mapFilterUnlinked" checked>
  `;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.directions = [{ id: 'dir-001', title: 'Dir A', createdAt: new Date().toISOString() }];
  explorer.risks = [{ id: 'risk-001', name: 'Risk A', severity: 'low', createdAt: new Date().toISOString() }];
  explorer.actions = [];
  explorer.requirements = { 'GOV-001': { id: 'GOV-001', title: 'Req 1', domainId: 'governance' } };
  explorer.relationships = [];

  const { nodes } = explorer._buildMapData();

  const types = nodes.map(n => n.type);
  assert.ok(!types.includes('requirement'), 'requirements should be filtered out');
  assert.ok(types.includes('direction'));
  assert.ok(types.includes('risk'));
});

test('_truncateText returns original text when it fits', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const fakeCtx = { measureText: (t) => ({ width: t.length * 6 }) };
  assert.strictEqual(explorer._truncateText(fakeCtx, 'Short', 200), 'Short');
});

test('_truncateText truncates and appends ellipsis when text is too long', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const fakeCtx = { measureText: (t) => ({ width: t.length * 8 }) };
  const result = explorer._truncateText(fakeCtx, 'A very long label that will not fit', 60);
  assert.ok(result.endsWith('…'));
  assert.ok(result.length < 'A very long label that will not fit'.length);
});
