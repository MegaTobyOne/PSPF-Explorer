import { test } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { PSPFExplorer } from '../main.js';

function createTestDom() {
  const dom = new JSDOM(`<!DOCTYPE html><body>
    <button id="homeBtn"></button>
    <button id="searchBtn"></button>
    <button id="progressBtn"></button>
    <button id="projectBtn"></button>
    <button id="myWorkBtn"></button>
    <button id="dataBtn"></button>
    <button id="helpBtn"></button>

    <section id="homeView" class="view"></section>
    <section id="searchView" class="view"></section>
    <section id="progressView" class="view"></section>
    <section id="projectView" class="view">
      <div id="projectListView"></div>
      <div id="projectDetailView" class="hidden"></div>
    </section>
    <section id="dataView" class="view">
      <div class="view-header"><h2>Data</h2></div>
      <button id="importDataBtn"></button>
      <button id="clearDataBtn"></button>
    </section>
    <section id="helpView" class="view"></section>
    <section id="myWorkView" class="view">
      <div id="myWorkDashboard"></div>
      <div id="myWorkTagFilters"></div>
      <div id="myWorkRequirementsList"></div>
      <div id="myWorkMiniHeatmap"></div>
      <input id="myWorkUserNameInput" type="text">
    </section>

    <div id="welcomeDashboard"></div>
    <div id="requirementsSection" class="hidden"></div>
    <div id="requirementsList"></div>
    <div id="tagFilters"></div>
    <select id="domainFilter"></select>
    <input id="requirementSearch">
    <div id="requirementDetails"></div>
  </body></html>`, {
    url: 'http://localhost'
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;

  return dom;
}

test('showView controls active view classes', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.renderHome = () => {}; // avoid extra DOM access
  explorer.renderProjects = () => {};
  explorer.renderTagManagement = () => {};
  explorer.renderDomainRequirementHeatmap = () => {}; // invoked via renderHome

  explorer.showView('search');
  const searchView = document.getElementById('searchView');
  assert.ok(searchView.classList.contains('active'));

  const homeView = document.getElementById('homeView');
  assert.ok(!homeView.classList.contains('active'));
  assert.strictEqual(explorer.currentView, 'search');
});

test('home view displays welcome dashboard and hides requirements pane', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.renderHome = () => {};
  explorer.renderProjects = () => {};
  explorer.renderTagManagement = () => {};
  explorer.renderDomainRequirementHeatmap = () => {};

  explorer.showView('home');
  const welcome = document.getElementById('welcomeDashboard');
  const requirements = document.getElementById('requirementsSection');

  assert.strictEqual(welcome.style.display, 'block');
  assert.ok(requirements.classList.contains('hidden'));
  assert.strictEqual(requirements.style.display, 'none');
  assert.strictEqual(explorer.currentView, 'home');
});

test('project view shows project list and renders projects', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  let projectsRendered = false;
  explorer.renderHome = () => {};
  explorer.renderProjects = () => {
    projectsRendered = true;
  };
  explorer.renderTagManagement = () => {};
  explorer.renderDomainRequirementHeatmap = () => {};

  explorer.showView('project');
  const listView = document.getElementById('projectListView');
  const detailView = document.getElementById('projectDetailView');

  assert.ok(!listView.classList.contains('hidden'));
  assert.ok(detailView.classList.contains('hidden'));
  assert.strictEqual(projectsRendered, true);
  assert.strictEqual(explorer.currentView, 'project');
});

test('data view triggers tag management and help view toggles active class', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  let tagRendered = false;
  explorer.renderHome = () => {};
  explorer.renderProjects = () => {};
  explorer.renderTagManagement = () => {
    tagRendered = true;
  };
  explorer.renderDomainRequirementHeatmap = () => {};

  explorer.showView('data');
  const dataView = document.getElementById('dataView');
  assert.ok(dataView.classList.contains('active'));
  assert.strictEqual(tagRendered, true);

  explorer.showView('help');
  const helpView = document.getElementById('helpView');
  assert.ok(helpView.classList.contains('active'));
  assert.strictEqual(explorer.currentView, 'help');
});

