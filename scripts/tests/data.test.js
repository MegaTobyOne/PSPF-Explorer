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

// ── Stage 5: Share Package & Staged Import ────────────────────────────────

test('computeImportDiff identifies added, conflicts, and matched records', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  const current = {
    projects: [{ id: 'p1', name: 'Old Name' }],
    risks: [],
    incidents: [],
    actions: [],
    directions: [],
    relationships: [],
    evidenceRecords: [],
    compliance: { 'GOV-001': { status: 'compliant' } },
  };

  const incoming = {
    projects: [
      { id: 'p1', name: 'Updated Name' },   // conflict
      { id: 'p2', name: 'New Project' },     // added
    ],
    risks: [],
    incidents: [],
    actions: [],
    directions: [],
    relationships: [],
    evidenceRecords: [],
    compliance: {
      'GOV-001': { status: 'partial' },      // compliance conflict
      'GOV-002': { status: 'not-compliant' }, // compliance added
    },
  };

  const diff = explorer.computeImportDiff(incoming, current);

  assert.strictEqual(diff.projects.added.length, 1);
  assert.strictEqual(diff.projects.conflicts.length, 1);
  assert.strictEqual(diff.projects.matched.length, 0);
  assert.strictEqual(diff.compliance.added.length, 1);
  assert.strictEqual(diff.compliance.conflicts.length, 1);
});

test('computeImportDiff treats identical records as matched', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const record = { id: 'r1', name: 'Identical', createdAt: '2025-01-01T00:00:00Z' };
  const diff = explorer.computeImportDiff(
    { projects: [], risks: [record], incidents: [], actions: [], directions: [], relationships: [], evidenceRecords: [], compliance: {} },
    { projects: [], risks: [record], incidents: [], actions: [], directions: [], relationships: [], evidenceRecords: [], compliance: {} }
  );
  assert.strictEqual(diff.risks.matched.length, 1);
  assert.strictEqual(diff.risks.conflicts.length, 0);
  assert.strictEqual(diff.risks.added.length, 0);
});

test('applyMerge with merge-incoming adds new records and overwrites conflicts', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'p1', name: 'Old' }];
  explorer.risks = [];
  explorer.incidents = [];
  explorer.actions = [];
  explorer.directions = [];
  explorer.relationships = [];
  explorer.evidenceRecords = [];
  explorer.compliance = {};
  explorer.importBatches = [];
  explorer.mergeReviews = [];

  const sanitizedData = {
    projects: [{ id: 'p1', name: 'Updated' }, { id: 'p2', name: 'New' }],
    risks: [], incidents: [], actions: [], directions: [], relationships: [], evidenceRecords: [],
    compliance: {},
    importBatches: [], mergeReviews: [],
  };

  const diff = explorer.computeImportDiff(sanitizedData, {
    projects: explorer.projects, risks: [], incidents: [], actions: [], directions: [],
    relationships: [], evidenceRecords: [], compliance: {},
  });

  explorer.applyMerge(sanitizedData, diff, 'merge-incoming');

  assert.strictEqual(explorer.projects.length, 2);
  assert.strictEqual(explorer.projects.find(p => p.id === 'p1').name, 'Updated');
  assert.ok(explorer.projects.find(p => p.id === 'p2'));
});

test('applyMerge with merge-keep-mine keeps existing data for conflicts', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'p1', name: 'Mine' }];
  explorer.risks = []; explorer.incidents = []; explorer.actions = [];
  explorer.directions = []; explorer.relationships = []; explorer.evidenceRecords = [];
  explorer.compliance = {}; explorer.importBatches = []; explorer.mergeReviews = [];

  const sanitizedData = {
    projects: [{ id: 'p1', name: 'Theirs' }, { id: 'p2', name: 'New' }],
    risks: [], incidents: [], actions: [], directions: [], relationships: [], evidenceRecords: [],
    compliance: {}, importBatches: [], mergeReviews: [],
  };
  const diff = explorer.computeImportDiff(sanitizedData, {
    projects: explorer.projects, risks: [], incidents: [], actions: [], directions: [],
    relationships: [], evidenceRecords: [], compliance: {},
  });

  explorer.applyMerge(sanitizedData, diff, 'merge-keep-mine');

  assert.strictEqual(explorer.projects.find(p => p.id === 'p1').name, 'Mine');
  assert.ok(explorer.projects.find(p => p.id === 'p2'));
});