test('My Work view renders empty state when no assignments exist', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.tagDefinitions = {
    'solo': { name: 'Solo', color: '#123456', description: 'Just for test' }
  };
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Test requirement', description: 'Details', domainId: 'governance' }
  };
  explorer.domains = [{ id: 'governance', requirements: ['GOV-001'] }];
  explorer.compliance = {};
  explorer.currentUserProfile = { id: 'user-test', name: 'Tester' };
  explorer.userTagAssignments = { 'user-test': {} };
  explorer.myWorkActiveTagFilters = new Set();

  explorer.renderMyWorkView();

  const list = document.getElementById('myWorkRequirementsList');
  assert.ok(list.textContent.includes('Tester'));
  const heatmap = document.getElementById('myWorkMiniHeatmap');
  assert.ok(heatmap.textContent.includes('No tagged requirements yet'));
});

test('My Work filter guard ignores unused tags', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.currentUserProfile = { id: 'user-test', name: 'Tester' };
  explorer.userTagAssignments = { 'user-test': {} };
  explorer.myWorkActiveTagFilters = new Set();

  explorer.toggleMyWorkFilter('ghost');

  assert.strictEqual(explorer.myWorkActiveTagFilters.size, 0);
});

test('mobile capability guard blocks desktop-only actions on mobile', () => {
  createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  let notified = '';
  explorer.showNotification = (message) => {
    notified = message;
  };

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 480
  });

  const allowed = explorer.ensureCapabilityAvailable('dataImport');
  assert.strictEqual(allowed, false);
  assert.ok(notified.includes('larger screens'));
});

test('mobile capability notice toggles and disables complex data actions', () => {
  createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 480
  });
  explorer.updateMobileCapabilityNotice();

  const notice = document.getElementById('mobileCapabilityNotice');
  const importDataBtn = document.getElementById('importDataBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');

  assert.ok(notice);
  assert.ok(!notice.classList.contains('hidden'));
  assert.strictEqual(importDataBtn.disabled, true);
  assert.strictEqual(clearDataBtn.disabled, true);

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280
  });
  explorer.updateMobileCapabilityNotice();

  assert.ok(notice.classList.contains('hidden'));
  assert.strictEqual(importDataBtn.disabled, false);
  assert.strictEqual(clearDataBtn.disabled, false);
});

test('toggleRequirementTag assigns and removes per-user tags', () => {
  const dom = createTestDom();
  const explorer = new PSPFExplorer({ autoInit: false });
  explorer.currentUserProfile = { id: 'user-test', name: 'Tester' };
  explorer.userTagAssignments = { 'user-test': {} };
  explorer.requirements = {
    'GOV-001': { id: 'GOV-001', title: 'Test requirement', description: 'Details', domainId: 'governance' }
  };
  explorer.domains = [{ id: 'governance', requirements: ['GOV-001'] }];
  explorer.tagDefinitions = { 'demo': { name: 'Demo', color: '#123456', description: 'Sample' } };
  explorer.compliance = {};
  explorer.currentView = 'myWork';

  let requirementsRendered = false;
  explorer.renderRequirementsList = () => {
    requirementsRendered = true;
  };
  let myWorkRendered = false;
  explorer.renderMyWorkView = () => {
    myWorkRendered = true;
  };
  explorer.showRequirementDetails = () => {
    // no-op
  };

  explorer.toggleRequirementTag('GOV-001', 'demo');
  assert.deepStrictEqual(explorer.getUserRequirementTags('GOV-001'), ['demo']);
  assert.ok(requirementsRendered);
  assert.ok(myWorkRendered);

  explorer.toggleRequirementTag('GOV-001', 'demo');
  assert.deepStrictEqual(explorer.getUserRequirementTags('GOV-001'), []);
});