test('applyMerge with replace-all replaces all data', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.projects = [{ id: 'p1', name: 'Old' }];
  explorer.risks = []; explorer.incidents = []; explorer.actions = [];
  explorer.directions = []; explorer.relationships = []; explorer.evidenceRecords = [];
  explorer.compliance = { 'GOV-001': { status: 'compliant' } };
  explorer.importBatches = []; explorer.mergeReviews = [];

  const sanitizedData = {
    projects: [{ id: 'p2', name: 'Only this' }],
    risks: [], incidents: [], actions: [], directions: [], relationships: [], evidenceRecords: [],
    compliance: {},
    importBatches: [], mergeReviews: [],
  };
  const diff = explorer.computeImportDiff(sanitizedData, {
    projects: explorer.projects, risks: [], incidents: [], actions: [], directions: [],
    relationships: [], evidenceRecords: [], compliance: explorer.compliance,
  });

  explorer.applyMerge(sanitizedData, diff, 'replace-all');

  assert.strictEqual(explorer.projects.length, 1);
  assert.strictEqual(explorer.projects[0].id, 'p2');
  assert.deepStrictEqual(explorer.compliance, {});
});

test('recordImportBatch records correct totals', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.importBatches = [];

  const diff = {
    projects:      { added: [{}], conflicts: [{}, {}], matched: [] },
    risks:         { added: [],   conflicts: [],        matched: [{}] },
    incidents:     { added: [],   conflicts: [],        matched: [] },
    actions:       { added: [{}], conflicts: [],        matched: [] },
    directions:    { added: [],   conflicts: [],        matched: [] },
    relationships: { added: [],   conflicts: [],        matched: [] },
    evidenceRecords: { added: [], conflicts: [],        matched: [] },
    compliance:    { added: [],   conflicts: [{}],      matched: [] },
  };

  explorer.recordImportBatch({ strategy: 'merge-incoming', filename: 'test.json', diff, appliedAt: new Date().toISOString() });

  assert.strictEqual(explorer.importBatches.length, 1);
  const batch = explorer.importBatches[0];
  assert.strictEqual(batch.totalAdded, 2);
  assert.strictEqual(batch.totalConflicts, 3);
  assert.strictEqual(batch.totalMatched, 1);
  assert.strictEqual(batch.strategy, 'merge-incoming');
});

test('buildSharePackage includes linked entities', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Req 1', domainId: 'governance' },
  };
  explorer.risks = [{ id: 'risk-1', name: 'Risk A', severity: 'high', createdAt: new Date().toISOString() }];
  explorer.actions = [{ id: 'act-1', title: 'Action A', createdAt: new Date().toISOString() }];
  explorer.directions = [];
  explorer.evidenceRecords = [{ id: 'ev-1', requirementId: 'GOV-001', type: 'policy', title: 'E1' }];
  explorer.compliance = { 'GOV-001': { status: 'compliant' } };
  explorer.relationships = [
    { id: 'r1', sourceType: 'requirement', sourceId: 'GOV-001', targetType: 'risk', targetId: 'risk-1', relation: 'addresses', createdAt: new Date().toISOString() },
    { id: 'r2', sourceType: 'requirement', sourceId: 'GOV-001', targetType: 'action', targetId: 'act-1', relation: 'mitigated-by', createdAt: new Date().toISOString() },
  ];
  explorer.projects = [];
  explorer.incidents = [];
  explorer.importBatches = [];
  explorer.mergeReviews = [];

  const pkg = explorer.buildSharePackage(['GOV-001']);

  assert.ok(pkg.data.risks.find(r => r.id === 'risk-1'), 'risk should be included');
  assert.ok(pkg.data.actions.find(a => a.id === 'act-1'), 'action should be included');
  assert.ok(pkg.data.evidenceRecords.find(e => e.id === 'ev-1'), 'evidence should be included');
  assert.strictEqual(pkg.data.compliance['GOV-001'].status, 'compliant');
  assert.strictEqual(pkg.data.relationships.length, 2);
  assert.strictEqual(pkg.scope.type, 'share-package');
});

// ── Stage 6: Integration and External Capture ─────────────────────────────

test('validateExternalCapture rejects invalid schema', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const result = explorer.validateExternalCapture({ schema: 'wrong.schema', systemName: 'X', systemId: 'y', records: { risks: [{}] } });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('Unsupported schema')));
});

test('validateExternalCapture rejects missing systemName', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const result = explorer.validateExternalCapture({ schema: 'pspf-explorer-external.v1', systemId: 'y', records: { risks: [{}] } });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('systemName')));
});

test('validateExternalCapture rejects empty records', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const result = explorer.validateExternalCapture({ schema: 'pspf-explorer-external.v1', systemName: 'X', systemId: 'y', records: { risks: [], actions: [], directions: [] } });
  assert.ok(!result.valid);
  assert.ok(result.errors.some(e => e.includes('No records')));
});

test('validateExternalCapture accepts valid payload', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const result = explorer.validateExternalCapture({
    schema: 'pspf-explorer-external.v1',
    systemName: 'ACME GRC', systemId: 'acme-001',
    capturedAt: new Date().toISOString(),
    records: { risks: [{ id: 'r1', name: 'Risk A', likelihood: 'medium', impact: 'high', severity: 'high' }] }
  });
  assert.ok(result.valid, result.errors?.join(', '));
});

test('applyExternalCapture stamps _externalSource lineage on new records', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.risks = []; explorer.actions = []; explorer.directions = [];
  explorer.projects = []; explorer.incidents = []; explorer.relationships = [];
  explorer.compliance = {}; explorer.evidenceRecords = []; explorer.importBatches = []; explorer.mergeReviews = [];

  explorer.applyExternalCapture({
    systemName: 'GRC Tool', systemId: 'grc-1', capturedAt: '2025-01-01T00:00:00Z',
    records: { risks: [{ id: 'ext-r1', name: 'External Risk', likelihood: 'medium', impact: 'high', severity: 'high', description: '' }] }
  });

  assert.strictEqual(explorer.risks.length, 1);
  const r = explorer.risks[0];
  assert.ok(explorer.isExternalRecord(r));
  assert.strictEqual(r._externalSource.systemName, 'GRC Tool');
  assert.strictEqual(r._externalSource.externalId, 'ext-r1');
  assert.deepStrictEqual(r._externalSource.lockedFields, ['name', 'likelihood', 'impact', 'severity']);
});

test('applyExternalCapture updates locked fields on re-ingest', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.risks = [{
    id: 'risk-ext-grc-1-ext-r1',
    name: 'Old Name', likelihood: 'low', impact: 'low', severity: 'low', description: 'my local note',
    _externalSource: { systemName: 'GRC Tool', systemId: 'grc-1', externalId: 'ext-r1', capturedAt: '2025-01-01T00:00:00Z', lockedFields: ['name', 'likelihood', 'impact', 'severity'] }
  }];
  explorer.actions = []; explorer.directions = [];
  explorer.projects = []; explorer.incidents = []; explorer.relationships = [];
  explorer.compliance = {}; explorer.evidenceRecords = []; explorer.importBatches = []; explorer.mergeReviews = [];

  explorer.applyExternalCapture({
    systemName: 'GRC Tool', systemId: 'grc-1', capturedAt: '2025-06-01T00:00:00Z',
    records: { risks: [{ id: 'ext-r1', name: 'Updated Name', likelihood: 'high', impact: 'high', severity: 'critical', description: 'external desc' }] }
  });

  assert.strictEqual(explorer.risks.length, 1);
  const r = explorer.risks[0];
  assert.strictEqual(r.name, 'Updated Name');           // locked field updated
  assert.strictEqual(r.severity, 'critical');            // locked field updated
  assert.strictEqual(r.description, 'my local note');   // non-locked field preserved
});

test('isExternalRecord returns false for local records', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  assert.ok(!explorer.isExternalRecord({ id: 'local-1', name: 'Local Risk' }));
  assert.ok(!explorer.isExternalRecord(null));
});

test('isFieldLocked returns true only for locked fields on external records', () => {
  createSandboxDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  const record = {
    id: 'r1', name: 'X',
    _externalSource: { systemName: 'S', systemId: 's1', externalId: 'e1', capturedAt: '', lockedFields: ['name', 'severity'] }
  };
  assert.ok( explorer.isFieldLocked(record, 'name'));
  assert.ok( explorer.isFieldLocked(record, 'severity'));
  assert.ok(!explorer.isFieldLocked(record, 'description'));
  assert.ok(!explorer.isFieldLocked({ id: 'local' }, 'name'));
});

test('saveRisk preserves locked field values for external records', () => {
  createSandboxDom();
  document.body.innerHTML = `
    <span id="dataProjectCount"></span>
    <span id="dataRiskCount"></span>
    <span id="dataIncidentCount"></span>
    <span id="dataLastModified"></span>
    <div id="riskModal">
      <h3 id="riskModalTitle"></h3>
      <form id="riskForm">
        <input id="riskName" value="Local Override Attempt">
        <textarea id="riskDesc">My local note</textarea>
        <select id="riskLikelihood"><option value="low" selected>low</option></select>
        <select id="riskImpact"><option value="low" selected>low</option></select>
        <textarea id="riskMitigation">local mit</textarea>
      </form>
    </div>`;
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.editingRisk = 'r-ext-1';
  explorer.currentProjectId = null;
  explorer.risks = [{
    id: 'r-ext-1', name: 'Canonical Name', likelihood: 'high', impact: 'very-high', severity: 'critical', description: '', mitigation: '',
    _externalSource: { systemName: 'GRC', systemId: 'g1', externalId: 'e1', capturedAt: '', lockedFields: ['name', 'likelihood', 'impact', 'severity'] }
  }];
  explorer.projects = []; explorer.incidents = []; explorer.actions = [];
  explorer.directions = []; explorer.relationships = []; explorer.evidenceRecords = [];
  explorer.compliance = {}; explorer.importBatches = []; explorer.mergeReviews = [];

  explorer.saveRisk();

  const saved = explorer.risks.find(r => r.id === 'r-ext-1');
  assert.strictEqual(saved.name, 'Canonical Name');   // locked — not overwritten
  assert.strictEqual(saved.severity, 'critical');      // locked — not overwritten
  assert.strictEqual(saved.description, 'My local note'); // non-locked — updated
});
