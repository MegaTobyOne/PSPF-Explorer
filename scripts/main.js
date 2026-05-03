// Import domain data from module files
let PSPFDomainsData;

const DEFAULT_TAG_DEFINITIONS = Object.freeze({
    critical: {
        name: 'Critical Priority',
        color: '#dc2626',
        description: 'Immediate action required to remain compliant.'
    },
    high: {
        name: 'High Priority',
        color: '#ea580c',
        description: 'Needs attention during the current review cycle.'
    },
    medium: {
        name: 'Medium Priority',
        color: '#d97706',
        description: 'Track upcoming tasks or dependencies.'
    },
    low: {
        name: 'Low Priority',
        color: '#0ea5e9',
        description: 'Monitor as capacity allows.'
    },
    info: {
        name: 'Information Gap',
        color: '#6366f1',
        description: 'Requires additional evidence or documentation.'
    }
});

const MY_WORK_USER_NAME_KEY = 'pspf_mywork_user_name';
const MY_WORK_FILTERS_KEY = 'pspf_mywork_tag_filters';
const REQUIREMENT_DETAIL_MODE_KEY = 'pspf_requirement_detail_mode';
const REQUIREMENTS_VIEW_PREFERENCES_KEY = 'pspf_requirements_view_preferences';
const TREND_WATCH_DOMAIN_KEY = 'pspf_trend_watch_domain';
const TREND_WATCH_DAYS_KEY = 'pspf_trend_watch_days';
const WELCOME_SEEN_KEY = 'pspf_welcome_seen';
const WELCOME_SKIP_KEY = 'pspf_welcome_skip';
const DATA_MODEL_VERSION_KEY = 'pspf_data_model_version';
const CURRENT_DATA_MODEL_VERSION = '2.0';
const EXPORT_FORMAT_VERSION = '2.0';
const EXPORT_SCHEMA_ID = 'pspf-explorer.v2';
const SUPPORTED_IMPORT_VERSIONS = new Set(['1.0', '1.1', '2.0']);
const MOBILE_BREAKPOINT_PX = 768;

const MOBILE_COMPLEX_CAPABILITIES = Object.freeze({
    relationshipMap: {
        label: 'Relationship map',
        message: 'Relationship map is available on larger screens. Use desktop or tablet for full map interactions.'
    },
    advancedMerge: {
        label: 'Advanced merge review',
        message: 'Advanced merge review is available on larger screens. You can still view summaries on mobile.'
    },
    dataImport: {
        label: 'Data import',
        message: 'Data import is available on larger screens. Continue using reporting and simple updates on mobile.'
    },
    clearAllData: {
        label: 'Clear all data',
        message: 'Clearing all data is available on larger screens to reduce accidental data loss on mobile.'
    },
    requirementManager: {
        label: 'Requirement manager',
        message: 'Requirement manager is available on larger screens for safer bulk edits.'
    }
});

const DEFAULT_REQUIREMENTS_VIEW_PREFERENCES = Object.freeze({
    density: 'compact',
    textSize: 'md',
    showMeta: true,
    showHints: true,
    listWidth: 380
});
const EVIDENCE_CHECKLIST_ITEMS = Object.freeze([
    {
        key: 'policy',
        label: 'Policy or directive captured',
        description: 'Link to the approved policy, SOP, or directive that proves intent.',
        icon: '📘'
    },
    {
        key: 'process',
        label: 'Process & ownership documented',
        description: 'Describe who is accountable and how the requirement is executed day to day.',
        icon: '🧩'
    },
    {
        key: 'evidence',
        label: 'Evidence reference attached',
        description: 'Attach logs, tickets, or attestations that demonstrate the control in action.',
        icon: '🔗'
    }
]);

const EVIDENCE_TYPES = Object.freeze([
    { key: 'policy',         label: 'Policy or directive',     icon: '📘' },
    { key: 'process',        label: 'Process documentation',   icon: '🧩' },
    { key: 'system-control', label: 'System control',          icon: '⚙️' },
    { key: 'attestation',    label: 'Attestation or sign-off', icon: '✍️' },
    { key: 'log-or-report',  label: 'Log or report',           icon: '📊' },
    { key: 'other',          label: 'Other evidence',          icon: '📎' },
]);

const ACTION_TYPES = Object.freeze([
    { key: 'remediation', label: 'Remediation', icon: '🔧' },
    { key: 'uplift',      label: 'Uplift',       icon: '📈' },
    { key: 'review',      label: 'Review',       icon: '🔍' },
    { key: 'training',    label: 'Training',     icon: '🎓' },
    { key: 'other',       label: 'Other',        icon: '📋' },
]);

const ACTION_STATUSES = Object.freeze([
    { key: 'not-started', label: 'Not Started' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed',   label: 'Completed'   },
    { key: 'cancelled',   label: 'Cancelled'   },
]);

const EXTERNAL_CAPTURE_SCHEMA = 'pspf-explorer-external.v1';

/**
 * Fields treated as canonical/locked when sourced from an external system.
 * Local edits to these fields are blocked in edit modals.
 */
const EXTERNAL_LOCKED_FIELDS = Object.freeze({
    risks:      ['name', 'likelihood', 'impact', 'severity'],
    actions:    ['title', 'type', 'status', 'dueDate'],
    directions: ['title', 'instrumentNumber', 'issuedAt', 'description'],
});

/** Strips unsafe chars from an ID that will form part of a local entity ID. */
function sanitizeExternalId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'unknown';
}

const ANALYTICS_OPT_IN_KEY = 'pspf_analytics_optin';
const ANALYTICS_DATA_KEY   = 'pspf_analytics_data';
const ANALYTICS_EVENT_NAMES = Object.freeze([
    'view:home', 'view:search', 'view:progress', 'view:project',
    'view:myWork', 'view:map', 'view:data', 'view:help',
    'compliance:update', 'risk:create', 'action:create',
    'import:apply', 'share:export', 'external:capture',
]);

const createDefaultTagDefinitions = () => {
    return Object.keys(DEFAULT_TAG_DEFINITIONS).reduce((acc, key) => {
        acc[key] = { ...DEFAULT_TAG_DEFINITIONS[key] };
        return acc;
    }, {});
};

if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    PSPFDomainsData = {
        domains: [],
        requirements: {},
        essentialEightControls: []
    };
} else {
    const module = await import('./domains/index.js');
    PSPFDomainsData = module.default;
}

export class PSPFExplorer {
        constructor(options = {}) {
            const defaultOptions = { autoInit: true };
            this.options = { ...defaultOptions, ...options };

            this.storageAvailable = typeof localStorage !== 'undefined';
            
            // Debounce utility for performance
            this.debounce = (fn, delay) => {
                let timeoutId;
                return (...args) => {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => fn.apply(this, args), delay);
                };
            };

            // Track active modals for cleanup
            this.activeModals = new Set();
            this._modalState = new Map();
            this._openModalCount = 0;
            this._bodyOverflowBeforeModal = null;
            this._modalIdSeed = 0;

            // Initialize data structures
            const persistedStateEnvelope = this.readStorage('pspf_state_v2', null);
            const persistedStateData = this.resolvePersistedStateData(persistedStateEnvelope);

            this.projects = this.cloneFallback(persistedStateData?.projects ?? this.readStorage('pspf_projects', []));
            this.risks = this.cloneFallback(persistedStateData?.risks ?? this.readStorage('pspf_risks', []));
            this.incidents = this.cloneFallback(persistedStateData?.incidents ?? this.readStorage('pspf_incidents', []));
            this.compliance = this.cloneFallback(persistedStateData?.compliance ?? this.readStorage('pspf_compliance', {}));
            this.actions = this.cloneFallback(persistedStateData?.actions ?? this.readStorage('pspf_actions', []));
            this.directions = this.cloneFallback(persistedStateData?.directions ?? this.readStorage('pspf_directions', []));
            this.relationships = this.cloneFallback(persistedStateData?.relationships ?? this.readStorage('pspf_relationships', []));
            this.evidenceRecords = this.cloneFallback(persistedStateData?.evidenceRecords ?? this.readStorage('pspf_evidence_records', []));
            this.importBatches = this.cloneFallback(persistedStateData?.importBatches ?? this.readStorage('pspf_import_batches', []));
            this.mergeReviews = this.cloneFallback(persistedStateData?.mergeReviews ?? this.readStorage('pspf_merge_reviews', []));
            this.progressHistory = this.readStorage('pspf_progress_history', {});
            this.normalizeProgressHistory();

            this.userProfiles = this.readStorage('pspf_user_profiles', {});
            this.currentUserProfile = null;
            this.userTagAssignments = this.readStorage('pspf_user_tag_assignments', {});
            this.myWorkActiveTagFilters = new Set();
            this.activeTagFilters = new Set();
            this.tagDefinitions = createDefaultTagDefinitions();
            const rawDomains = Array.isArray(PSPFDomainsData?.domains) ? PSPFDomainsData.domains : [];
            this.domains = rawDomains.map(domain => ({
                ...domain,
                requirements: Array.isArray(domain.requirements) ? [...domain.requirements] : []
            }));
            const rawRequirements = PSPFDomainsData?.requirements || {};
            this.requirements = Object.keys(rawRequirements).reduce((acc, key) => {
                acc[key] = { ...rawRequirements[key] };
                return acc;
            }, {});
            this.essentialEightControls = Array.isArray(PSPFDomainsData?.essentialEightControls)
                ? PSPFDomainsData.essentialEightControls.map(control => ({ ...control }))
                : [];
            
            this.currentView = 'home';
            this.selectedDomain = null;
            this.gapReportPreferredDomainId = null;
            this.editingProject = null;
            this.editingRisk = null;
            this.editingIncident = null;
            this.isDomainGridCollapsed = false;
            this.isTagFiltersCollapsed = true;
            this.currentRequirementId = null;
            this.mobileCapabilityPolicy = {
                breakpointPx: MOBILE_BREAKPOINT_PX,
                desktopOnlyCapabilities: new Set(['relationshipMap', 'advancedMerge', 'dataImport', 'clearAllData', 'requirementManager'])
            };
            this.requirementDetailMode = this.readStorage(REQUIREMENT_DETAIL_MODE_KEY, 'summary');
            if (!['summary', 'control'].includes(this.requirementDetailMode)) {
                this.requirementDetailMode = 'summary';
            }

            this.requirementsSearchQuery = '';
            this.requirementsViewPreferences = this.readStorage(
                REQUIREMENTS_VIEW_PREFERENCES_KEY,
                { ...DEFAULT_REQUIREMENTS_VIEW_PREFERENCES }
            );
            this.sanitizeRequirementsViewPreferences();
            this.runDataModelMigrations();
            
            if (this.options.autoInit) {
                this.init();
            }
        }

        init() {
            this.loadTagDefinitions();
            this.loadSavedRequirements();
            this.initializeUserProfile();
            this.loadUserTagAssignments();
            this.loadMyWorkPreferences();
            this.initializeRequirementUUIDs();

            if (typeof document === 'undefined') {
                return;
            }

            this.setupEventListeners();
            this.setupEventDelegation();
            this.applyRequirementsViewPreferences();
            this.setupRequirementsUXControls();
            this.renderHome();
            this.renderProjects();
            this.renderDirections();
            this.renderActions();
            this.renderTagManagement();
            this.renderMyWorkView();
            this.renderProgress();
            this.renderDomainRequirementHeatmap();
            this.updateMobileCapabilityNotice();
            this.updateNavButtons('homeBtn');
            this.showWelcomeModalIfFirstTime();
        }

        isMobileViewport() {
            if (typeof window === 'undefined') {
                return false;
            }

            const breakpoint = this.mobileCapabilityPolicy?.breakpointPx || MOBILE_BREAKPOINT_PX;
            return Number.isFinite(window.innerWidth) && window.innerWidth <= breakpoint;
        }

        ensureCapabilityAvailable(capabilityKey, notify = true) {
            const policy = this.mobileCapabilityPolicy;
            const restricted = policy?.desktopOnlyCapabilities?.has(capabilityKey);
            if (!restricted || !this.isMobileViewport()) {
                return true;
            }

            if (notify) {
                const capability = MOBILE_COMPLEX_CAPABILITIES[capabilityKey];
                const fallback = 'This feature is available on larger screens. Continue using core reporting and simple updates on mobile.';
                const message = capability?.message || fallback;
                this.showNotification(message, 'info', 5000);
            }
            return false;
        }

        updateMobileCapabilityNotice() {
            if (typeof document === 'undefined') {
                return;
            }

            const dataView = document.getElementById('dataView');
            if (!dataView) {
                return;
            }

            let notice = document.getElementById('mobileCapabilityNotice');
            if (!notice) {
                notice = document.createElement('div');
                notice.id = 'mobileCapabilityNotice';
                notice.className = 'mobile-capability-notice hidden';
                notice.setAttribute('role', 'status');
                notice.innerHTML = `
                    <h3>Mobile mode</h3>
                    <p>Core reporting and simple updates stay available. Complex workflows like full import and destructive resets require a larger screen.</p>
                `;

                const viewHeader = dataView.querySelector('.view-header');
                if (viewHeader) {
                    viewHeader.insertAdjacentElement('afterend', notice);
                } else {
                    dataView.prepend(notice);
                }
            }

            const isMobile = this.isMobileViewport();
            notice.classList.toggle('hidden', !isMobile);

            const importDataBtn = document.getElementById('importDataBtn');
            if (importDataBtn) {
                importDataBtn.disabled = isMobile;
                importDataBtn.setAttribute('aria-disabled', isMobile ? 'true' : 'false');
                importDataBtn.title = isMobile ? MOBILE_COMPLEX_CAPABILITIES.dataImport.message : '';
            }

            const clearDataBtn = document.getElementById('clearDataBtn');
            if (clearDataBtn) {
                clearDataBtn.disabled = isMobile;
                clearDataBtn.setAttribute('aria-disabled', isMobile ? 'true' : 'false');
                clearDataBtn.title = isMobile ? MOBILE_COMPLEX_CAPABILITIES.clearAllData.message : '';
            }
        }

        runDataModelMigrations() {
            if (!this.storageAvailable) {
                return;
            }

            const toArray = (value) => Array.isArray(value) ? value : [];
            const normalizeId = (value) => {
                if (typeof value !== 'string') return '';
                return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
            };
            const relationshipId = (sourceType, sourceId, targetType, targetId, relation) => {
                const raw = `${sourceType}_${sourceId}__${targetType}_${targetId}__${relation}`;
                return `rel_${raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 200)}`;
            };

            let mutated = false;

            this.actions = toArray(this.actions);
            this.directions = toArray(this.directions);
            this.relationships = toArray(this.relationships);
            this.evidenceRecords = toArray(this.evidenceRecords);
            this.importBatches = toArray(this.importBatches);
            this.mergeReviews = toArray(this.mergeReviews);

            const knownSignatures = new Set();
            const migratedRelationships = [];
            this.relationships.forEach((link) => {
                if (!link || typeof link !== 'object') return;
                const sourceType = typeof link.sourceType === 'string' ? link.sourceType.trim().toLowerCase() : '';
                const sourceId = normalizeId(link.sourceId);
                const targetType = typeof link.targetType === 'string' ? link.targetType.trim().toLowerCase() : '';
                const targetId = normalizeId(link.targetId);
                const relation = typeof link.relation === 'string' && link.relation.trim() ? link.relation.trim().toLowerCase() : 'supports';
                if (!sourceType || !sourceId || !targetType || !targetId) return;
                if (sourceType === targetType && sourceId === targetId) return;

                const signature = `${sourceType}:${sourceId}->${targetType}:${targetId}:${relation}`;
                if (knownSignatures.has(signature)) return;
                knownSignatures.add(signature);

                migratedRelationships.push({
                    id: normalizeId(link.id) || relationshipId(sourceType, sourceId, targetType, targetId, relation),
                    sourceType,
                    sourceId,
                    targetType,
                    targetId,
                    relation,
                    createdAt: link.createdAt || new Date().toISOString()
                });
            });

            const addDerivedRelationship = (sourceType, sourceId, targetType, targetId, relation) => {
                const safeSource = normalizeId(sourceId);
                const safeTarget = normalizeId(targetId);
                if (!safeSource || !safeTarget) return;
                if (sourceType === targetType && safeSource === safeTarget) return;
                const signature = `${sourceType}:${safeSource}->${targetType}:${safeTarget}:${relation}`;
                if (knownSignatures.has(signature)) return;
                knownSignatures.add(signature);
                migratedRelationships.push({
                    id: relationshipId(sourceType, safeSource, targetType, safeTarget, relation),
                    sourceType,
                    sourceId: safeSource,
                    targetType,
                    targetId: safeTarget,
                    relation,
                    createdAt: new Date().toISOString()
                });
                mutated = true;
            };

            this.projects.forEach((project) => {
                const projectId = normalizeId(project?.id);
                if (!projectId) return;
                const reqs = Array.isArray(project?.requirements) ? project.requirements : [];
                reqs.forEach((reqId) => {
                    addDerivedRelationship('requirement', reqId, 'project', projectId, 'delivered-by');
                });
            });

            this.risks.forEach((risk) => {
                const riskId = normalizeId(risk?.id);
                const projectId = normalizeId(risk?.projectId);
                if (riskId && projectId) {
                    addDerivedRelationship('project', projectId, 'risk', riskId, 'addresses');
                }
            });

            this.incidents.forEach((incident) => {
                const incidentId = normalizeId(incident?.id);
                const projectId = normalizeId(incident?.projectId);
                if (incidentId && projectId) {
                    addDerivedRelationship('project', projectId, 'incident', incidentId, 'records');
                }
            });

            if (migratedRelationships.length !== this.relationships.length) {
                mutated = true;
            }
            this.relationships = migratedRelationships;

            const storedVersion = localStorage.getItem(DATA_MODEL_VERSION_KEY);
            if (storedVersion !== CURRENT_DATA_MODEL_VERSION) {
                mutated = true;
                localStorage.setItem(DATA_MODEL_VERSION_KEY, CURRENT_DATA_MODEL_VERSION);
            }

            if (mutated) {
                this.saveData();
            }
        }

        sanitizeRequirementsViewPreferences() {
            const pref = this.requirementsViewPreferences && typeof this.requirementsViewPreferences === 'object'
                ? this.requirementsViewPreferences
                : { ...DEFAULT_REQUIREMENTS_VIEW_PREFERENCES };

            const allowedDensities = new Set(['comfortable', 'compact', 'dense']);
            const density = allowedDensities.has(pref.density) ? pref.density : DEFAULT_REQUIREMENTS_VIEW_PREFERENCES.density;
            const textSize = ['sm', 'md', 'lg'].includes(pref.textSize) ? pref.textSize : 'md';
            const showMeta = pref.showMeta !== false;
            const showHints = pref.showHints !== false;
            const listWidthRaw = Number(pref.listWidth);
            let listWidth = Number.isFinite(listWidthRaw)
                ? Math.min(640, Math.max(280, Math.round(listWidthRaw)))
                : DEFAULT_REQUIREMENTS_VIEW_PREFERENCES.listWidth;

            // Keep the details pane usable: on wide layouts, cap the list width based on viewport.
            // (On <= 1000px layouts the CSS stacks panes, so we skip clamping.)
            const viewportWidth = (typeof window !== 'undefined' && Number.isFinite(window.innerWidth))
                ? window.innerWidth
                : null;
            if (viewportWidth && viewportWidth > 1000) {
                const estimatedRem = 16;
                const gap = 1 * estimatedRem; // grid gap is 1rem
                const splitter = 10;
                const detailsMin = 420;
                const sectionPadding = 2 * 20; // .requirements-section pads 1.25rem each side (~20px)
                const reserve = detailsMin + splitter + (2 * gap) + sectionPadding;
                const maxListWidth = Math.max(280, Math.min(640, Math.floor(viewportWidth - reserve)));
                if (listWidth > maxListWidth) {
                    listWidth = maxListWidth;
                }
            }

            this.requirementsViewPreferences = { density, textSize, showMeta, showHints, listWidth };
        }

        saveRequirementsViewPreferences() {
            this.sanitizeRequirementsViewPreferences();
            this.writeStorage(REQUIREMENTS_VIEW_PREFERENCES_KEY, this.requirementsViewPreferences);
        }

        getFontScaleForTextSize(textSize) {
            switch (textSize) {
                case 'sm': return 0.95;
                case 'lg': return 1.08;
                default: return 1;
            }
        }

        applyRequirementsViewPreferences() {
            if (typeof document === 'undefined') return;
            this.sanitizeRequirementsViewPreferences();
            const { density, textSize, listWidth, showMeta, showHints } = this.requirementsViewPreferences;

            document.documentElement.dataset.density = density;
            document.documentElement.style.setProperty('--ui-font-scale', String(this.getFontScaleForTextSize(textSize)));
            document.documentElement.style.setProperty('--req-list-width', `${listWidth}px`);

            const splitter = document.getElementById('requirementsSplitter');
            if (splitter) {
                splitter.setAttribute('aria-valuenow', String(listWidth));
            }

            const densitySelect = document.getElementById('requirementsDensity');
            if (densitySelect) densitySelect.value = density;
            const sizeSelect = document.getElementById('requirementsTextSize');
            if (sizeSelect) sizeSelect.value = textSize;
            const showMetaBox = document.getElementById('requirementsShowMeta');
            if (showMetaBox) showMetaBox.checked = !!showMeta;
            const showHintsBox = document.getElementById('requirementsShowHints');
            if (showHintsBox) showHintsBox.checked = !!showHints;
            const widthRange = document.getElementById('requirementsListWidth');
            if (widthRange) widthRange.value = String(listWidth);

            // If sanitization adjusted the width (e.g., viewport clamp), persist it.
            const stored = this.readStorage(REQUIREMENTS_VIEW_PREFERENCES_KEY, null);
            const storedWidth = stored && typeof stored === 'object' ? Number(stored.listWidth) : Number.NaN;
            if (!Number.isFinite(storedWidth) || Math.round(storedWidth) !== Math.round(listWidth)) {
                this.writeStorage(REQUIREMENTS_VIEW_PREFERENCES_KEY, this.requirementsViewPreferences);
            }
        }

        setupRequirementsUXControls() {
            if (typeof document === 'undefined') return;

            const viewBtn = document.getElementById('requirementsViewBtn');
            const viewPanel = document.getElementById('requirementsViewPanel');
            const searchInput = document.getElementById('requirementsQuickSearch');
            const densitySelect = document.getElementById('requirementsDensity');
            const sizeSelect = document.getElementById('requirementsTextSize');
            const showMetaBox = document.getElementById('requirementsShowMeta');
            const showHintsBox = document.getElementById('requirementsShowHints');
            const widthRange = document.getElementById('requirementsListWidth');
            const resetBtn = document.getElementById('requirementsResetView');
            const splitter = document.getElementById('requirementsSplitter');
            const listContainer = document.getElementById('requirementsList');

            if (viewBtn && viewPanel) {
                viewBtn.addEventListener('click', () => {
                    const willOpen = viewPanel.classList.contains('hidden');
                    viewPanel.classList.toggle('hidden', !willOpen);
                    viewBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                    if (willOpen) {
                        const focusTarget = viewPanel.querySelector('select, input, button');
                        focusTarget?.focus();
                    }
                });

                document.addEventListener('click', (event) => {
                    if (viewPanel.classList.contains('hidden')) return;
                    const clickedInside = viewPanel.contains(event.target) || viewBtn.contains(event.target);
                    if (!clickedInside) {
                        viewPanel.classList.add('hidden');
                        viewBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }

            if (searchInput) {
                const applySearch = this.debounce(() => {
                    this.requirementsSearchQuery = searchInput.value || '';
                    this.renderRequirementsList();
                }, 120);
                searchInput.addEventListener('input', applySearch);
            }

            if (densitySelect) {
                densitySelect.addEventListener('change', () => {
                    this.requirementsViewPreferences.density = densitySelect.value;
                    this.saveRequirementsViewPreferences();
                    this.applyRequirementsViewPreferences();
                });
            }

            if (sizeSelect) {
                sizeSelect.addEventListener('change', () => {
                    this.requirementsViewPreferences.textSize = sizeSelect.value;
                    this.saveRequirementsViewPreferences();
                    this.applyRequirementsViewPreferences();
                });
            }

            const rerenderList = () => {
                this.saveRequirementsViewPreferences();
                this.applyRequirementsViewPreferences();
                this.renderRequirementsList();
            };

            if (showMetaBox) {
                showMetaBox.addEventListener('change', () => {
                    this.requirementsViewPreferences.showMeta = showMetaBox.checked;
                    rerenderList();
                });
            }

            if (showHintsBox) {
                showHintsBox.addEventListener('change', () => {
                    this.requirementsViewPreferences.showHints = showHintsBox.checked;
                    rerenderList();
                });
            }

            if (widthRange) {
                const saveWidthDebounced = this.debounce(() => this.saveRequirementsViewPreferences(), 200);
                widthRange.addEventListener('input', () => {
                    const width = Number(widthRange.value);
                    this.requirementsViewPreferences.listWidth = width;
                    this.applyRequirementsViewPreferences();
                    saveWidthDebounced();
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.requirementsViewPreferences = { ...DEFAULT_REQUIREMENTS_VIEW_PREFERENCES };
                    this.saveRequirementsViewPreferences();
                    this.applyRequirementsViewPreferences();
                    this.renderRequirementsList();
                    if (searchInput) {
                        searchInput.value = '';
                        this.requirementsSearchQuery = '';
                    }
                });
            }

            if (listContainer) {
                listContainer.addEventListener('keydown', (event) => {
                    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'];
                    if (!keys.includes(event.key)) return;

                    const items = Array.from(listContainer.querySelectorAll('.requirement-item'));
                    if (!items.length) return;

                    const active = document.activeElement;
                    let index = items.indexOf(active);
                    if (index < 0) {
                        const selected = listContainer.querySelector('.requirement-item.active');
                        index = selected ? items.indexOf(selected) : 0;
                    }

                    const pageStep = 10;
                    if (event.key === 'ArrowDown') index = Math.min(items.length - 1, index + 1);
                    if (event.key === 'ArrowUp') index = Math.max(0, index - 1);
                    if (event.key === 'Home') index = 0;
                    if (event.key === 'End') index = items.length - 1;
                    if (event.key === 'PageDown') index = Math.min(items.length - 1, index + pageStep);
                    if (event.key === 'PageUp') index = Math.max(0, index - pageStep);

                    event.preventDefault();
                    items[index].focus();
                    try {
                        items[index].scrollIntoView({ block: 'nearest' });
                    } catch {
                        // ignore
                    }
                });
            }

            if (splitter) {
                const clampWidth = (value) => Math.min(640, Math.max(280, value));

                splitter.addEventListener('keydown', (event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
                    event.preventDefault();
                    const step = event.shiftKey ? 60 : 20;
                    if (event.key === 'Home') {
                        this.requirementsViewPreferences.listWidth = DEFAULT_REQUIREMENTS_VIEW_PREFERENCES.listWidth;
                    } else if (event.key === 'ArrowLeft') {
                        this.requirementsViewPreferences.listWidth = clampWidth(this.requirementsViewPreferences.listWidth - step);
                    } else if (event.key === 'ArrowRight') {
                        this.requirementsViewPreferences.listWidth = clampWidth(this.requirementsViewPreferences.listWidth + step);
                    }
                    this.applyRequirementsViewPreferences();
                    this.saveRequirementsViewPreferences();
                });

                splitter.addEventListener('pointerdown', (event) => {
                    splitter.setPointerCapture(event.pointerId);
                    const startX = event.clientX;
                    const startWidth = this.requirementsViewPreferences.listWidth;

                    const onMove = (moveEvent) => {
                        const delta = moveEvent.clientX - startX;
                        this.requirementsViewPreferences.listWidth = clampWidth(startWidth + delta);
                        this.applyRequirementsViewPreferences();
                    };
                    const onUp = (upEvent) => {
                        splitter.releasePointerCapture(upEvent.pointerId);
                        splitter.removeEventListener('pointermove', onMove);
                        splitter.removeEventListener('pointerup', onUp);
                        splitter.removeEventListener('pointercancel', onUp);
                        this.saveRequirementsViewPreferences();
                    };

                    splitter.addEventListener('pointermove', onMove);
                    splitter.addEventListener('pointerup', onUp);
                    splitter.addEventListener('pointercancel', onUp);
                });

                splitter.addEventListener('dblclick', () => {
                    this.requirementsViewPreferences.listWidth = DEFAULT_REQUIREMENTS_VIEW_PREFERENCES.listWidth;
                    this.applyRequirementsViewPreferences();
                    this.saveRequirementsViewPreferences();
                });
            }

            this.applyRequirementsViewPreferences();
        }

        /**
         * Show a toast notification to the user
         * @param {string} message - The message to display
         * @param {string} type - 'success' | 'error' | 'warning' | 'info'
         * @param {number} duration - How long to show the toast (ms)
         */
        showNotification(message, type = 'info', duration = 4000) {
            if (typeof document === 'undefined') return;

            // Create container if it doesn't exist
            let container = document.getElementById('notificationContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'notificationContainer';
                container.className = 'notification-container';
                document.body.appendChild(container);
            }

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            notification.innerHTML = `
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${this.escapeHtml(message || '')}</span>
                <button class="notification-close" aria-label="Close notification">×</button>
            `;

            container.appendChild(notification);

            requestAnimationFrame(() => {
                notification.classList.add('notification-show');
            });

            const closeBtn = notification.querySelector('.notification-close');
            const removeNotification = () => {
                notification.classList.remove('notification-show');
                notification.classList.add('notification-hide');
                setTimeout(() => notification.remove(), 300);
            };

            if (closeBtn) {
                closeBtn.addEventListener('click', removeNotification);
            }

            if (duration > 0) {
                setTimeout(removeNotification, duration);
            }
        }

        escapeHtml(text) {
            if (typeof document !== 'undefined') {
                const div = document.createElement('div');
                div.textContent = text == null ? '' : text;
                return div.innerHTML;
            }
            if (text == null) {
                return '';
            }
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        setupEventListeners() {
            // Navigation event listeners
            document.getElementById('homeBtn').addEventListener('click', () => {
                this.showView('home');
                this.updateNavButtons('homeBtn');
            });

            document.getElementById('searchBtn').addEventListener('click', () => {
                this.showView('search');
                this.updateNavButtons('searchBtn');
            });

            document.getElementById('progressBtn').addEventListener('click', () => {
                this.showView('progress');
                this.updateNavButtons('progressBtn');
                this.renderProgress();
            });

            document.getElementById('projectBtn').addEventListener('click', () => {
                this.showView('project');
                this.updateNavButtons('projectBtn');
            });

            const myWorkBtn = document.getElementById('myWorkBtn');
            if (myWorkBtn) {
                myWorkBtn.addEventListener('click', () => {
                    this.showView('myWork');
                    this.updateNavButtons('myWorkBtn');
                });
            }

            const mapBtn = document.getElementById('mapBtn');
            if (mapBtn) {
                mapBtn.addEventListener('click', () => {
                    if (!this.ensureCapabilityAvailable('relationshipMap')) return;
                    this.showView('map');
                    this.updateNavButtons('mapBtn');
                });
            }

            document.getElementById('dataBtn').addEventListener('click', () => {
                this.showView('data');
                this.updateNavButtons('dataBtn');
                this.updateDataStats();
            });

            document.getElementById('helpBtn').addEventListener('click', () => {
                this.showView('help');
                this.updateNavButtons('helpBtn');
                this.renderAnalyticsPanel();
            });

            const analyticsOptIn = document.getElementById('analyticsOptIn');
            if (analyticsOptIn) {
                analyticsOptIn.addEventListener('change', (e) => {
                    try {
                        localStorage.setItem(ANALYTICS_OPT_IN_KEY, e.target.checked ? 'true' : 'false');
                    } catch { /* non-fatal */ }
                    this.renderAnalyticsPanel();
                });
            }

            const toggleDomainsGridBtn = document.getElementById('toggleDomainsGridBtn');
            if (toggleDomainsGridBtn) {
                toggleDomainsGridBtn.addEventListener('click', () => this.toggleDomainGrid());
            }

            const toggleTagFiltersBtn = document.getElementById('toggleTagFiltersBtn');
            if (toggleTagFiltersBtn) {
                toggleTagFiltersBtn.addEventListener('click', () => this.toggleTagFilters());
            }

            // Welcome modal
            const closeWelcomeBtn = document.getElementById('closeWelcome');
            if (closeWelcomeBtn) {
                closeWelcomeBtn.addEventListener('click', () => {
                    this.hideWelcomeModal();
                });
            }

            // Data management buttons
            const exportDataBtn = document.getElementById('exportDataBtn');
            if (exportDataBtn) {
                exportDataBtn.addEventListener('click', () => this.exportData());
            }

            const domainExportSelect = document.getElementById('domainExportSelect');
            const domainExportBtn = document.getElementById('exportDomainBtn');
            if (domainExportSelect && domainExportBtn) {
                domainExportSelect.addEventListener('change', () => {
                    domainExportBtn.disabled = !domainExportSelect.value;
                });
                domainExportBtn.addEventListener('click', () => {
                    this.exportDomainData(domainExportSelect.value);
                });
            }

            const projectExportSelect = document.getElementById('projectExportSelect');
            const projectExportBtn = document.getElementById('exportProjectBtn');
            if (projectExportSelect && projectExportBtn) {
                projectExportSelect.addEventListener('change', () => {
                    projectExportBtn.disabled = !projectExportSelect.value;
                });
                projectExportBtn.addEventListener('click', () => {
                    this.exportProjectData(projectExportSelect.value);
                });
            }

            const importDataBtn = document.getElementById('importDataBtn');
            const importFileInput = document.getElementById('importFileInput');
            if (importDataBtn && importFileInput) {
                importDataBtn.addEventListener('click', () => {
                    if (!this.ensureCapabilityAvailable('dataImport')) {
                        return;
                    }
                    importFileInput.click();
                });
                importFileInput.addEventListener('change', (e) => this.importData(e));
            }

            const clearDataBtn = document.getElementById('clearDataBtn');
            if (clearDataBtn) {
                clearDataBtn.addEventListener('click', () => {
                    if (!this.ensureCapabilityAvailable('clearAllData')) {
                        return;
                    }
                    this.clearAllData();
                });
            }

            const manageRequirementsBtn = document.getElementById('manageRequirementsBtn');
            if (manageRequirementsBtn) {
                manageRequirementsBtn.addEventListener('click', () => {
                    if (!this.ensureCapabilityAvailable('requirementManager')) {
                        return;
                    }
                    this.showRequirementManagerModal();
                });
            }

            if (typeof window !== 'undefined') {
                window.addEventListener('resize', this.debounce(() => {
                    this.updateMobileCapabilityNotice();
                }, 150));
            }

            // Tag management
            const addTagBtn = document.getElementById('addTagBtn');
            if (addTagBtn) {
                addTagBtn.addEventListener('click', () => this.addNewTag());
            }

            // Search functionality with debouncing
            const searchInput = document.getElementById('searchInput');
            const searchSubmit = document.getElementById('searchSubmit');
            
            if (searchInput && searchSubmit) {
                const performSearch = () => {
                    const query = searchInput.value.toLowerCase().trim();
                    if (query) {
                        this.performSearch(query);
                    } else {
                        document.getElementById('searchResults').innerHTML = '<p>Please enter a search term.</p>';
                    }
                };

                // Debounced search for typing (300ms delay)
                const debouncedSearch = this.debounce(() => {
                    const query = searchInput.value.toLowerCase().trim();
                    if (query.length >= 2) {
                        this.performSearch(query);
                    }
                }, 300);

                searchSubmit.addEventListener('click', performSearch);
                searchInput.addEventListener('input', debouncedSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        performSearch();
                    }
                });
            }

            // Project management
            const addProjectBtn = document.getElementById('addProjectBtn');
            if (addProjectBtn) {
                addProjectBtn.addEventListener('click', () => this.showProjectModal());
            }

            // Modal event listeners
            this.setupModalEventListeners();
        }

        setupModalEventListeners() {
            // Project modal
            const projectForm = document.getElementById('projectForm');
            const cancelProject = document.getElementById('cancelProject');
            
            if (projectForm) {
                projectForm.addEventListener('submit', (e) => this.handleProjectForm(e));
            }
            if (cancelProject) {
                cancelProject.addEventListener('click', () => this.hideModal('projectModal'));
            }

            // Risk modal
            const riskForm = document.getElementById('riskForm');
            const cancelRisk = document.getElementById('cancelRisk');
            
            if (riskForm) {
                riskForm.addEventListener('submit', (e) => this.handleRiskForm(e));
            }
            if (cancelRisk) {
                cancelRisk.addEventListener('click', () => this.hideModal('riskModal'));
            }

            // Incident modal
            const incidentForm = document.getElementById('incidentForm');
            const cancelIncident = document.getElementById('cancelIncident');
            
            if (incidentForm) {
                incidentForm.addEventListener('submit', (e) => this.handleIncidentForm(e));
            }
            if (cancelIncident) {
                cancelIncident.addEventListener('click', () => this.hideModal('incidentModal'));
            }

            // Direction modal
            const directionForm = document.getElementById('directionForm');
            const cancelDirection = document.getElementById('cancelDirection');
            if (directionForm) {
                directionForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveDirection();
                });
            }
            if (cancelDirection) {
                cancelDirection.addEventListener('click', () => {
                    this.hideModal('directionModal');
                    this.editingDirection = null;
                });
            }

            // Action modal
            const actionForm = document.getElementById('actionForm');
            const cancelAction = document.getElementById('cancelAction');
            if (actionForm) {
                actionForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveAction();
                });
            }
            if (cancelAction) {
                cancelAction.addEventListener('click', () => {
                    this.hideModal('actionModal');
                    this.editingAction = null;
                });
            }

            // Wire up Directions and Actions toolbar buttons
            const addDirectionBtn = document.getElementById('addDirectionBtn');
            if (addDirectionBtn) {
                addDirectionBtn.addEventListener('click', () => this.showDirectionModal());
            }
            const addActionBtn = document.getElementById('addActionBtn');
            if (addActionBtn) {
                addActionBtn.addEventListener('click', () => this.showActionModal());
            }

            // Import review modal
            const cancelImportReview = document.getElementById('cancelImportReview');
            if (cancelImportReview) {
                cancelImportReview.addEventListener('click', () => {
                    this.hideModal('importReviewModal');
                    this._stagedImportData = null;
                    this._stagedImportDiff = null;
                });
            }
            const applyImportBtn = document.getElementById('applyImportBtn');
            if (applyImportBtn) {
                applyImportBtn.addEventListener('click', () => {
                    if (!this._stagedImportData || !this._stagedImportDiff) return;
                    const strategyEl = document.querySelector('input[name="importStrategy"]:checked');
                    const strategy = strategyEl?.value || 'merge-incoming';
                    this.applyMerge(this._stagedImportData, this._stagedImportDiff, strategy);
                    this.recordImportBatch({
                        strategy,
                        filename: this._stagedImportFile,
                        diff: this._stagedImportDiff,
                        appliedAt: new Date().toISOString(),
                    });
                    if (strategy === 'replace-all') {
                        this.importBatches = this._stagedImportData.importBatches?.length
                            ? this._stagedImportData.importBatches
                            : this.importBatches;
                    }
                    this.saveData();
                    this.hideModal('importReviewModal');
                    this._stagedImportData = null;
                    this._stagedImportDiff = null;
                    this.updateDataStats();
                    this.renderHome();
                    this.renderImportHistory();
                    const total = this._diffCount ? 0 : 0; // placeholder
                    this.trackEvent('import:apply');
                    this.showNotification('Import applied successfully.', 'success', 5000);
                });
            }

            // Share package export button
            const exportSharePackageBtn = document.getElementById('exportSharePackageBtn');
            const sharePackageDomainSelect = document.getElementById('sharePackageDomainSelect');
            if (sharePackageDomainSelect) {
                sharePackageDomainSelect.addEventListener('change', () => {
                    if (exportSharePackageBtn) exportSharePackageBtn.disabled = !sharePackageDomainSelect.value;
                });
            }
            if (exportSharePackageBtn) {
                exportSharePackageBtn.addEventListener('click', () => {
                    this.exportSharePackage(sharePackageDomainSelect?.value);
                });
            }

            // External capture
            const externalCaptureInput = document.getElementById('externalCaptureInput');
            const externalCaptureBtn   = document.getElementById('externalCaptureBtn');
            if (externalCaptureInput) {
                externalCaptureInput.addEventListener('change', (e) => this.ingestExternalCaptureFile(e));
            }
            if (externalCaptureBtn && externalCaptureInput) {
                externalCaptureBtn.addEventListener('click', () => externalCaptureInput.click());
            }

            // Project detail tabs (event delegation on container so re-renders are handled)
            const projectDetails = document.getElementById('projectDetails');
            if (projectDetails) {
                projectDetails.addEventListener('click', (event) => {
                    const tabBtn = event.target.closest('.tab-btn');
                    if (!tabBtn) return;
                    const tabName = tabBtn.getAttribute('data-tab');
                    if (tabName) {
                        this.switchProjectTab(tabName);
                    }
                });
            }
        }

        setupEventDelegation() {
            // Main container event delegation for dynamic elements
            const mainContainer = document.querySelector('.main');
            if (!mainContainer) return;

            // Handle click events via delegation
            mainContainer.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                if (target.matches('input[type="checkbox"][data-action="toggle-evidence"]')) {
                    return;
                }

                const action = target.dataset.action;
                this.handleDelegatedAction(action, target, e);
            });

            mainContainer.addEventListener('change', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                const action = target.dataset.action;
                this.handleDelegatedAction(action, target, e);
            });

            // Handle keyboard events for accessibility (Enter and Space)
            mainContainer.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                
                const target = e.target.closest('[data-action]');
                if (!target) return;

                // Prevent space from scrolling the page
                if (e.key === ' ') {
                    e.preventDefault();
                }

                const action = target.dataset.action;
                this.handleDelegatedAction(action, target, e);
            });
            
            // Body-level delegation for modals (outside main container)
            document.body.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                
                // Skip if already handled by main container
                if (mainContainer.contains(target)) return;
                
                const action = target.dataset.action;
                this.handleDelegatedAction(action, target, e);
            });
        }

        handleDelegatedAction(action, target, event) {
            switch (action) {
                case 'close-modal': {
                    const closeModalId = target.dataset.modalId;
                    const closeModalEl = (closeModalId && document.getElementById(closeModalId)) || target.closest('.modal');
                    if (!closeModalEl) break;

                    // Welcome modal sets the "seen" flag when closed.
                    if (closeModalEl.id === 'welcomeModal') {
                        this.hideWelcomeModal();
                        break;
                    }

                    // Dynamically-created modals should be removed to ensure listener cleanup.
                    if (this.activeModals && this.activeModals.has(closeModalEl)) {
                        closeModalEl.remove();
                        break;
                    }

                    this.closeModal(closeModalEl);
                    this.editingProject = null;
                    this.editingRisk = null;
                    this.editingIncident = null;
                    break;
                }
                // Domain actions
                case 'view-domain':
                    const domainId = target.dataset.domainId;
                    if (domainId) {
                        this.syncGapReportSelection(domainId, { updateList: true });
                        this.showView('home');
                        this.showDomainRequirements(domainId);
                    }
                    break;

                // Requirement actions
                case 'view-requirement': {
                    const reqId = target.dataset.requirementId;
                    if (reqId) {
                        const requirement = this.requirements[reqId];
                        if (requirement) {
                            this.showView('home');
                            this.showDomainRequirements(requirement.domainId);
                        }
                        this.showRequirementDetails(reqId);
                    }
                    break;
                }

                // Project actions
                case 'view-project':
                    const projectId = target.dataset.projectId;
                    if (projectId) {
                        this.showView('project');
                        this.showProjectDetails(projectId);
                    }
                    break;

                case 'edit-project':
                    const editProjectId = target.dataset.projectId;
                    if (editProjectId) this.showProjectModal(editProjectId);
                    break;

                case 'delete-project':
                    const deleteProjectId = target.dataset.projectId;
                    if (deleteProjectId) this.deleteProject(deleteProjectId);
                    break;

                case 'add-risk':
                    const riskProjectId = target.dataset.projectId;
                    if (riskProjectId) this.addRisk(riskProjectId);
                    break;

                case 'link-requirements': {
                    const linkProjectId = target.dataset.projectId;
                    if (linkProjectId) {
                        this.currentProjectId = linkProjectId;
                    }
                    if (this.currentProjectId) {
                        this.showLinkRequirementsModal();
                    } else {
                        this.showNotification('Select a project to link requirements.', 'warning');
                    }
                    break;
                }

                case 'add-incident': {
                    const incidentProjectId = target.dataset.projectId || this.currentProjectId;
                    if (incidentProjectId) {
                        this.showIncidentModal(null, incidentProjectId);
                    } else {
                        this.showNotification('Select a project before logging an event.', 'warning');
                    }
                    break;
                }

                case 'edit-incident': {
                    const editIncidentId = target.dataset.incidentId;
                    if (editIncidentId) {
                        const incident = this.incidents.find(i => i.id === editIncidentId);
                        const projectId = incident?.projectId || this.currentProjectId;
                        this.showIncidentModal(editIncidentId, projectId);
                    }
                    break;
                }

                case 'delete-incident': {
                    const deleteIncidentId = target.dataset.incidentId;
                    if (deleteIncidentId) {
                        this.deleteIncident(deleteIncidentId);
                    }
                    break;
                }

                // Risk actions
                case 'edit-risk':
                    const editRiskId = target.dataset.riskId;
                    if (editRiskId) this.editRisk(editRiskId);
                    break;

                case 'delete-risk':
                    const deleteRiskId = target.dataset.riskId;
                    if (deleteRiskId) this.deleteRisk(deleteRiskId);
                    break;

                // Navigation actions
                case 'nav-view':
                    const viewName = target.dataset.view;
                    const navBtn = target.dataset.navBtn;
                    if (viewName) {
                        this.showView(viewName);
                        if (navBtn) this.updateNavButtons(navBtn);
                    }
                    break;

                case 'review-integrity-issues':
                    this.showView('project');
                    this.updateNavButtons('projectBtn');
                    this.showNotification('Review project links and related records to resolve integrity anomalies.', 'info', 5000);
                    break;

                case 'export-integrity-report':
                    this.exportIntegrityReport();
                    break;

                case 'view-risk':
                    const riskId = target.dataset.riskId;
                    if (riskId) this.showRiskModal(riskId);
                    break;

                // Link/Unlink actions
                case 'link-project':
                    const linkReqId = target.dataset.requirementId;
                    if (linkReqId) this.showLinkProjectModal(linkReqId);
                    break;

                case 'unlink-project':
                    const unlinkProjectId = target.dataset.projectId;
                    const unlinkReqId = target.dataset.requirementId;
                    if (unlinkProjectId && unlinkReqId) {
                        this.unlinkProjectFromRequirement(unlinkProjectId, unlinkReqId);
                    }
                    break;

                case 'unlink-requirement':
                    const unlinkReqFromProject = target.dataset.requirementId;
                    if (unlinkReqFromProject) this.unlinkRequirementFromProject(unlinkReqFromProject);
                    break;

                // Tag actions
                case 'toggle-tag':
                    const toggleReqId = target.dataset.requirementId;
                    const toggleTagId = target.dataset.tagId;
                    if (toggleReqId && toggleTagId) {
                        this.toggleRequirementTag(toggleReqId, toggleTagId);
                    }
                    break;

                case 'edit-tag':
                    const editTagKey = target.dataset.tagKey;
                    if (editTagKey) this.editTag(editTagKey);
                    break;

                case 'delete-tag':
                    const deleteTagKey = target.dataset.tagKey;
                    if (deleteTagKey) this.deleteTag(deleteTagKey);
                    break;

                case 'clear-tags':
                    this.clearTagFilters();
                    break;

                case 'mywork-toggle-filter':
                    const myWorkTagId = target.dataset.tagId;
                    if (myWorkTagId) {
                        this.toggleMyWorkFilter(myWorkTagId);
                    }
                    break;

                case 'mywork-clear-tags':
                    this.clearMyWorkFilters();
                    break;

                // Requirement management actions
                case 'edit-requirement-mgmt':
                    const editReqUuid = target.dataset.reqUuid;
                    if (editReqUuid) this.editRequirement(editReqUuid);
                    break;

                case 'delete-requirement-mgmt':
                    const deleteReqUuid = target.dataset.reqUuid;
                    if (deleteReqUuid) this.deleteRequirement(deleteReqUuid);
                    break;

                case 'set-detail-mode':
                    const mode = target.dataset.mode;
                    if (mode) {
                        this.setRequirementDetailMode(mode);
                    }
                    break;

                case 'toggle-evidence': {
                    const evidenceReqId = target.dataset.requirementId || this.currentRequirementId;
                    const evidenceKey = target.dataset.evidenceKey;
                    if (evidenceReqId && evidenceKey != null && typeof target.checked === 'boolean') {
                        this.setRequirementEvidenceItem(evidenceReqId, evidenceKey, target.checked);
                    }
                    break;
                }

                case 'save-evidence-record': {
                    const saveEvidenceReqId = target.dataset.requirementId;
                    if (!saveEvidenceReqId) break;
                    const form = document.getElementById(`evidenceAddForm-${saveEvidenceReqId}`);
                    const typeEl  = form?.querySelector('.evidence-form-type');
                    const noteEl  = form?.querySelector('.evidence-form-note');
                    const urlEl   = form?.querySelector('.evidence-form-url');
                    const note = noteEl?.value?.trim() || '';
                    const url  = urlEl?.value?.trim()  || '';
                    if (!note && !url) {
                        this.showNotification('Please add a note or URL before saving.', 'warning');
                        break;
                    }
                    this.addEvidenceRecord(saveEvidenceReqId, {
                        type: typeEl?.value || 'other',
                        note,
                        url
                    });
                    this.showRequirementDetails(saveEvidenceReqId);
                    break;
                }

                case 'remove-evidence-record': {
                    const removeEvidenceId  = target.dataset.evidenceId;
                    const removeEvidenceReqId = target.dataset.requirementId;
                    if (removeEvidenceId) {
                        this.removeEvidenceRecord(removeEvidenceId);
                        if (removeEvidenceReqId) this.showRequirementDetails(removeEvidenceReqId);
                    }
                    break;
                }

                case 'mark-compliance-reviewed': {
                    const reviewedReqId = target.dataset.requirementId;
                    if (reviewedReqId) {
                        this.reviewCompliance(reviewedReqId, '');
                    }
                    break;
                }

                // Work view sub-nav
                case 'switch-work-tab': {
                    const tab = target.dataset.tab;
                    if (tab) this.switchWorkTab(tab);
                    break;
                }

                // Direction actions
                case 'edit-direction': {
                    const editDirId = target.dataset.directionId;
                    if (editDirId) this.showDirectionModal(editDirId);
                    break;
                }

                case 'delete-direction': {
                    const delDirId = target.dataset.directionId;
                    if (delDirId) this.deleteDirection(delDirId);
                    break;
                }

                // Action actions
                case 'edit-action': {
                    const editActId = target.dataset.actionId;
                    if (editActId) this.showActionModal(editActId);
                    break;
                }

                case 'delete-action': {
                    const delActId = target.dataset.actionId;
                    if (delActId) this.deleteAction(delActId);
                    break;
                }

                // Requirement linkage
                case 'add-requirement-link': {
                    const linkReqId2 = target.dataset.requirementId;
                    const targetType = target.dataset.targetType;
                    const selectId = target.dataset.selectId;
                    if (!linkReqId2 || !targetType || !selectId) break;
                    const sel = document.getElementById(selectId);
                    const targetId = sel?.value;
                    if (!targetId) { this.showNotification('Select an item to link first.', 'warning'); break; }
                    const added = this.addRelationship('requirement', linkReqId2, targetType, targetId, 'addresses');
                    if (added) {
                        this.showRequirementDetails(linkReqId2);
                    } else {
                        this.showNotification('This link already exists.', 'warning');
                    }
                    break;
                }

                case 'remove-requirement-link': {
                    const relId = target.dataset.relId;
                    const relReqId = target.dataset.requirementId;
                    if (relId) {
                        this.removeRelationship(relId);
                        if (relReqId) this.showRequirementDetails(relReqId);
                    }
                    break;
                }

                case 'reset-analytics': {
                    this.resetAnalyticsData();
                    this.renderAnalyticsPanel();
                    this.showNotification('Usage counters have been reset.', 'success');
                    break;
                }

                default:
                    console.warn(`Unknown delegated action: ${action}`);
            }
        }

        showWelcomeModalIfFirstTime() {
            if (!this.storageAvailable || typeof document === 'undefined') {
                return;
            }
            const skipWelcome = localStorage.getItem(WELCOME_SKIP_KEY) === 'true';
            if (skipWelcome) {
                return;
            }

            const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
            if (!hasSeenWelcome) {
                this.showWelcomeModal();
            }
        }

        showWelcomeModal() {
            if (typeof document === 'undefined') {
                return;
            }
            const modal = document.getElementById('welcomeModal');
            if (modal) {
                const skipCheckbox = document.getElementById('welcomeSkip');
                if (skipCheckbox && this.storageAvailable) {
                    const savedSkipValue = localStorage.getItem(WELCOME_SKIP_KEY);
                    skipCheckbox.checked = savedSkipValue !== 'false';
                }
                this.openModal(modal, { initialFocusSelector: '#closeWelcome', closeOnBackdrop: false });
            }
        }

        hideWelcomeModal() {
            if (typeof document === 'undefined') {
                return;
            }
            const modal = document.getElementById('welcomeModal');
            if (modal) {
                this.closeModal(modal);
                if (this.storageAvailable) {
                    const skipCheckbox = document.getElementById('welcomeSkip');
                    const shouldSkip = !!skipCheckbox?.checked;

                    if (shouldSkip) {
                        localStorage.setItem(WELCOME_SKIP_KEY, 'true');
                        localStorage.setItem(WELCOME_SEEN_KEY, 'true');
                    } else {
                        localStorage.removeItem(WELCOME_SKIP_KEY);
                        localStorage.removeItem(WELCOME_SEEN_KEY);
                    }
                }
            }
        }

        showView(viewName) {
            // Hide all views
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
            });

            // Show selected view
            const targetView = document.getElementById(viewName + 'View');
            if (targetView) {
                targetView.classList.add('active');
                this.currentView = viewName;
                this.trackEvent('view:' + viewName);
            }

            // Special handling for home view
            if (viewName === 'home') {
                // Show welcome dashboard and hide requirements section
                const welcomeDashboard = document.getElementById('welcomeDashboard');
                const requirementsSection = document.getElementById('requirementsSection');
                
                if (welcomeDashboard) welcomeDashboard.style.display = 'block';
                if (requirementsSection) {
                    requirementsSection.classList.add('hidden');
                    requirementsSection.style.display = 'none';
                }
                
                this.renderHome();
                this.setDomainGridCollapsed(false);
            }

            // Special handling for project view
            if (viewName === 'project') {
                this.renderProjects();
            }

            // Special handling for data view
            if (viewName === 'data') {
                this.renderTagManagement();
                this.updateMobileCapabilityNotice();
            }

            if (viewName === 'myWork') {
                this.renderMyWorkView();
            }

            if (viewName === 'map') {
                this.renderRelationshipMap();
            }
        }

        updateNavButtons(activeId) {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.removeAttribute('aria-current');
            });

            const activeBtn = document.getElementById(activeId);
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.setAttribute('aria-current', 'page');
            }
        }

        renderHome() {
            this.renderDomainsGrid();
            this.renderDomainSummary();
            this.updateDashboardStats();
            this.updateStats();
            this.updateDomainGridVisibility();
            this.updateTagFiltersVisibility();
        }

        toggleDomainGrid() {
            this.setDomainGridCollapsed(!this.isDomainGridCollapsed);
        }

        setDomainGridCollapsed(collapsed) {
            this.isDomainGridCollapsed = !!collapsed;
            this.updateDomainGridVisibility();
        }

        updateDomainGridVisibility() {
            if (typeof document === 'undefined') {
                return;
            }

            const section = document.getElementById('domainsGridSection');
            const toggleBtn = document.getElementById('toggleDomainsGridBtn');
            const domainsGrid = document.getElementById('domainsGrid');

            const isCollapsed = !!this.isDomainGridCollapsed;

            if (section) {
                section.classList.toggle('collapsed', isCollapsed);
            }

            if (domainsGrid) {
                domainsGrid.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
            }

            if (toggleBtn) {
                toggleBtn.textContent = isCollapsed ? 'Show domain cards' : 'Hide domain cards';
                toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
        }

        toggleTagFilters() {
            this.setTagFiltersCollapsed(!this.isTagFiltersCollapsed);
        }

        setTagFiltersCollapsed(collapsed) {
            this.isTagFiltersCollapsed = !!collapsed;
            this.updateTagFiltersVisibility();
        }

        updateTagFiltersVisibility() {
            if (typeof document === 'undefined') {
                return;
            }

            const container = document.getElementById('tagFiltersContainer');
            const body = document.getElementById('tagFiltersBody');
            const toggleBtn = document.getElementById('toggleTagFiltersBtn');
            const collapsedMsg = document.getElementById('tagFiltersCollapsedMessage');
            const isCollapsed = !!this.isTagFiltersCollapsed;

            if (container) {
                container.classList.toggle('collapsed', isCollapsed);
            }

            if (body) {
                body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
            }

            if (collapsedMsg) {
                collapsedMsg.setAttribute('aria-hidden', isCollapsed ? 'false' : 'true');
            }

            if (toggleBtn) {
                toggleBtn.textContent = isCollapsed ? 'Show filters' : 'Hide filters';
                toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
        }

        renderDomainsGrid() {
            const domainsGrid = document.getElementById('domainsGrid');
            if (!domainsGrid) return;

            domainsGrid.innerHTML = this.domains.map(domain => {
                const health = this.calculateDomainHealth(domain.id);
                const healthClass = health.status;
                const homeTitle = domain.id === 'governance' ? 'Security Governance' : domain.title;
                
                return `
                    <div class="domain-card ${healthClass}" data-domain="${domain.id}">
                        <div class="domain-header">
                            <h3>${homeTitle}</h3>
                        </div>
                        <div class="domain-stats">
                            <span class="health-text">${health.text}</span>
                        </div>
                        <button class="btn btn-outline domain-btn" data-action="view-domain" data-domain-id="${domain.id}">
                            View Requirements
                        </button>
                        <div class="pulse-indicator">
                            <div class="pulse-dot ${healthClass}"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderDomainSummary() {
            const summaryGrid = document.getElementById('domainSummaryGrid');
            if (!summaryGrid) return;

            summaryGrid.innerHTML = this.domains.map(domain => {
                const health = this.calculateDomainHealth(domain.id);
                const requirementCount = domain.requirements.length;
                
                return `
                    <div class="domain-summary-card" data-action="view-domain" data-domain-id="${domain.id}" tabindex="0" role="button">
                        <div class="domain-summary-title">
                            <span>${domain.title}</span>
                            <div class="pulse-dot ${health.status}" style="width: 8px; height: 8px;"></div>
                        </div>
                        <div class="domain-summary-count">${requirementCount} requirements</div>
                        <div class="domain-summary-desc">${domain.description}</div>
                    </div>
                `;
            }).join('');
        }

        renderDomainRequirementHeatmap() {
            const heatmapGrid = document.getElementById('domainRequirementsGrid');
            if (!heatmapGrid) return;

            heatmapGrid.innerHTML = this.domains.map(domain => {
                const health = this.calculateDomainHealth(domain.id);
                const requirementIds = Array.isArray(domain.requirements) ? domain.requirements : [];
                const totalRequirements = requirementIds.length;
                const requirementTiles = requirementIds.map(reqId => {
                    const status = this.compliance[reqId]?.status || 'not-set';
                    const label = `${reqId}: ${this.getStatusText(status)}`;
                    return `<span class="requirement-chip ${status}" title="${label}" aria-label="${label}"></span>`;
                }).join('');

                return `
                    <article class="domain-requirements-card ${health.status}">
                        <header class="domain-card-header">
                            <div>
                                <h4>${domain.title}</h4>
                                <p>${Math.min(health.met, totalRequirements)}/${totalRequirements} requirements · ${health.text}</p>
                            </div>
                        </header>
                        <div class="requirement-chip-grid">
                            ${requirementTiles}
                        </div>
                    </article>
                `;
            }).join('');
        }

        renderGapReport() {
            if (typeof document === 'undefined') {
                return;
            }

            const select = document.getElementById('gapReportDomainSelect');
            const summary = document.getElementById('gapReportSummary');
            const list = document.getElementById('gapReportList');
            const exportBtn = document.getElementById('gapReportExportBtn');

            if (!select || !summary || !list) {
                return;
            }

            if (!Array.isArray(this.domains) || this.domains.length === 0) {
                summary.innerHTML = '<p class="history-empty-msg">No domains available.</p>';
                list.innerHTML = '';
                return;
            }

            const previousValue = select.value;
            select.innerHTML = this.domains.map(domain => `
                <option value="${this.escapeHtml(domain.id)}">${this.escapeHtml(domain.title)}</option>
            `).join('');

            const preferred = this.gapReportPreferredDomainId;
            let selectedDomainId = '';

            if (preferred && this.domains.some(domain => domain.id === preferred)) {
                selectedDomainId = preferred;
            } else if (previousValue && this.domains.some(domain => domain.id === previousValue)) {
                selectedDomainId = previousValue;
            } else if (this.selectedDomain && this.domains.some(domain => domain.id === this.selectedDomain)) {
                selectedDomainId = this.selectedDomain;
            } else {
                selectedDomainId = this.domains[0]?.id || '';
            }

            if (selectedDomainId) {
                select.value = selectedDomainId;
            }
            this.gapReportPreferredDomainId = selectedDomainId || null;

            if (!select.dataset.listenerAdded) {
                select.addEventListener('change', (event) => {
                    const chosenDomainId = event.target.value;
                    this.gapReportPreferredDomainId = chosenDomainId || null;
                    this.updateGapReportList(chosenDomainId);
                });
                select.dataset.listenerAdded = 'true';
            }

            if (exportBtn && !exportBtn.dataset.listenerAdded) {
                exportBtn.addEventListener('click', () => {
                    this.exportGapReport(select.value);
                });
                exportBtn.dataset.listenerAdded = 'true';
            }

            const domainToRender = selectedDomainId || select.value;
            if (domainToRender) {
                this.updateGapReportList(domainToRender);
            }
        }

        syncGapReportSelection(domainId, { updateList = false } = {}) {
            this.gapReportPreferredDomainId = domainId || null;
            if (typeof document === 'undefined') {
                return;
            }

            const select = document.getElementById('gapReportDomainSelect');
            if (select) {
                select.value = domainId || '';
            }

            if (updateList && domainId) {
                this.updateGapReportList(domainId);
            }
        }

        updateGapReportList(domainId) {
            const summaryEl = document.getElementById('gapReportSummary');
            const listEl = document.getElementById('gapReportList');
            if (!summaryEl || !listEl) {
                return;
            }

            if (domainId) {
                this.gapReportPreferredDomainId = domainId;
            }

            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) {
                summaryEl.innerHTML = '';
                listEl.innerHTML = '<p class="history-empty-msg">Select a domain to view outstanding requirements.</p>';
                return;
            }

            const outstanding = this.getOutstandingRequirements(domainId);

            if (!outstanding.length) {
                summaryEl.innerHTML = `<span class="gap-summary-total">${this.escapeHtml(domain.title)} is fully compliant</span>`;
                listEl.innerHTML = `<p class="history-empty-msg">No outstanding requirements for ${this.escapeHtml(domain.title)}.</p>`;
                return;
            }

            const statusOrder = ['no', 'partial', 'not-set'];
            const counts = { no: 0, partial: 0, 'not-set': 0 };
            outstanding.forEach(item => {
                const key = statusOrder.includes(item.status) ? item.status : 'not-set';
                counts[key] = (counts[key] || 0) + 1;
            });

            const chips = statusOrder
                .filter(key => counts[key] > 0)
                .map(key => `<span class="gap-summary-chip ${key}"><span>${counts[key]}</span>${this.getStatusText(key)}</span>`)
                .join('');

            summaryEl.innerHTML = `
                <span class="gap-summary-total">${outstanding.length} requirement${outstanding.length === 1 ? '' : 's'} need action</span>
                ${chips}
            `;

            const truncate = (text, limit = 260) => {
                if (!text) return '';
                return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
            };

            listEl.innerHTML = outstanding.map(item => {
                const description = item.description
                    ? this.escapeHtml(truncate(item.description))
                    : 'No description available.';
                const commentSnippet = item.comment
                    ? `<span>📝 ${this.escapeHtml(truncate(item.comment, 140))}</span>`
                    : '';
                const evidenceSnippet = item.url
                    ? '<span>🔗 Evidence link attached</span>'
                    : '';
                const meta = [commentSnippet, evidenceSnippet].filter(Boolean).join('');

                return `
                    <article class="gap-report-item">
                        <div class="gap-report-item-header">
                            <div>
                                <span class="requirement-code">${this.escapeHtml(item.id)}</span>
                                <h4>${this.escapeHtml(item.title)}</h4>
                            </div>
                            <span class="requirement-status ${item.status}">${this.getStatusText(item.status)}</span>
                        </div>
                        <p>${description}</p>
                        ${meta ? `<div class="gap-report-item-meta">${meta}</div>` : ''}
                        <button class="btn btn-link btn-small" data-action="view-requirement" data-requirement-id="${this.escapeHtml(item.id)}">Open requirement</button>
                    </article>
                `;
            }).join('');
        }

        getOutstandingRequirements(domainId) {
            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) {
                return [];
            }

            const requirementIds = Array.isArray(domain.requirements) ? domain.requirements : [];
            const severityOrder = { no: 0, partial: 1, 'not-set': 2 };

            return requirementIds.map(reqId => {
                const requirement = this.requirements[reqId] || { id: reqId };
                const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
                const normalizedStatus = ['yes', 'no', 'partial', 'na', 'not-set'].includes(compliance.status)
                    ? compliance.status
                    : 'not-set';

                return {
                    id: reqId,
                    title: requirement.title || reqId,
                    description: requirement.description || '',
                    domainId: requirement.domainId,
                    status: normalizedStatus,
                    comment: compliance.comment || '',
                    url: compliance.url || ''
                };
            }).filter(item => item && !['yes', 'na'].includes(item.status))
                .sort((a, b) => {
                    const orderDiff = (severityOrder[a.status] ?? 99) - (severityOrder[b.status] ?? 99);
                    if (orderDiff !== 0) {
                        return orderDiff;
                    }
                    return a.id.localeCompare(b.id);
                });
        }

        exportGapReport(domainId) {
            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) {
                this.showNotification('Select a domain before exporting the report.', 'warning');
                return;
            }

            const outstanding = this.getOutstandingRequirements(domainId);
            if (!outstanding.length) {
                this.showNotification(`${domain.title} is fully compliant. Nothing to export.`, 'info');
                return;
            }

            const byStatus = outstanding.reduce((acc, item) => {
                const key = item.status || 'not-set';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});

            const requirementDetails = this.buildRequirementExportDetails(outstanding.map(item => item.id));

            const payload = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                scope: {
                    type: 'domain-gap-report',
                    domain: {
                        id: domain.id,
                        title: domain.title
                    }
                },
                summary: {
                    outstanding: outstanding.length,
                    byStatus
                },
                data: {
                    requirements: requirementDetails
                }
            };

            this.downloadJsonFile(payload, `pspf-gap-${domain.id}`);
            this.showNotification(`${domain.title} remediation report exported`, 'success');
        }

        renderUnassignedWidget() {
            if (typeof document === 'undefined') {
                return;
            }

            const widget = document.getElementById('unassignedWidget');
            const listEl = document.getElementById('unassignedList');
            const countEl = document.getElementById('unassignedCount');
            if (!widget || !listEl || !countEl) {
                return;
            }

            const unassigned = this.getUnassignedRequirements();
            countEl.textContent = `${unassigned.length} gap${unassigned.length === 1 ? '' : 's'}`;

            if (!unassigned.length) {
                listEl.innerHTML = '<p class="history-empty-msg">All unmet requirements are already mapped to projects. Great work!</p>';
                return;
            }

            const truncate = (text, limit = 220) => {
                if (!text) return '';
                return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
            };

            listEl.innerHTML = unassigned.map(item => {
                const description = item.description ? this.escapeHtml(truncate(item.description)) : 'No description available yet.';
                const commentSnippet = item.comment ? `<span>📝 ${this.escapeHtml(truncate(item.comment, 140))}</span>` : '';
                const domainLabel = item.domainTitle ? `<span>📁 ${this.escapeHtml(item.domainTitle)}</span>` : '';
                const meta = [domainLabel, commentSnippet].filter(Boolean).join('');

                return `
                    <article class="unassigned-card">
                        <div>
                            <span class="requirement-code">${this.escapeHtml(item.id)}</span>
                            <h4>${this.escapeHtml(item.title)}</h4>
                        </div>
                        <p>${description}</p>
                        ${meta ? `<div class="unassigned-card-meta">${meta}</div>` : ''}
                        <div class="requirement-actions">
                            <button class="btn btn-link btn-small" data-action="view-requirement" data-requirement-id="${this.escapeHtml(item.id)}">Review requirement</button>
                        </div>
                    </article>
                `;
            }).join('');
        }

        getUnassignedRequirements() {
            const assignedRequirementIds = new Set();
            this.projects.forEach(project => {
                const reqs = Array.isArray(project.requirements) ? project.requirements : [];
                reqs.forEach(reqId => assignedRequirementIds.add(reqId));
            });

            const domainOrder = this.domains.reduce((acc, domain, index) => {
                acc[domain.id] = index;
                return acc;
            }, {});

            return Object.keys(this.requirements).map(reqId => {
                const requirement = this.requirements[reqId] || { id: reqId };
                const compliance = this.compliance[reqId] || { status: 'not-set', comment: '' };
                const status = ['yes', 'no', 'partial', 'na', 'not-set'].includes(compliance.status) ? compliance.status : 'not-set';
                const domain = this.domains.find(d => d.id === requirement.domainId);

                return {
                    id: reqId,
                    title: requirement.title || reqId,
                    description: requirement.description || '',
                    domainId: requirement.domainId,
                    domainTitle: domain?.title || '',
                    domainIndex: domainOrder[requirement.domainId] ?? 999,
                    status,
                    comment: compliance.comment || ''
                };
            }).filter(item => item.status === 'no' && !assignedRequirementIds.has(item.id))
                .sort((a, b) => {
                    if (a.domainIndex !== b.domainIndex) {
                        return a.domainIndex - b.domainIndex;
                    }
                    return a.id.localeCompare(b.id);
                });
        }

        updateDashboardStats() {
            const totalRequirements = this.domains.reduce((sum, domain) => sum + domain.requirements.length, 0);
            const totalProjects = this.projects.length;
            const completedRequirements = this.getCompletedRequirementsCount();
            const complianceRate = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;

            const totalReqEl = document.getElementById('totalRequirements');
            const totalDomainsEl = document.getElementById('totalDomains');
            const totalProjectsEl = document.getElementById('totalProjectsDashboard');
            const complianceRateEl = document.getElementById('complianceRate');

            if (totalReqEl) totalReqEl.textContent = totalRequirements;
            if (totalDomainsEl) totalDomainsEl.textContent = this.domains.length;
            if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
            if (complianceRateEl) complianceRateEl.textContent = `${complianceRate}%`;
        }

        getCompletedRequirementsCount() {
            // Count requirements that are compliant or not applicable
            let completedCount = 0;
            this.domains.forEach(domain => {
                domain.requirements.forEach(reqId => {
                    const compliance = this.compliance[reqId];
                    if (compliance && (compliance.status === 'yes' || compliance.status === 'na')) {
                        completedCount++;
                    }
                });
            });
            return completedCount;
        }

        showDomainRequirements(domainId) {
            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) return;

            this.selectedDomain = domainId;

            // Hide welcome dashboard and show requirements section
            const welcomeDashboard = document.getElementById('welcomeDashboard');
            const requirementsSection = document.getElementById('requirementsSection');
            
            if (welcomeDashboard) welcomeDashboard.style.display = 'none';
            if (requirementsSection) {
                requirementsSection.classList.remove('hidden');
                requirementsSection.style.display = 'block';
            }
            
            const selectedDomainTitle = document.getElementById('selectedDomainTitle');
            const selectedDomainDescription = document.getElementById('selectedDomainDescription');
            if (selectedDomainTitle) selectedDomainTitle.textContent = domain.title + ' Requirements';
            if (selectedDomainDescription) selectedDomainDescription.textContent = domain.description;

            this.renderRequirementsList();
            this.updateTagFiltersVisibility();

            if (requirementsSection) {
                requirementsSection.classList.remove('hidden');
            }
            
            // Clear the details panel
            this.clearRequirementDetails();
        }

        // Tag System Methods
        populateTagFilters() {
            const container = document.getElementById('tagFilters');
            if (!container) return;
            
            container.innerHTML = '';
            
            Object.keys(this.tagDefinitions).forEach(tagId => {
                const tag = this.tagDefinitions[tagId];
                const isActive = this.activeTagFilters.has(tagId);
                
                const tagElement = document.createElement('div');
                tagElement.className = `tag-option ${isActive ? 'selected' : ''}`;
                tagElement.style.backgroundColor = isActive ? tag.color : '';
                tagElement.style.borderColor = tag.color;
                tagElement.textContent = tag.name;
                tagElement.title = tag.description;
                tagElement.onclick = () => this.toggleTagFilter(tagId);
                
                container.appendChild(tagElement);
            });
        }

        toggleTagFilter(tagId) {
            if (this.activeTagFilters.has(tagId)) {
                this.activeTagFilters.delete(tagId);
            } else {
                this.activeTagFilters.add(tagId);
            }
            this.renderRequirementsList();
        }

        clearTagFilters() {
            this.activeTagFilters.clear();
            this.renderRequirementsList();
        }

        toggleRequirementTag(requirementId, tagId) {
            if (!this.currentUserProfile) return;
            const currentTags = new Set(this.getUserRequirementTags(requirementId));
            if (currentTags.has(tagId)) {
                currentTags.delete(tagId);
            } else {
                currentTags.add(tagId);
            }

            this.setUserRequirementTags(requirementId, Array.from(currentTags));
            this.renderRequirementsList();
            if (this.currentView === 'myWork') {
                this.renderMyWorkView();
            }
            this.showRequirementDetails(requirementId);
        }

        getCurrentUserAssignmentMap() {
            if (!this.currentUserProfile) return {};
            if (!this.userTagAssignments[this.currentUserProfile.id]) {
                this.userTagAssignments[this.currentUserProfile.id] = {};
            }
            return this.userTagAssignments[this.currentUserProfile.id];
        }

        getUserRequirementTags(requirementId, userId = null) {
            const assignments = userId ? this.userTagAssignments[userId] || {} : this.getCurrentUserAssignmentMap();
            return (assignments[requirementId] || []).slice();
        }

        setUserRequirementTags(requirementId, tags = []) {
            if (!this.currentUserProfile) return;
            const userMap = this.getCurrentUserAssignmentMap();
            if (!tags.length) {
                delete userMap[requirementId];
            } else {
                userMap[requirementId] = [...tags];
            }
            this.saveUserTagAssignments();
        }

        saveRequirements() {
            if (!this.storageAvailable) {
                return;
            }
            // Save requirements to localStorage
            localStorage.setItem('pspf_requirements', JSON.stringify(this.requirements));
        }

        loadSavedRequirements() {
            if (!this.storageAvailable) return;
            const saved = localStorage.getItem('pspf_requirements');
            if (!saved) return;

            try {
                const savedRequirements = JSON.parse(saved);
                Object.keys(savedRequirements).forEach(reqId => {
                    const existing = this.requirements[reqId];
                    if (existing) {
                        this.requirements[reqId] = {
                            ...existing,
                            ...savedRequirements[reqId]
                        };
                    } else {
                        this.requirements[reqId] = savedRequirements[reqId];
                    }
                });
            } catch (error) {
                console.warn('Unable to load saved requirements:', error);
            }
        }

        renderTagsInDetails(requirementId) {
            const requirement = this.requirements[requirementId];
            if (!requirement) return '';
            const tags = this.getUserRequirementTags(requirementId);
            
            const tagOptions = Object.keys(this.tagDefinitions).map(tagId => {
                const tag = this.tagDefinitions[tagId];
                if (!tag) {
                    return '';
                }
                const isSelected = tags.includes(tagId);
                return `
                    <div class="tag-option ${isSelected ? 'selected' : ''}" 
                         style="background-color: ${isSelected ? tag.color : ''};border-color: ${tag.color}"
                         data-action="toggle-tag" data-requirement-id="${requirementId}" data-tag-id="${tagId}"
                         tabindex="0" role="button"
                         title="${tag.description}">
                        ${tag.name}
                    </div>
                `;
            }).join('');

            const appliedTags = tags.map(tagId => {
                const tag = this.tagDefinitions[tagId];
                if (!tag) {
                    return '';
                }
                return `<span class="tag" style="background-color: ${tag.color}">${tag.name}</span>`;
            }).join('');

            return `
                <div class="tag-manager">
                    <h5>Tags</h5>
                    <div class="tag-selector">
                        ${tagOptions}
                    </div>
                    <div class="tags-display">
                        ${appliedTags || '<span class="tag-empty">No tags assigned yet.</span>'}
                    </div>
                </div>
            `;
        }

        setRequirementDetailMode(mode) {
            if (!['summary', 'control'].includes(mode)) {
                return;
            }
            this.requirementDetailMode = mode;
            if (this.storageAvailable) {
                localStorage.setItem(REQUIREMENT_DETAIL_MODE_KEY, JSON.stringify(mode));
            }
            if (this.currentRequirementId) {
                this.showRequirementDetails(this.currentRequirementId);
            }
        }

        getRequirementNarrative(requirement) {
            if (!requirement) {
                return { summaryText: '', controlText: '' };
            }
            const description = requirement.description || '';
            const summaryText = requirement.summary || description;
            const controlText = requirement.controlText || requirement.pspfText || description;
            return { summaryText, controlText };
        }

        getRequirementNextActions(reqId) {
            const requirement = this.requirements[reqId];
            if (!requirement) return [];
            const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
            const tags = this.getUserRequirementTags(reqId);
            const evidenceRecords = this.getEvidenceForRequirement(reqId);
            const actions = [];
            const status = compliance.status || 'not-set';

            if (status === 'not-set') {
                actions.push({ icon: '🧭', text: 'Set an initial compliance status so trend tracking can begin.' });
            }
            if (status === 'no') {
                actions.push({ icon: '🚨', text: 'Log a remediation project or risk treatment plan for this gap.' });
            }
            if (status === 'partial') {
                actions.push({ icon: '⚙️', text: 'Capture residual risk details and map supporting projects.' });
            }
            if (!evidenceRecords.length && !compliance.url) {
                actions.push({ icon: '🔗', text: 'Add at least one evidence record to support audit readiness.' });
            }
            if (!compliance.comment) {
                actions.push({ icon: '📝', text: 'Add implementation notes or context for future reviewers.' });
            }
            if (!tags.length) {
                actions.push({ icon: '🏷️', text: 'Assign a priority tag or owner so accountability is clear.' });
            }
            if (compliance.lastReviewedAt) {
                const daysSinceReview = (Date.now() - new Date(compliance.lastReviewedAt).getTime()) / 86400000;
                if (daysSinceReview > 365) {
                    actions.push({ icon: '📅', text: 'Compliance was last reviewed over a year ago — schedule a re-review.' });
                }
            } else if (status !== 'not-set') {
                actions.push({ icon: '📅', text: 'Mark this requirement as reviewed to record when it was last checked.' });
            }

            return actions;
        }

        getRequirementEvidenceState(reqId) {
            const compliance = this.ensureComplianceEntry(reqId);
            if (!compliance.evidenceChecklist || typeof compliance.evidenceChecklist !== 'object') {
                compliance.evidenceChecklist = {};
            }
            EVIDENCE_CHECKLIST_ITEMS.forEach(item => {
                if (typeof compliance.evidenceChecklist[item.key] !== 'boolean') {
                    compliance.evidenceChecklist[item.key] = false;
                }
            });
            return compliance.evidenceChecklist;
        }

        setRequirementEvidenceItem(reqId, key, value) {
            const compliance = this.ensureComplianceEntry(reqId);
            if (!compliance.evidenceChecklist || typeof compliance.evidenceChecklist !== 'object') {
                compliance.evidenceChecklist = {};
            }
            compliance.evidenceChecklist[key] = !!value;
            this.saveData();
            this.showRequirementDetails(reqId);
        }

        renderRequirementEvidenceChecklist(reqId) {
            const evidenceState = this.getRequirementEvidenceState(reqId);
            return `
                <div class="evidence-checklist">
                    <h5>Evidence checklist</h5>
                    <ul>
                        ${EVIDENCE_CHECKLIST_ITEMS.map(item => {
                            const checked = evidenceState[item.key];
                            return `
                                <li class="evidence-item">
                                    <label>
                                        <input type="checkbox" 
                                               ${checked ? 'checked' : ''}
                                               data-action="toggle-evidence" 
                                               data-requirement-id="${reqId}" 
                                               data-evidence-key="${item.key}">
                                        <span class="evidence-label">${item.icon} ${this.escapeHtml(item.label)}</span>
                                    </label>
                                    <p>${this.escapeHtml(item.description)}</p>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        renderRequirementListItem(reqId) {
            const requirement = this.requirements[reqId];
            if (!requirement) {
                console.warn(`Requirement ${reqId} not found in definitions`);
                return '';
            }
            const title = this.escapeHtml(requirement.title || '');
            const safeReqId = this.escapeHtml(reqId);

            return `
                <div class="requirement-item" data-req="${safeReqId}" data-action="view-requirement" data-requirement-id="${safeReqId}" tabindex="0" role="button" aria-label="${safeReqId} ${title}" title="${title}">
                    <div class="requirement-simple">
                        <span class="requirement-code">${safeReqId}</span>
                        <span class="requirement-title">${title}</span>
                    </div>
                </div>
            `;
        }

        showRequirementDetails(reqId) {
            const requirement = this.requirements[reqId];
            const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
            const requirementDetails = document.getElementById('requirementDetails');
            
            if (!requirement || !requirementDetails) return;
            this.currentRequirementId = reqId;

            // Update active state in sidebar (if the list is currently rendered)
            const sidebarItems = document.querySelectorAll('.requirement-item');
            if (sidebarItems.length) {
                sidebarItems.forEach(item => item.classList.remove('active'));
            }
            const activeSidebarItem = document.querySelector(`[data-req="${reqId}"]`);
            if (activeSidebarItem) {
                activeSidebarItem.classList.add('active');
                try {
                    activeSidebarItem.scrollIntoView({ block: 'nearest' });
                } catch {
                    // ignore
                }
            }

            // Get linked projects
            const linkedProjects = this.projects.filter(project => 
                Array.isArray(project.requirements) && project.requirements.includes(reqId)
            );

            const domain = this.domains.find(d => d.id === requirement.domainId);
            const detailMode = this.requirementDetailMode === 'control' ? 'control' : 'summary';
            const { summaryText, controlText } = this.getRequirementNarrative(requirement);
            const narrativeText = detailMode === 'control' ? controlText : summaryText;
            const narrativeLabel = detailMode === 'control' ? 'PSPF control wording' : 'Plain-language summary';
            const tags = this.getUserRequirementTags(reqId);
            const tagsMarkup = tags.length ? `
                <div class="detail-tag-row">
                    ${tags.map(tagId => {
                        const tag = this.tagDefinitions[tagId];
                        if (!tag) return '';
                        return `<span class="tag-pill" style="border-color:${tag.color};color:${tag.color}">${this.escapeHtml(tag.name)}</span>`;
                    }).join('')}
                </div>
            ` : '';

            const nextActions = this.getRequirementNextActions(reqId);
            const nextActionsMarkup = nextActions.length ? `
                <ul class="next-actions-list">
                    ${nextActions.map(action => `
                        <li>
                            <span class="action-icon">${action.icon}</span>
                            <span>${this.escapeHtml(action.text)}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : '<p class="empty-state-sm">All known follow-up tasks are captured. Great work!</p>';

            const detailToggle = `
                <div class="detail-mode-toggle" role="group" aria-label="Requirement wording toggle">
                    <button type="button" 
                            class="detail-mode-btn ${detailMode === 'summary' ? 'active' : ''}" 
                            data-action="set-detail-mode" 
                            data-mode="summary">
                        Plain summary
                    </button>
                    <button type="button" 
                            class="detail-mode-btn ${detailMode === 'control' ? 'active' : ''}" 
                            data-action="set-detail-mode" 
                            data-mode="control">
                        PSPF wording
                    </button>
                </div>
            `;

            requirementDetails.innerHTML = `
                <div class="requirement-detail-heading">
                    <div>
                        <h4>${this.escapeHtml(requirement.title || reqId)}</h4>
                        <p class="requirement-detail-subtitle">
                            ${domain ? this.escapeHtml(domain.title) : 'PSPF Requirement'} • ${reqId}
                        </p>
                    </div>
                </div>
                ${tagsMarkup}
                <div class="requirement-narrative">
                    <div class="narrative-header">
                        <h5>${narrativeLabel}</h5>
                        ${detailToggle}
                    </div>
                    <p>${this.escapeHtml(narrativeText || 'No description available yet.')}</p>
                </div>

                <div class="compliance-status-picker" role="group" aria-label="Compliance status">
                    <h5>Compliance Status</h5>
                    <div class="compliance-status-buttons">
                        ${[
                            { id: 'not-set', label: 'Not Set' },
                            { id: 'yes', label: 'Met' },
                            { id: 'no', label: 'Not Met' },
                            { id: 'partial', label: 'Risk Managed' },
                            { id: 'na', label: 'N/A' }
                        ].map(statusOption => {
                            const isActive = compliance.status === statusOption.id;
                            return `
                                <button type="button"
                                        class="compliance-status-button ${isActive ? 'active' : ''} status-${statusOption.id}"
                                        data-status="${statusOption.id}"
                                        aria-pressed="${isActive}"
                                        onclick="window.pspfExplorer.updateCompliance('${reqId}', '${statusOption.id}')">
                                    ${statusOption.label}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="requirement-insights">
                    <div class="insight-card">
                        <div class="insight-card-header">
                            <h5>Next steps</h5>
                        </div>
                        ${nextActionsMarkup}
                    </div>
                    <div class="insight-card">
                        ${this.renderRequirementEvidenceChecklist(reqId)}
                    </div>
                </div>
                ${compliance.url ? `
                    <div class="requirement-url-section">
                        <h5>📎 Reference Link</h5>
                        <div class="url-display">
                            <a href="${compliance.url}" target="_blank" rel="noopener noreferrer" class="requirement-link">
                                ${compliance.url}
                                <span class="external-icon">↗</span>
                            </a>
                        </div>
                    </div>
                ` : ''}

                <div class="compliance-controls">
                    <h5>Reference URL</h5>
                    <input type="url" class="compliance-url" data-req="${reqId}" 
                           placeholder="https://example.com/policy-document" 
                           value="${compliance.url || ''}" 
                           onblur="window.pspfExplorer.updateComplianceUrl('${reqId}', this.value)">
                    <small class="field-help">📎 Link to relevant documentation, policies, or evidence</small>
                    
                    <h5>Comments</h5>
                    <textarea class="compliance-comment" data-req="${reqId}" placeholder="Add implementation notes, evidence, or comments..." onblur="window.pspfExplorer.updateComplianceComment('${reqId}', this.value)">${compliance.comment}</textarea>
                </div>

                ${this.renderEvidenceRecordsPanel(reqId)}

                <div class="compliance-review-section">
                    <h5>Compliance review</h5>
                    ${compliance.lastReviewedAt
                        ? `<p class="review-date">Last reviewed: <time datetime="${this.escapeHtml(compliance.lastReviewedAt)}">${new Date(compliance.lastReviewedAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}</time>${compliance.lastReviewedNotes ? ` — ${this.escapeHtml(compliance.lastReviewedNotes)}` : ''}</p>`
                        : '<p class="review-date review-date-none">Not yet reviewed.</p>'
                    }
                    <button class="btn btn-outline btn-small"
                            data-action="mark-compliance-reviewed"
                            data-requirement-id="${this.escapeHtml(reqId)}">
                        Mark as reviewed now
                    </button>
                </div>

                    <div class="requirement-history">
                        <h5>Progress Timeline</h5>
                        ${this.renderRequirementProgressHistory(reqId)}
                    </div>
                
                <div class="linked-projects-section">
                    <h5>Linked Projects</h5>
                    <div class="linked-projects-list" id="linkedProjectsList-${reqId}">
                        ${linkedProjects.length > 0 ? 
                            linkedProjects.map(project => `
                                <div class="linked-project-item">
                                    <span class="project-name">${project.name}</span>
                                    <span class="project-status status-${project.status}">${this.getStatusText(project.status)}</span>
                                    <button class="btn-link btn-small" data-action="unlink-project" data-project-id="${project.id}" data-requirement-id="${reqId}">
                                        ✕ Unlink
                                    </button>
                                </div>
                            `).join('') : 
                            '<p class="no-projects">No projects linked to this requirement.</p>'
                        }
                    </div>
                    <button class="btn btn-primary btn-small" data-action="link-project" data-requirement-id="${reqId}">
                        + Link Project
                    </button>
                </div>
                ${this.renderTagsInDetails(reqId)}
                ${this.renderRequirementLinksSection(reqId)}
            `;
        }

        clearRequirementDetails() {
            const requirementDetails = document.getElementById('requirementDetails');
            if (requirementDetails) {
                requirementDetails.innerHTML = `
                    <div class="placeholder-content">
                        <h4>Select a Requirement</h4>
                        <p>Choose a requirement from the list to view its details and compliance status.</p>
                    </div>
                `;
            }
        }

        showLinkProjectModal(reqId) {
            const availableProjects = this.projects.filter(project => 
                !Array.isArray(project.requirements) || !project.requirements.includes(reqId)
            );

            if (availableProjects.length === 0) {
                this.showNotification('No available projects to link. Create a project first.', 'warning');
                return;
            }

            const modalContent = `
                <div class="modal-content">
                    <h3>Link Project to Requirement</h3>
                    <div class="form-group">
                        <label for="projectSelect">Select Project:</label>
                        <select id="projectSelect" class="form-control">
                            <option value="">Choose a project...</option>
                            ${availableProjects.map(project => `
                                <option value="${project.id}">${this.escapeHtml(project.name)} (${this.getStatusText(project.status)})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="modal-buttons">
                        <button class="btn btn-secondary" id="cancelLinkBtn">Cancel</button>
                        <button class="btn btn-primary" id="confirmLinkBtn">Link Project</button>
                    </div>
                </div>
            `;

            const modal = this.createModal(modalContent);
            
            // Attach tracked event listeners for proper cleanup
            modal.addTrackedListener(modal.querySelector('#cancelLinkBtn'), 'click', () => modal.remove());
            modal.addTrackedListener(modal.querySelector('#confirmLinkBtn'), 'click', () => {
                const projectId = document.getElementById('projectSelect').value;
                this.linkProjectToRequirement(projectId, reqId);
                modal.remove();
            });
        }

        linkProjectToRequirement(projectId, reqId) {
            if (!projectId || !reqId) return;

            const project = this.projects.find(p => p.id === projectId);
            if (!project) return;

            // Initialize requirements array if it doesn't exist
            if (!Array.isArray(project.requirements)) {
                project.requirements = [];
            }

            // Add requirement if not already linked
            if (!project.requirements.includes(reqId)) {
                project.requirements.push(reqId);
                this.saveData();
                
                // Refresh the requirement details to show the new link
                this.showRequirementDetails(reqId);
                
                // Also refresh project view if it's open
                if (this.currentProjectId === projectId) {
                    this.showProjectDetails(projectId);
                }
                this.renderProjectRequirementWidget();
            }
        }

        unlinkProjectFromRequirement(projectId, reqId) {
            const project = this.projects.find(p => p.id === projectId);
            if (!project || !Array.isArray(project.requirements)) return;

            // Remove requirement from project
            project.requirements = project.requirements.filter(r => r !== reqId);
            this.saveData();
            
            // Refresh the requirement details to show the change
            this.showRequirementDetails(reqId);
            
            // Also refresh project view if it's open
            if (this.currentProjectId === projectId) {
                this.showProjectDetails(projectId);
            }
        }

        getStatusText(status) {
            switch(status) {
                case 'yes': return 'Met';
                case 'no': return 'Not Met';
                case 'partial': return 'Risk Managed';
                case 'na': return 'N/A';
                default: return 'Not Set';
            }
        }

        updateCompliance(reqId, status) {
            const compliance = this.ensureComplianceEntry(reqId);
            const previousStatus = compliance.status;
            compliance.status = status;
            if (previousStatus !== status) {
                this.recordComplianceHistory(reqId, status);
                this.trackEvent('compliance:update');
                const domainId = this.requirements[reqId]?.domainId;
                if (domainId) {
                    this.recordDomainSnapshot(domainId);
                }
            }
            this.saveData();
            this.renderDomainsGrid();
            this.updateStats();

            // Refresh detail panel in case it is open so the new button state is visible
            this.showRequirementDetails(reqId);

            // Update the sidebar item status
            const sidebarItem = document.querySelector(`[data-req="${reqId}"] .requirement-status`);
            if (sidebarItem) {
                sidebarItem.className = `requirement-status ${status}`;
                sidebarItem.textContent = this.getStatusText(status);
            }
        }

        ensureComplianceEntry(reqId) {
            if (!this.compliance[reqId]) {
                this.compliance[reqId] = { status: 'not-set', comment: '', url: '', history: [] };
            }
            if (!Array.isArray(this.compliance[reqId].history)) {
                this.compliance[reqId].history = [];
            }
            return this.compliance[reqId];
        }

        recordComplianceHistory(reqId, status) {
            const requirement = this.requirements[reqId];
            if (!requirement) return;
            const compliance = this.ensureComplianceEntry(reqId);
            const lastEntry = compliance.history[compliance.history.length - 1];
            if (lastEntry && lastEntry.status === status) {
                return;
            }
            compliance.history.push({
                status,
                timestamp: new Date().toISOString(),
                domainId: requirement.domainId
            });
        }

        updateComplianceComment(reqId, comment) {
            const compliance = this.ensureComplianceEntry(reqId);
            compliance.comment = comment;
            this.saveData();
        }

        updateComplianceUrl(reqId, url) {
            const compliance = this.ensureComplianceEntry(reqId);
            compliance.url = url.trim();
            this.saveData();
            
            // Refresh the requirement details to show/hide URL section
            this.showRequirementDetails(reqId);
        }

        // ── Evidence records ─────────────────────────────────────────────────

        getEvidenceForRequirement(reqId) {
            return this.evidenceRecords.filter(r => r.requirementId === reqId);
        }

        addEvidenceRecord(requirementId, { type, note, url }) {
            const typeKey = (EVIDENCE_TYPES.find(t => t.key === type) ? type : 'other');
            const record = {
                id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                requirementId,
                type: typeKey,
                note: (note || '').trim(),
                url: (url || '').trim(),
                createdAt: new Date().toISOString()
            };
            this.evidenceRecords.push(record);
            this.saveData();
            return record;
        }

        removeEvidenceRecord(id) {
            const before = this.evidenceRecords.length;
            this.evidenceRecords = this.evidenceRecords.filter(r => r.id !== id);
            if (this.evidenceRecords.length !== before) {
                this.saveData();
            }
        }

        getEvidenceTypeMeta(key) {
            return EVIDENCE_TYPES.find(t => t.key === key) || EVIDENCE_TYPES[EVIDENCE_TYPES.length - 1];
        }

        renderEvidenceRecordsPanel(reqId) {
            const records = this.getEvidenceForRequirement(reqId);
            const typeOptions = EVIDENCE_TYPES.map(t =>
                `<option value="${t.key}">${t.icon} ${this.escapeHtml(t.label)}</option>`
            ).join('');

            const recordsHtml = records.length
                ? records.map(r => {
                    const meta = this.getEvidenceTypeMeta(r.type);
                    const safeId = this.escapeHtml(r.id);
                    const urlHtml = r.url
                        ? `<a href="${this.escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="evidence-record-url">
                               ${this.escapeHtml(r.url)}<span class="external-icon">↗</span>
                           </a>`
                        : '';
                    return `
                        <li class="evidence-record-item">
                            <span class="evidence-record-type-badge">${meta.icon} ${this.escapeHtml(meta.label)}</span>
                            ${r.note ? `<p class="evidence-record-note">${this.escapeHtml(r.note)}</p>` : ''}
                            ${urlHtml}
                            <button class="btn-icon evidence-record-remove"
                                    data-action="remove-evidence-record"
                                    data-evidence-id="${safeId}"
                                    data-requirement-id="${this.escapeHtml(reqId)}"
                                    aria-label="Remove evidence record">✕</button>
                        </li>`;
                  }).join('')
                : '<li class="evidence-empty-state">No evidence records yet.</li>';

            return `
                <div class="evidence-records-panel">
                    <h5>Evidence records</h5>
                    <ul class="evidence-records-list">${recordsHtml}</ul>
                    <details class="evidence-add-form" id="evidenceAddForm-${this.escapeHtml(reqId)}">
                        <summary class="btn btn-outline btn-small">+ Add evidence record</summary>
                        <div class="evidence-form-body">
                            <div class="form-group">
                                <label>Type</label>
                                <select class="evidence-form-type form-control" data-req="${this.escapeHtml(reqId)}">
                                    ${typeOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Note <span class="field-optional">(optional)</span></label>
                                <textarea class="evidence-form-note form-control" rows="2"
                                          placeholder="Brief description of this evidence…"
                                          data-req="${this.escapeHtml(reqId)}"></textarea>
                            </div>
                            <div class="form-group">
                                <label>URL <span class="field-optional">(optional)</span></label>
                                <input type="url" class="evidence-form-url form-control"
                                       placeholder="https://…"
                                       data-req="${this.escapeHtml(reqId)}">
                            </div>
                            <div class="evidence-form-actions">
                                <button class="btn btn-primary btn-small"
                                        data-action="save-evidence-record"
                                        data-requirement-id="${this.escapeHtml(reqId)}">Save</button>
                            </div>
                        </div>
                    </details>
                </div>`;
        }

        // ── Compliance review ─────────────────────────────────────────────────

        reviewCompliance(reqId, notes) {
            const compliance = this.ensureComplianceEntry(reqId);
            compliance.lastReviewedAt = new Date().toISOString();
            compliance.lastReviewedNotes = (notes || '').trim();
            this.saveData();
            this.showRequirementDetails(reqId);
        }

        // ── Work view sub-navigation ──────────────────────────────────────────

        switchWorkTab(tab) {
            const tabs = ['projects', 'directions', 'actions'];
            tabs.forEach(t => {
                const btn = document.getElementById(`workTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
                const panel = document.getElementById(`workPanel${t.charAt(0).toUpperCase() + t.slice(1)}`);
                const isActive = t === tab;
                if (btn) {
                    btn.classList.toggle('active', isActive);
                    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                }
                if (panel) panel.classList.toggle('hidden', !isActive);
            });
            if (tab === 'directions') this.renderDirections();
            if (tab === 'actions') this.renderActions();
        }

        // ── Directions ────────────────────────────────────────────────────────

        showDirectionModal(directionId = null) {
            this.editingDirection = directionId || null;
            const modal = document.getElementById('directionModal');
            const titleEl = document.getElementById('directionModalTitle');
            const form = document.getElementById('directionForm');
            if (!modal || !form) return;

            if (directionId) {
                const dir = this.directions.find(d => d.id === directionId);
                if (dir) {
                    titleEl.textContent = 'Edit Direction';
                    document.getElementById('directionTitle').value = dir.title || '';
                    document.getElementById('directionInstrumentNumber').value = dir.instrumentNumber || '';
                    document.getElementById('directionIssuedAt').value = dir.issuedAt ? dir.issuedAt.split('T')[0] : '';
                    document.getElementById('directionDescription').value = dir.description || '';
                    this._applyExternalFieldGuards('directions', dir, form);
                }
            } else {
                titleEl.textContent = 'Add Direction';
                form.reset();
                form.querySelector('.external-record-banner')?.remove();
                form.querySelectorAll('.field-locked').forEach(el => { el.disabled = false; el.classList.remove('field-locked'); });
                form.querySelectorAll('.lock-icon').forEach(el => el.remove());
            }
            this.openModal(modal, { initialFocusSelector: '#directionTitle' });
        }

        saveDirection() {
            const title = (document.getElementById('directionTitle')?.value || '').trim();
            if (!title) return;

            const directionData = {
                title,
                instrumentNumber: (document.getElementById('directionInstrumentNumber')?.value || '').trim(),
                issuedAt: document.getElementById('directionIssuedAt')?.value || null,
                description: (document.getElementById('directionDescription')?.value || '').trim(),
            };

            if (this.editingDirection) {
                const idx = this.directions.findIndex(d => d.id === this.editingDirection);
                if (idx !== -1) {
                    const existing = this.directions[idx];
                    if (this.isExternalRecord(existing)) {
                        (existing._externalSource.lockedFields || []).forEach(f => {
                            if (f in existing) directionData[f] = existing[f];
                        });
                    }
                    this.directions[idx] = { ...existing, ...directionData };
                }
            } else {
                directionData.id = `dir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                directionData.createdAt = new Date().toISOString();
                this.directions.push(directionData);
            }

            this.saveData();
            this.hideModal('directionModal');
            this.editingDirection = null;
            this.renderDirections();
        }

        deleteDirection(directionId) {
            if (!confirm('Delete this Direction? Any relationship links to it will also be removed.')) return;
            this.directions = this.directions.filter(d => d.id !== directionId);
            this.relationships = this.relationships.filter(
                r => !(r.sourceId === directionId || r.targetId === directionId)
            );
            this.saveData();
            this.renderDirections();
        }

        renderDirections() {
            const list = document.getElementById('directionsList');
            if (!list) return;

            if (!this.directions.length) {
                list.innerHTML = '<p class="empty-state">No Directions recorded yet. Add a Direction to start tracking obligations.</p>';
                return;
            }

            list.innerHTML = this.directions.map(dir => {
                const safeId = this.escapeHtml(dir.id);
                const linkedReqs = this.relationships
                    .filter(r => (r.sourceId === dir.id && r.sourceType === 'direction' && r.targetType === 'requirement')
                               || (r.targetId === dir.id && r.targetType === 'direction' && r.sourceType === 'requirement'))
                    .length;
                const externalBadge = this.isExternalRecord(dir)
                    ? `<span class="external-record-badge" title="Sourced from ${this.escapeHtml(dir._externalSource.systemName)}">🔗 External</span>`
                    : '';
                return `
                    <div class="entity-card" data-entity-id="${safeId}">
                        <div class="entity-card-header">
                            <div>
                                <h4 class="entity-card-title">${this.escapeHtml(dir.title)}${externalBadge ? ' ' + externalBadge : ''}</h4>
                                ${dir.instrumentNumber ? `<span class="entity-meta">${this.escapeHtml(dir.instrumentNumber)}</span>` : ''}
                                ${dir.issuedAt ? `<span class="entity-meta">Issued ${this.escapeHtml(dir.issuedAt)}</span>` : ''}
                            </div>
                            <div class="entity-card-actions">
                                <button class="btn btn-outline btn-small" data-action="edit-direction" data-direction-id="${safeId}">Edit</button>
                                <button class="btn btn-danger btn-small" data-action="delete-direction" data-direction-id="${safeId}">Delete</button>
                            </div>
                        </div>
                        ${dir.description ? `<p class="entity-description">${this.escapeHtml(dir.description)}</p>` : ''}
                        <p class="entity-links-summary">${linkedReqs} linked requirement${linkedReqs !== 1 ? 's' : ''}</p>
                    </div>`;
            }).join('');
        }

        // ── Actions ───────────────────────────────────────────────────────────

        showActionModal(actionId = null) {
            this.editingAction = actionId || null;
            const modal = document.getElementById('actionModal');
            const titleEl = document.getElementById('actionModalTitle');
            const form = document.getElementById('actionForm');
            if (!modal || !form) return;

            if (actionId) {
                const action = this.actions.find(a => a.id === actionId);
                if (action) {
                    titleEl.textContent = 'Edit Action';
                    document.getElementById('actionTitle').value = action.title || '';
                    document.getElementById('actionType').value = action.type || 'remediation';
                    document.getElementById('actionStatus').value = action.status || 'not-started';
                    document.getElementById('actionDueDate').value = action.dueDate || '';
                    document.getElementById('actionDescription').value = action.description || '';
                    this._applyExternalFieldGuards('actions', action, form);
                }
            } else {
                titleEl.textContent = 'Add Action';
                form.reset();
                form.querySelector('.external-record-banner')?.remove();
                form.querySelectorAll('.field-locked').forEach(el => { el.disabled = false; el.classList.remove('field-locked'); });
                form.querySelectorAll('.lock-icon').forEach(el => el.remove());
            }
            this.openModal(modal, { initialFocusSelector: '#actionTitle' });
        }

        saveAction() {
            const title = (document.getElementById('actionTitle')?.value || '').trim();
            if (!title) return;

            const typeVal = document.getElementById('actionType')?.value || 'other';
            const statusVal = document.getElementById('actionStatus')?.value || 'not-started';

            const actionData = {
                title,
                type: ACTION_TYPES.find(t => t.key === typeVal) ? typeVal : 'other',
                status: ACTION_STATUSES.find(s => s.key === statusVal) ? statusVal : 'not-started',
                dueDate: document.getElementById('actionDueDate')?.value || null,
                description: (document.getElementById('actionDescription')?.value || '').trim(),
            };

            if (this.editingAction) {
                const idx = this.actions.findIndex(a => a.id === this.editingAction);
                if (idx !== -1) {
                    const existing = this.actions[idx];
                    if (this.isExternalRecord(existing)) {
                        (existing._externalSource.lockedFields || []).forEach(f => {
                            if (f in existing) actionData[f] = existing[f];
                        });
                    }
                    this.actions[idx] = { ...existing, ...actionData };
                }
            } else {
                actionData.id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                actionData.createdAt = new Date().toISOString();
                this.actions.push(actionData);
                this.trackEvent('action:create');
            }

            this.saveData();
            this.hideModal('actionModal');
            this.editingAction = null;
            this.renderActions();
        }

        deleteAction(actionId) {
            if (!confirm('Delete this Action? Any relationship links to it will also be removed.')) return;
            this.actions = this.actions.filter(a => a.id !== actionId);
            this.relationships = this.relationships.filter(
                r => !(r.sourceId === actionId || r.targetId === actionId)
            );
            this.saveData();
            this.renderActions();
        }

        renderActions() {
            const list = document.getElementById('actionsList');
            if (!list) return;

            if (!this.actions.length) {
                list.innerHTML = '<p class="empty-state">No Actions recorded yet. Add an Action to start tracking remediation work.</p>';
                return;
            }

            list.innerHTML = this.actions.map(action => {
                const safeId = this.escapeHtml(action.id);
                const typeMeta = ACTION_TYPES.find(t => t.key === action.type) || ACTION_TYPES[ACTION_TYPES.length - 1];
                const statusMeta = ACTION_STATUSES.find(s => s.key === action.status) || ACTION_STATUSES[0];
                const overdue = action.dueDate && action.status !== 'completed' && action.status !== 'cancelled'
                    && new Date(action.dueDate) < new Date();
                const externalBadge = this.isExternalRecord(action)
                    ? `<span class="external-record-badge" title="Sourced from ${this.escapeHtml(action._externalSource.systemName)}">🔗 External</span>`
                    : '';
                return `
                    <div class="entity-card action-card status-${this.escapeHtml(action.status)}${overdue ? ' overdue' : ''}" data-entity-id="${safeId}">
                        <div class="entity-card-header">
                            <div>
                                <h4 class="entity-card-title">${this.escapeHtml(action.title)}${externalBadge ? ' ' + externalBadge : ''}</h4>
                                <span class="entity-type-badge">${typeMeta.icon} ${this.escapeHtml(typeMeta.label)}</span>
                                <span class="entity-status-badge status-${this.escapeHtml(action.status)}">${this.escapeHtml(statusMeta.label)}</span>
                                ${action.dueDate ? `<span class="entity-meta${overdue ? ' overdue-label' : ''}">Due ${this.escapeHtml(action.dueDate)}</span>` : ''}
                            </div>
                            <div class="entity-card-actions">
                                <button class="btn btn-outline btn-small" data-action="edit-action" data-action-id="${safeId}">Edit</button>
                                <button class="btn btn-danger btn-small" data-action="delete-action" data-action-id="${safeId}">Delete</button>
                            </div>
                        </div>
                        ${action.description ? `<p class="entity-description">${this.escapeHtml(action.description)}</p>` : ''}
                    </div>`;
            }).join('');
        }

        // ── Relationships / Linkage ───────────────────────────────────────────

        addRelationship(sourceType, sourceId, targetType, targetId, relation = 'supports') {
            // Prevent self-reference
            if (sourceType === targetType && sourceId === targetId) return null;
            // Prevent duplicates
            const exists = this.relationships.some(
                r => r.sourceType === sourceType && r.sourceId === sourceId
                  && r.targetType === targetType && r.targetId === targetId
            );
            if (exists) return null;

            const rel = {
                id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sourceType,
                sourceId,
                targetType,
                targetId,
                relation,
                createdAt: new Date().toISOString()
            };
            this.relationships.push(rel);
            this.saveData();
            return rel;
        }

        removeRelationship(relId) {
            const before = this.relationships.length;
            this.relationships = this.relationships.filter(r => r.id !== relId);
            if (this.relationships.length !== before) this.saveData();
        }

        getLinkedEntities(entityType, entityId) {
            return this.relationships.filter(
                r => (r.sourceType === entityType && r.sourceId === entityId)
                  || (r.targetType === entityType && r.targetId === entityId)
            );
        }

        renderRequirementLinksSection(reqId) {
            const links = this.getLinkedEntities('requirement', reqId);

            const linkedDirections = links
                .filter(r => r.sourceType === 'direction' || r.targetType === 'direction')
                .map(r => {
                    const dirId = r.sourceType === 'direction' ? r.sourceId : r.targetId;
                    return { rel: r, entity: this.directions.find(d => d.id === dirId) };
                })
                .filter(x => x.entity);

            const linkedRisks = links
                .filter(r => r.sourceType === 'risk' || r.targetType === 'risk')
                .map(r => {
                    const riskId = r.sourceType === 'risk' ? r.sourceId : r.targetId;
                    return { rel: r, entity: this.risks.find(d => d.id === riskId) };
                })
                .filter(x => x.entity);

            const linkedActions = links
                .filter(r => r.sourceType === 'action' || r.targetType === 'action')
                .map(r => {
                    const actId = r.sourceType === 'action' ? r.sourceId : r.targetId;
                    return { rel: r, entity: this.actions.find(d => d.id === actId) };
                })
                .filter(x => x.entity);

            const renderLinkList = (items, labelFn, badgeClass = '') => {
                if (!items.length) return '<p class="link-empty-state">None linked.</p>';
                return `<ul class="linked-entity-list">${items.map(({ rel, entity }) => `
                    <li class="linked-entity-item${badgeClass ? ` ${badgeClass}` : ''}">
                        <span class="linked-entity-label">${this.escapeHtml(labelFn(entity))}</span>
                        <button class="btn-icon linked-entity-remove"
                                data-action="remove-requirement-link"
                                data-rel-id="${this.escapeHtml(rel.id)}"
                                data-requirement-id="${this.escapeHtml(reqId)}"
                                aria-label="Remove link">✕</button>
                    </li>`).join('')}</ul>`;
            };

            const dirOptions = this.directions.map(d =>
                `<option value="${this.escapeHtml(d.id)}">${this.escapeHtml(d.title)}</option>`
            ).join('');
            const riskOptions = this.risks.map(r =>
                `<option value="${this.escapeHtml(r.id)}">${this.escapeHtml(r.name)}</option>`
            ).join('');
            const actionOptions = this.actions.map(a =>
                `<option value="${this.escapeHtml(a.id)}">${this.escapeHtml(a.title)}</option>`
            ).join('');

            const safeReqId = this.escapeHtml(reqId);

            return `
                <div class="requirement-links-section">
                    <h5>Linkage</h5>

                    <div class="links-group">
                        <h6>Directions</h6>
                        ${renderLinkList(linkedDirections, e => e.title)}
                        ${dirOptions ? `<div class="link-add-row">
                            <select class="form-control form-control-sm link-select" id="linkDirSelect-${safeReqId}">
                                <option value="">Link a Direction…</option>${dirOptions}
                            </select>
                            <button class="btn btn-outline btn-small"
                                    data-action="add-requirement-link"
                                    data-requirement-id="${safeReqId}"
                                    data-target-type="direction"
                                    data-select-id="linkDirSelect-${safeReqId}">Link</button>
                        </div>` : ''}
                    </div>

                    <div class="links-group">
                        <h6>Risks</h6>
                        ${renderLinkList(linkedRisks, e => e.name)}
                        ${riskOptions ? `<div class="link-add-row">
                            <select class="form-control form-control-sm link-select" id="linkRiskSelect-${safeReqId}">
                                <option value="">Link a Risk…</option>${riskOptions}
                            </select>
                            <button class="btn btn-outline btn-small"
                                    data-action="add-requirement-link"
                                    data-requirement-id="${safeReqId}"
                                    data-target-type="risk"
                                    data-select-id="linkRiskSelect-${safeReqId}">Link</button>
                        </div>` : ''}
                    </div>

                    <div class="links-group">
                        <h6>Actions</h6>
                        ${renderLinkList(linkedActions, e => e.title)}
                        ${actionOptions ? `<div class="link-add-row">
                            <select class="form-control form-control-sm link-select" id="linkActionSelect-${safeReqId}">
                                <option value="">Link an Action…</option>${actionOptions}
                            </select>
                            <button class="btn btn-outline btn-small"
                                    data-action="add-requirement-link"
                                    data-requirement-id="${safeReqId}"
                                    data-target-type="action"
                                    data-select-id="linkActionSelect-${safeReqId}">Link</button>
                        </div>` : ''}
                    </div>
                </div>`;
        }

        // ── Relationship Map (Stage 4) ────────────────────────────────────────

        // Colour palette for canvas drawing
        static get MAP_COLORS() {
            return {
                direction:   { bg: '#1565c0', text: '#ffffff', dimBg: 'rgba(21,101,192,0.18)',  border: '#1976d2' },
                requirement: { bg: '#4a148c', text: '#ffffff', dimBg: 'rgba(74,20,140,0.18)',   border: '#6a1b9a' },
                risk:        { bg: '#bf360c', text: '#ffffff', dimBg: 'rgba(191,54,12,0.18)',   border: '#d84315' },
                action:      { bg: '#1b5e20', text: '#ffffff', dimBg: 'rgba(27,94,32,0.18)',    border: '#2e7d32' },
            };
        }

        static get MAP_LAYOUT() {
            return { nodeW: 180, nodeH: 56, rowGap: 16, colHeaderH: 44, padX: 20, padY: 20 };
        }

        renderRelationshipMap() {
            const isMobile = this.isMobileViewport();
            const handoff = document.getElementById('mapMobileHandoff');
            const desktop = document.getElementById('mapDesktopContent');

            if (isMobile) {
                handoff?.classList.remove('hidden');
                desktop?.classList.add('hidden');
                this._renderMapMobileSummary();
                return;
            }

            handoff?.classList.add('hidden');
            desktop?.classList.remove('hidden');
            this._initMapControls();
            this._drawMap();
        }

        _renderMapMobileSummary() {
            const el = document.getElementById('mapMobileSummary');
            if (!el) return;
            const linkedReqs  = new Set(this.relationships.filter(r => r.sourceType === 'requirement' || r.targetType === 'requirement').map(r => r.sourceType === 'requirement' ? r.sourceId : r.targetId)).size;
            const linkedRisks = new Set(this.relationships.filter(r => r.sourceType === 'risk' || r.targetType === 'risk').map(r => r.sourceType === 'risk' ? r.sourceId : r.targetId)).size;
            el.innerHTML = `
                <div class="map-mobile-stats">
                    <div class="map-mobile-stat"><span class="map-mobile-stat-n">${this.directions.length}</span><span>Directions</span></div>
                    <div class="map-mobile-stat"><span class="map-mobile-stat-n">${linkedReqs}</span><span>Linked requirements</span></div>
                    <div class="map-mobile-stat"><span class="map-mobile-stat-n">${linkedRisks}</span><span>Linked risks</span></div>
                    <div class="map-mobile-stat"><span class="map-mobile-stat-n">${this.actions.length}</span><span>Actions</span></div>
                    <div class="map-mobile-stat"><span class="map-mobile-stat-n">${this.relationships.length}</span><span>Total links</span></div>
                </div>`;
        }

        _initMapControls() {
            // Wire filter checkboxes and action buttons (idempotent — guard with flag)
            if (this._mapControlsWired) { this._drawMap(); return; }
            this._mapControlsWired = true;

            const canvas = document.getElementById('relationshipMapCanvas');
            if (!canvas) return;

            ['mapFilterDirections', 'mapFilterRequirements', 'mapFilterRisks', 'mapFilterActions', 'mapFilterUnlinked'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    this._mapSelectedKey = null;
                    this._drawMap();
                });
            });

            document.getElementById('mapClearSelection')?.addEventListener('click', () => {
                this._mapSelectedKey = null;
                this._drawMap();
            });

            document.getElementById('mapExportPng')?.addEventListener('click', () => {
                const c = document.getElementById('relationshipMapCanvas');
                if (!c) return;
                const a = document.createElement('a');
                a.download = 'pspf-relationship-map.png';
                a.href = c.toDataURL('image/png');
                a.click();
            });

            canvas.addEventListener('click',    e => this._handleMapClick(e));
            canvas.addEventListener('dblclick', e => this._handleMapDblClick(e));
            canvas.addEventListener('mousemove', e => this._handleMapHover(e));
            canvas.addEventListener('mouseleave', () => { this._mapHoveredKey = null; this._drawMap(); });

            if (typeof ResizeObserver !== 'undefined') {
                const wrapper = document.getElementById('mapCanvasWrapper');
                if (wrapper && !this._mapResizeObserver) {
                    this._mapResizeObserver = new ResizeObserver(() => this._drawMap());
                    this._mapResizeObserver.observe(wrapper);
                }
            }
        }

        _buildMapData() {
            const showDir = document.getElementById('mapFilterDirections')?.checked !== false;
            const showReq = document.getElementById('mapFilterRequirements')?.checked !== false;
            const showRisk = document.getElementById('mapFilterRisks')?.checked !== false;
            const showAct = document.getElementById('mapFilterActions')?.checked !== false;
            const showUnlinked = document.getElementById('mapFilterUnlinked')?.checked === true;

            // Determine which entity keys appear in relationships
            const linkedKeys = new Set();
            this.relationships.forEach(r => {
                linkedKeys.add(`${r.sourceType}:${r.sourceId}`);
                linkedKeys.add(`${r.targetType}:${r.targetId}`);
            });

            const isVisible = (type, id) => {
                if (!showUnlinked && !linkedKeys.has(`${type}:${id}`)) return false;
                if (type === 'direction'   && !showDir)  return false;
                if (type === 'requirement' && !showReq)  return false;
                if (type === 'risk'        && !showRisk) return false;
                if (type === 'action'      && !showAct)  return false;
                return true;
            };

            const COLS = ['direction', 'requirement', 'risk', 'action'];
            const columns = { direction: [], requirement: [], risk: [], action: [] };

            this.directions.forEach(d => {
                if (isVisible('direction', d.id)) columns.direction.push({ type: 'direction', id: d.id, label: d.title, sub: d.instrumentNumber || '' });
            });
            Object.values(this.requirements || {}).forEach(r => {
                if (isVisible('requirement', r.id)) columns.requirement.push({ type: 'requirement', id: r.id, label: `${r.id}`, sub: (r.title || '').slice(0, 30) });
            });
            this.risks.forEach(r => {
                if (isVisible('risk', r.id)) columns.risk.push({ type: 'risk', id: r.id, label: r.name, sub: r.severity || '' });
            });
            this.actions.forEach(a => {
                if (isVisible('action', a.id)) columns.action.push({ type: 'action', id: a.id, label: a.title, sub: a.status || '' });
            });

            // Build flat node list with column assignments
            const nodeMap = new Map(); // key -> index
            const nodes = [];
            COLS.forEach((colType, colIdx) => {
                columns[colType].forEach((item, rowIdx) => {
                    const key = `${item.type}:${item.id}`;
                    nodeMap.set(key, nodes.length);
                    nodes.push({ ...item, colIdx, rowIdx });
                });
            });

            // Build edges — only where both endpoints are visible
            const edges = this.relationships
                .filter(r => nodeMap.has(`${r.sourceType}:${r.sourceId}`) && nodeMap.has(`${r.targetType}:${r.targetId}`))
                .map(r => ({
                    from: nodeMap.get(`${r.sourceType}:${r.sourceId}`),
                    to:   nodeMap.get(`${r.targetType}:${r.targetId}`)
                }));

            return { nodes, edges, columns };
        }

        _drawMap() {
            const canvas = document.getElementById('relationshipMapCanvas');
            const wrapper = document.getElementById('mapCanvasWrapper');
            const emptyState = document.getElementById('mapEmptyState');
            if (!canvas || !wrapper) return;

            const { nodes, edges } = this._buildMapData();

            if (nodes.length === 0) {
                canvas.style.display = 'none';
                emptyState?.classList.remove('hidden');
                return;
            }
            canvas.style.display = '';
            emptyState?.classList.add('hidden');

            const L = PSPFExplorer.MAP_LAYOUT;
            const COLS = 4;
            const dpr = window.devicePixelRatio || 1;
            const logicalW = wrapper.clientWidth || 900;

            const colW = (logicalW - L.padX * 2) / COLS;

            // Column centre X positions
            const colXc = [0, 1, 2, 3].map(i => L.padX + colW * i + colW / 2);

            // Assign positions
            nodes.forEach(node => {
                node.cx = colXc[node.colIdx];
                node.cy = L.colHeaderH + L.padY + node.rowIdx * (L.nodeH + L.rowGap) + L.nodeH / 2;
                node.x  = node.cx - L.nodeW / 2;
                node.y  = node.cy - L.nodeH / 2;
            });

            const maxRowsPerCol = [0, 1, 2, 3].map(ci => nodes.filter(n => n.colIdx === ci).length);
            const maxRows = Math.max(...maxRowsPerCol, 1);
            const logicalH = L.colHeaderH + L.padY * 2 + maxRows * (L.nodeH + L.rowGap);

            // Resize canvas
            canvas.width  = logicalW  * dpr;
            canvas.height = logicalH  * dpr;
            canvas.style.width  = logicalW  + 'px';
            canvas.style.height = logicalH  + 'px';

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, logicalW, logicalH);

            // Store node positions for hit testing
            this._mapNodes = nodes;

            // Determine selection state
            const selKey = this._mapSelectedKey || null;
            const relatedKeys = new Set();
            if (selKey) {
                const selIdx = nodes.findIndex(n => `${n.type}:${n.id}` === selKey);
                if (selIdx !== -1) {
                    edges.forEach(e => {
                        if (e.from === selIdx) relatedKeys.add(`${nodes[e.to].type}:${nodes[e.to].id}`);
                        if (e.to === selIdx)   relatedKeys.add(`${nodes[e.from].type}:${nodes[e.from].id}`);
                    });
                }
            }

            const hovKey = this._mapHoveredKey || null;

            // Draw column headers
            const COL_HEADERS = ['Directions', 'Requirements', 'Risks', 'Actions'];
            const COL_TYPES   = ['direction', 'requirement', 'risk', 'action'];
            const COLORS = PSPFExplorer.MAP_COLORS;
            ctx.font = '600 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            COL_HEADERS.forEach((label, i) => {
                const c = COLORS[COL_TYPES[i]];
                const x = colXc[i];
                ctx.fillStyle = c.bg + '22';
                ctx.beginPath();
                ctx.roundRect(x - L.nodeW / 2, 8, L.nodeW, 26, 6);
                ctx.fill();
                ctx.fillStyle = c.bg;
                ctx.fillText(label, x, 26);
            });

            // Draw edges
            edges.forEach(e => {
                const src = nodes[e.from];
                const tgt = nodes[e.to];
                const srcKey = `${src.type}:${src.id}`;
                const tgtKey = `${tgt.type}:${tgt.id}`;
                const isHighlighted = selKey && (srcKey === selKey || tgtKey === selKey);
                const isDimmed = selKey && !isHighlighted;

                ctx.beginPath();
                ctx.strokeStyle = isHighlighted ? '#f59e0b' : isDimmed ? 'rgba(160,160,160,0.15)' : 'rgba(120,120,120,0.35)';
                ctx.lineWidth = isHighlighted ? 2.5 : 1;
                const x1 = src.cx + L.nodeW / 2;
                const y1 = src.cy;
                const x2 = tgt.cx - L.nodeW / 2;
                const y2 = tgt.cy;
                const mx = (x1 + x2) / 2;
                ctx.moveTo(x1, y1);
                ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
                ctx.stroke();
                // Arrowhead
                if (!isDimmed) {
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    ctx.save();
                    ctx.translate(x2, y2);
                    ctx.rotate(angle);
                    ctx.fillStyle = isHighlighted ? '#f59e0b' : 'rgba(120,120,120,0.5)';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-8, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            });

            // Draw nodes
            nodes.forEach(node => {
                const key = `${node.type}:${node.id}`;
                const c = COLORS[node.type];
                const isSelected = key === selKey;
                const isRelated  = !isSelected && selKey && relatedKeys.has(key);
                const isDimmed   = selKey && !isSelected && !isRelated;
                const isHovered  = key === hovKey;

                // Background
                ctx.save();
                ctx.globalAlpha = isDimmed ? 0.2 : 1;
                ctx.fillStyle = isSelected ? c.bg : isRelated ? c.bg + 'cc' : c.dimBg;
                this._drawRoundRect(ctx, node.x, node.y, L.nodeW, L.nodeH, 8);
                ctx.fill();

                // Border
                ctx.strokeStyle = isSelected ? '#f59e0b' : isHovered ? c.border : c.bg + '66';
                ctx.lineWidth = isSelected ? 2.5 : isHovered ? 1.5 : 1;
                this._drawRoundRect(ctx, node.x, node.y, L.nodeW, L.nodeH, 8);
                ctx.stroke();

                // Text
                ctx.fillStyle = (isSelected || isRelated) ? '#fff' : c.bg;
                ctx.font = '600 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                const maxTextW = L.nodeW - 16;
                const labelTrunc = this._truncateText(ctx, node.label, maxTextW);
                ctx.fillText(labelTrunc, node.cx, node.cy - (node.sub ? 7 : 2));
                if (node.sub) {
                    ctx.font = '400 10px Inter, sans-serif';
                    ctx.globalAlpha = isDimmed ? 0.2 : isSelected || isRelated ? 0.8 : 0.65;
                    const subTrunc = this._truncateText(ctx, node.sub, maxTextW);
                    ctx.fillText(subTrunc, node.cx, node.cy + 9);
                }
                ctx.restore();
            });
        }

        _drawRoundRect(ctx, x, y, w, h, r) {
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.arcTo(x + w, y, x + w, y + r, r);
                ctx.lineTo(x + w, y + h - r);
                ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                ctx.lineTo(x + r, y + h);
                ctx.arcTo(x, y + h, x, y + h - r, r);
                ctx.lineTo(x, y + r);
                ctx.arcTo(x, y, x + r, y, r);
                ctx.closePath();
            }
        }

        _truncateText(ctx, text, maxW) {
            if (!text) return '';
            if (ctx.measureText(text).width <= maxW) return text;
            let t = text;
            while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
            return t + '…';
        }

        _hitTestMap(clientX, clientY) {
            const canvas = document.getElementById('relationshipMapCanvas');
            if (!canvas || !this._mapNodes) return null;
            const rect = canvas.getBoundingClientRect();
            const L = PSPFExplorer.MAP_LAYOUT;
            const scaleX = (canvas.width / (window.devicePixelRatio || 1)) / rect.width;
            const scaleY = (canvas.height / (window.devicePixelRatio || 1)) / rect.height;
            const lx = (clientX - rect.left) * scaleX;
            const ly = (clientY - rect.top)  * scaleY;
            return this._mapNodes.find(n =>
                lx >= n.x && lx <= n.x + L.nodeW &&
                ly >= n.y && ly <= n.y + L.nodeH
            ) || null;
        }

        _handleMapClick(e) {
            const node = this._hitTestMap(e.clientX, e.clientY);
            if (!node) {
                this._mapSelectedKey = null;
            } else {
                const key = `${node.type}:${node.id}`;
                this._mapSelectedKey = this._mapSelectedKey === key ? null : key;
            }
            this._drawMap();
        }

        _handleMapDblClick(e) {
            const node = this._hitTestMap(e.clientX, e.clientY);
            if (!node) return;
            if (node.type === 'requirement') {
                this.showView('search');
                this.updateNavButtons('searchBtn');
                // Small delay to let the view render
                requestAnimationFrame(() => this.showRequirementDetails(node.id));
            } else if (node.type === 'direction') {
                this.showDirectionModal(node.id);
            } else if (node.type === 'risk') {
                this.showRiskModal(node.id);
            } else if (node.type === 'action') {
                this.showActionModal(node.id);
            }
        }

        _handleMapHover(e) {
            const node = this._hitTestMap(e.clientX, e.clientY);
            const newKey = node ? `${node.type}:${node.id}` : null;
            const canvas = document.getElementById('relationshipMapCanvas');
            if (canvas) canvas.style.cursor = node ? 'pointer' : 'default';
            if (newKey !== this._mapHoveredKey) {
                this._mapHoveredKey = newKey;
                this._drawMap();
            }
        }

        calculateDomainHealth(domainId) {
            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) return { status: 'critical', met: 0, total: 0, text: 'Unknown' };

            const requirements = Array.isArray(domain.requirements) ? domain.requirements : [];
            let totalRequirements = requirements.length;
            let metRequirements = 0;
            let partialRequirements = 0;
            let unmetWithGoodExplanations = 0;

            requirements.forEach(reqId => {
                const compliance = this.compliance[reqId];
                if (compliance) {
                    if (compliance.status === 'yes' || compliance.status === 'na') {
                        metRequirements++;
                    } else if (compliance.status === 'partial') {
                        partialRequirements++;
                    } else if (compliance.status === 'no' && compliance.comment && compliance.comment.trim().length > 10) {
                        unmetWithGoodExplanations++;
                    }
                }
            });

            if (metRequirements === totalRequirements) {
                return { status: 'healthy', met: metRequirements, total: totalRequirements, text: 'Excellent' };
            } else if (metRequirements + partialRequirements + unmetWithGoodExplanations >= totalRequirements * 0.8) {
                return { status: 'warning', met: metRequirements, total: totalRequirements, text: 'Good' };
            } else {
                return { status: 'critical', met: metRequirements, total: totalRequirements, text: 'Needs Attention' };
            }
        }

        recordDomainSnapshot(domainId) {
            if (!domainId) return;
            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) return;
            const requirements = Array.isArray(domain.requirements) ? domain.requirements : [];
            const breakdown = { yes: 0, partial: 0, no: 0, na: 0, 'not-set': 0 };
            requirements.forEach(reqId => {
                const status = this.compliance[reqId]?.status || 'not-set';
                const key = Object.prototype.hasOwnProperty.call(breakdown, status) ? status : 'not-set';
                breakdown[key] += 1;
            });

            const met = breakdown.yes + breakdown.na;
            const snapshot = {
                timestamp: new Date().toISOString(),
                met,
                total: requirements.length,
                percentage: requirements.length ? Math.round((met / requirements.length) * 100) : 0,
                breakdown,
                blockers: breakdown.no + breakdown['not-set'],
                partial: breakdown.partial
            };
            const history = Array.isArray(this.progressHistory[domainId]) ? this.progressHistory[domainId] : [];
            const last = history[history.length - 1];
            if (last && last.met === snapshot.met && last.percentage === snapshot.percentage) {
                this.progressHistory[domainId] = history;
                return;
            }
            history.push(snapshot);
            if (history.length > 40) {
                history.shift();
            }
            this.progressHistory[domainId] = history;
        }

        updateStats() {
            let totalRequirements = 0;
            let metRequirements = 0;

            this.domains.forEach(domain => {
                domain.requirements.forEach(reqId => {
                    totalRequirements++;
                    const compliance = this.compliance[reqId];
                    if (compliance && compliance.status === 'yes') {
                        metRequirements++;
                    }
                });
            });

            const rawCompliancePercentage = totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 0;
            const complianceLabel = this.formatPercentDisplay(rawCompliancePercentage);

            const totalProjects = this.projects.length;
            const totalRisks = this.risks.length;
            const totalIncidents = this.incidents.length;

            // Animate number updates
            this.animateNumber('totalProjectsProgress', totalProjects);
            this.animateNumber('totalRisks', totalRisks);
            this.animateNumber('totalIncidentsStat', totalIncidents);
            
            // Update main compliance display
            document.getElementById('overallCompliance').textContent = complianceLabel;
            
            // Update progress rings
            this.updateProgressRing('complianceRing', 'compliancePercent', rawCompliancePercentage);
            
            // Update mini charts
            this.updateMiniChart('projectsChart', Math.min(totalProjects * 10, 100));
            this.updateMiniChart('risksChart', Math.min(totalRisks * 15, 100));
            this.updateMiniChart('incidentsChart', Math.min(totalIncidents * 12, 100));
            
            // Update trend indicators
            this.updateTrendIndicators(totalProjects, rawCompliancePercentage, totalRisks, totalIncidents);

            this.renderDomainRequirementHeatmap();

            // Refresh Essential Eight summary
            this.renderEssentialEightWidget();
            this.renderGapReport();
            this.renderUnassignedWidget();
        }
        
        animateNumber(elementId, targetValue) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const startValue = parseInt(element.textContent) || 0;
            const duration = 1000;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
                
                element.textContent = currentValue;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }
        
        updateProgressRing(ringId, textId, percentage) {
            const ring = document.getElementById(ringId);
            const text = document.getElementById(textId);
            if (!ring || !text) return;

            const circle = ring.querySelector('.progress-ring-progress');
            const radius = 26;
            const circumference = 2 * Math.PI * radius;
            const validPercentage = Math.max(0, Math.min(percentage, 100));
            const offset = circumference - (validPercentage / 100) * circumference;

            circle.style.strokeDashoffset = offset;
            text.textContent = this.formatPercentDisplay(validPercentage);

            // Color based on percentage
            if (validPercentage >= 80) {
                circle.style.stroke = 'var(--success-color)';
            } else if (validPercentage >= 60) {
                circle.style.stroke = 'var(--warning-color)';
            } else {
                circle.style.stroke = 'var(--danger-color)';
            }
        }

        formatPercentDisplay(value) {
            if (typeof value !== 'number' || Number.isNaN(value)) {
                return '0%';
            }
            if (value >= 100) {
                return '100%';
            }
            if (value >= 1) {
                return `${Math.round(value)}%`;
            }
            if (value > 0) {
                return `${value.toFixed(1)}%`;
            }
            return '0%';
        }
        
        updateMiniChart(chartId, percentage) {
            const chart = document.getElementById(chartId);
            if (!chart) return;
            
            setTimeout(() => {
                chart.style.width = percentage + '%';
            }, 300);
        }
        
        updateTrendIndicators(projects, compliance, risks, incidents) {
            // Simple trend logic - in a real app, you'd compare with historical data
            const trends = {
                projects: projects > 0 ? 'up' : 'neutral',
                compliance: compliance > 50 ? 'up' : compliance > 0 ? 'neutral' : 'down',
                risks: risks > 0 ? 'down' : 'neutral',
                incidents: incidents > 0 ? 'up' : 'neutral'
            };
            
            this.setTrend('projectsTrend', trends.projects, 'Active projects');
            this.setTrend('complianceTrend', trends.compliance, 'Compliance level');
            this.setTrend('risksTrend', trends.risks, 'Risk level');
            this.setTrend('incidentsTrend', trends.incidents, 'Recorded events');
        }
        
        setTrend(elementId, trend, label) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            element.className = `stat-trend trend-${trend}`;
            
            const icons = { up: '↗', down: '↘', neutral: '→' };
            const texts = { 
                up: `${label} improving`, 
                down: `${label} declining`, 
                neutral: `${label} stable` 
            };
            
            element.innerHTML = `<span>${icons[trend]}</span> ${texts[trend]}`;
        }

        renderEssentialEightWidget() {
            const container = document.getElementById('essentialEightWidget');
            if (!container || !Array.isArray(this.essentialEightControls)) return;

            const controls = this.essentialEightControls.map((control, index) => {
                const requirement = this.requirements[control.id];
                const compliance = this.compliance[control.id];
                const status = compliance?.status || 'not-set';

                return {
                    order: index + 1,
                    id: control.id,
                    label: control.label,
                    description: control.description || requirement?.title || 'No description available.',
                    status: ['yes', 'no', 'partial', 'na', 'not-set'].includes(status) ? status : 'not-set'
                };
            });

            if (controls.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>No Essential Eight controls mapped</h3>
                        <p>Configure Essential Eight mappings to see status here.</p>
                    </div>
                `;
                return;
            }

            const counts = { yes: 0, no: 0, partial: 0, na: 0, 'not-set': 0 };
            controls.forEach(control => {
                const key = Object.prototype.hasOwnProperty.call(counts, control.status) ? control.status : 'not-set';
                counts[key] += 1;
            });

            const total = controls.length;
            const metPercentage = total ? Math.round((counts.yes / total) * 100) : 0;

            const summaryChips = [
                { status: 'yes', label: 'Met', count: counts.yes },
                { status: 'partial', label: 'Risk Managed', count: counts.partial },
                { status: 'no', label: 'Not Met', count: counts.no },
                { status: 'na', label: 'N/A', count: counts.na },
                { status: 'not-set', label: 'Not Set', count: counts['not-set'] }
            ].map(chip => `
                <span class="e8-chip ${chip.status}">${chip.count} ${chip.label}</span>
            `).join('');

            const controlsHtml = controls.map(control => `
                <div class="essential-eight-item">
                    <div class="e8-item-header">
                        <span class="e8-order">${control.order.toString().padStart(2, '0')}</span>
                        <div class="e8-item-meta">
                            <span class="e8-name">${control.label}</span>
                            <span class="e8-id">${control.id}</span>
                        </div>
                    </div>
                    <p class="e8-description">${control.description}</p>
                    <span class="e8-status-pill requirement-status ${control.status}">${this.getStatusText(control.status)}</span>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="essential-eight-header">
                    <div>
                        <h3>Essential Eight</h3>
                        <p class="essential-eight-subtitle">Implementation status of ASD Essential Eight mitigation strategies mapped to Technology domain requirements.</p>
                    </div>
                    <div class="essential-eight-score">
                        <span class="essential-eight-score-value">${metPercentage}%</span>
                        <span class="essential-eight-score-label">Fully met (${counts.yes}/${total})</span>
                    </div>
                </div>
                <div class="essential-eight-summary">
                    ${summaryChips}
                </div>
                <div class="essential-eight-grid">
                    ${controlsHtml}
                </div>
                <div class="essential-eight-footer">
                    <button class="btn btn-outline btn-small" data-action="view-domain" data-domain-id="technology">Review Technology Controls</button>
                    <span class="essential-eight-note">Mapped to requirements TECH-099 – TECH-106</span>
                </div>
            `;
        }

        buildDomainProgressMetric(domain) {
            if (!domain) {
                return null;
            }
            const requirements = Array.isArray(domain.requirements) ? domain.requirements : [];
            const breakdown = { yes: 0, partial: 0, no: 0, na: 0, 'not-set': 0 };
            requirements.forEach(reqId => {
                const status = this.compliance[reqId]?.status || 'not-set';
                if (!Object.prototype.hasOwnProperty.call(breakdown, status)) {
                    breakdown[status] = 0;
                }
                breakdown[status] += 1;
            });

            const met = breakdown.yes + breakdown.na;
            const total = requirements.length;
            const percentage = total ? Math.round((met / total) * 100) : 0;
            const blockers = breakdown.no + breakdown['not-set'];
            const focusRequirement = this.getDomainFocusRequirement(requirements);
            const momentum = this.getDomainMomentumSummary(domain.id);
            const tier = this.getDomainProgressTier({ percentage, blockers, partial: breakdown.partial });

            return {
                domain,
                requirements,
                breakdown,
                met,
                total,
                percentage,
                blockers,
                focusRequirement,
                momentum,
                tier
            };
        }

        getDomainProgressTier(metric = {}) {
            const percentage = typeof metric.percentage === 'number' ? metric.percentage : 0;
            const blockers = typeof metric.blockers === 'number' ? metric.blockers : 0;
            const partial = typeof metric.partial === 'number' ? metric.partial : 0;

            if (percentage >= 85 && blockers === 0) {
                return {
                    key: 'leading',
                    label: 'Leading',
                    description: 'Audit-ready posture with no open actions.',
                    tone: 'success'
                };
            }
            if (percentage >= 60 || partial > 0) {
                return {
                    key: 'steady',
                    label: 'On Track',
                    description: 'Keep partial controls moving to stay ahead.',
                    tone: 'warning'
                };
            }
            return {
                key: 'lagging',
                label: 'Needs Attention',
                description: 'Assign owners to unblock critical gaps.',
                tone: 'danger'
            };
        }

        getDomainFocusRequirement(requirementIds = []) {
            const reviewOrder = ['no', 'partial', 'not-set'];
            for (const status of reviewOrder) {
                const matchId = requirementIds.find(reqId => (this.compliance[reqId]?.status || 'not-set') === status);
                if (matchId) {
                    const requirement = this.requirements[matchId];
                    return {
                        id: matchId,
                        title: requirement?.title || 'Untitled requirement',
                        status: this.compliance[matchId]?.status || 'not-set',
                        domainId: requirement?.domainId || null
                    };
                }
            }
            return null;
        }

        getDomainMomentumSummary(domainId) {
            const history = Array.isArray(this.progressHistory[domainId]) ? this.progressHistory[domainId] : [];
            if (history.length < 2) {
                return {
                    delta: 0,
                    direction: 'flat',
                    startLabel: 'No trend yet'
                };
            }

            const window = history.slice(-4);
            const start = window[0];
            const end = window[window.length - 1];
            const startPercentage = typeof start?.percentage === 'number' ? start.percentage : 0;
            const endPercentage = typeof end?.percentage === 'number' ? end.percentage : 0;
            const delta = Math.round(endPercentage - startPercentage);
            let direction = 'flat';
            if (delta > 0) direction = 'up';
            if (delta < 0) direction = 'down';
            const startLabel = start?.timestamp
                ? new Date(start.timestamp).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
                : 'recent updates';
            return { delta, direction, startLabel };
        }

        renderProgressCard(metric) {
            if (!metric || !metric.domain) {
                return '';
            }

            const { domain, percentage, breakdown, met, total, focusRequirement, tier, momentum } = metric;
            const focusText = focusRequirement
                ? `${this.escapeHtml(focusRequirement.id)} · ${this.escapeHtml(focusRequirement.title)}`
                : 'Everything is on track';
            const focusStatus = focusRequirement ? this.getStatusText(focusRequirement.status) : '';
            const momentumText = momentum.delta === 0
                ? 'No movement captured yet'
                : `${momentum.delta > 0 ? '+' : ''}${momentum.delta}% since ${momentum.startLabel}`;

            return `
                <div class="progress-card ${tier.key}">
                    <div class="progress-card-tier">
                        <div>
                            <p class="progress-card-label">${this.escapeHtml(domain.title)}</p>
                            <span class="progress-tier-pill ${tier.key}">${tier.label}</span>
                        </div>
                        <div class="progress-meta">
                            <span class="progress-percentage">${percentage}%</span>
                            <span class="progress-completed">${met}/${total} met</span>
                        </div>
                    </div>
                    <div class="progress-bar" aria-label="${this.escapeHtml(domain.title)} compliance ${percentage}%">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-breakdown">
                        <span class="status-chip yes">${breakdown.yes + breakdown.na} met</span>
                        <span class="status-chip partial">${breakdown.partial} in progress</span>
                        <span class="status-chip no">${breakdown.no + breakdown['not-set']} open</span>
                    </div>
                    <div class="progress-focus">
                        <div>
                            <p class="progress-focus-label">Next focus</p>
                            <p class="progress-focus-value">${focusText}</p>
                        </div>
                        ${focusRequirement ? `<span class="progress-focus-status ${focusRequirement.status}">${focusStatus}</span>` : ''}
                    </div>
                    <div class="progress-momentum ${momentum.direction}">
                        <span class="momentum-label">Momentum</span>
                        <span class="momentum-value">${momentumText}</span>
                    </div>
                    <div class="progress-actions">
                        <button class="btn btn-outline btn-small" data-action="view-domain" data-domain-id="${domain.id}">
                            Manage Compliance
                        </button>
                    </div>
                </div>
            `;
        }

        renderProgressInsights(domainMetrics = []) {
            const container = document.getElementById('progressInsights');
            if (!container) {
                return;
            }

            if (!Array.isArray(domainMetrics) || domainMetrics.length === 0) {
                container.innerHTML = '<div class="insight-empty">Update a requirement to generate insight narratives.</div>';
                return;
            }

            const leader = [...domainMetrics].sort((a, b) => b.percentage - a.percentage)[0];
            const riskiest = [...domainMetrics].sort((a, b) => (b.breakdown.no + b.breakdown['not-set']) - (a.breakdown.no + a.breakdown['not-set']))[0];
            const momentum = [...domainMetrics].sort((a, b) => a.momentum.delta - b.momentum.delta)[0];

            const cards = [
                {
                    label: 'Top performer',
                    title: leader?.domain?.title || 'N/A',
                    stat: `${leader?.percentage ?? 0}%`,
                    meta: `${leader?.met ?? 0}/${leader?.total ?? 0} requirements implemented`,
                    footnote: leader?.tier?.description || '',
                    tone: 'success'
                },
                {
                    label: 'Greatest risk',
                    title: riskiest?.domain?.title || 'N/A',
                    stat: `${(riskiest?.breakdown?.no || 0) + (riskiest?.breakdown?.['not-set'] || 0)} blockers`,
                    meta: `${riskiest?.breakdown?.no || 0} not met • ${riskiest?.breakdown?.['not-set'] || 0} no data`,
                    footnote: 'Prioritise remediation or assign a project owner.',
                    tone: 'warning'
                },
                {
                    label: 'Momentum watch',
                    title: momentum?.domain?.title || 'N/A',
                    stat: `${momentum?.momentum?.delta > 0 ? '+' : ''}${momentum?.momentum?.delta || 0}%`,
                    meta: momentum?.momentum?.delta === 0
                        ? 'No progress recorded in recent snapshots'
                        : `Change since ${momentum?.momentum?.startLabel || 'last update'}`,
                    footnote: momentum?.momentum?.direction === 'down'
                        ? 'Re-engage stakeholders before gaps widen.'
                        : 'Maintain cadence to lock in gains.',
                    tone: momentum?.momentum?.direction === 'down' ? 'danger'
                        : momentum?.momentum?.direction === 'up' ? 'success' : 'neutral'
                }
            ];

            container.innerHTML = cards.map(card => `
                <article class="progress-insight-card ${card.tone}">
                    <p class="insight-label">${card.label}</p>
                    <h4>${this.escapeHtml(card.title)}</h4>
                    <div class="insight-stat">${card.stat}</div>
                    <p class="insight-meta">${card.meta}</p>
                    <p class="insight-footnote">${card.footnote}</p>
                </article>
            `).join('');
        }

        renderProgressSignals(domainMetrics = []) {
            const grid = document.getElementById('progressFocusGrid');
            if (!grid) {
                return;
            }

            if (!Array.isArray(domainMetrics) || !domainMetrics.length) {
                grid.innerHTML = '';
                return;
            }

            const scoreboard = { leading: [], steady: [], lagging: [] };
            domainMetrics.forEach(metric => {
                const key = metric?.tier?.key || 'steady';
                scoreboard[key].push(metric.domain?.title || 'Unnamed domain');
            });

            const scoreboardGroups = [
                { key: 'leading', label: 'Leading', description: 'Audit ready' },
                { key: 'steady', label: 'On track', description: 'Monitor cadence' },
                { key: 'lagging', label: 'Needs help', description: 'Assign owners now' }
            ];

            const scoreboardHtml = scoreboardGroups.map(group => {
                const domains = scoreboard[group.key] || [];
                const names = domains.length ? domains.map(name => this.escapeHtml(name)).join(', ') : 'None yet';
                return `
                    <div class="scoreboard-group ${group.key}">
                        <span class="scoreboard-count">${domains.length}</span>
                        <div>
                            <p class="scoreboard-label">${group.label}</p>
                            <p class="scoreboard-description">${group.description}</p>
                            <p class="scoreboard-names">${names}</p>
                        </div>
                    </div>
                `;
            }).join('');

            const blockers = this.buildHighRiskRequirementList();
            const blockersHtml = blockers.length ? blockers.map(blocker => `
                <li class="blocker-item" data-action="view-requirement" data-requirement-id="${this.escapeHtml(blocker.reqId)}" tabindex="0" role="button">
                    <div>
                        <p class="blocker-title">${this.escapeHtml(blocker.reqId)} · ${this.escapeHtml(blocker.title)}</p>
                        <p class="blocker-meta">${this.escapeHtml(blocker.domainTitle)} · ${this.getStatusText(blocker.status)}</p>
                        ${blocker.comment ? `<p class="blocker-comment">${this.escapeHtml(blocker.comment)}</p>` : ''}
                    </div>
                </li>
            `).join('') : '<li class="blocker-empty">Great job! No critical blockers detected.</li>';

            grid.innerHTML = `
                <article class="focus-card">
                    <div class="focus-card-header">
                        <div>
                            <p class="focus-card-label">Domain scoreboard</p>
                            <h4>Where attention sits</h4>
                        </div>
                    </div>
                    <div class="scoreboard-grid">
                        ${scoreboardHtml}
                    </div>
                </article>
                <article class="focus-card">
                    <div class="focus-card-header">
                        <div>
                            <p class="focus-card-label">Top blockers</p>
                            <h4>Requirements slowing progress</h4>
                        </div>
                    </div>
                    <ul class="blocker-list">
                        ${blockersHtml}
                    </ul>
                </article>
            `;
        }

        buildHighRiskRequirementList(limit = 4) {
            const items = [];
            this.domains.forEach(domain => {
                const requirementIds = Array.isArray(domain.requirements) ? domain.requirements : [];
                requirementIds.forEach(reqId => {
                    const status = this.compliance[reqId]?.status || 'not-set';
                    if (status === 'no' || status === 'partial') {
                        const requirement = this.requirements[reqId];
                        items.push({
                            reqId,
                            title: requirement?.title || 'Untitled requirement',
                            status,
                            domainTitle: domain.title,
                            comment: this.compliance[reqId]?.comment || ''
                        });
                    }
                });
            });

            const priority = { no: 0, partial: 1 };
            items.sort((a, b) => {
                const aScore = priority[a.status] ?? 2;
                const bScore = priority[b.status] ?? 2;
                if (aScore !== bScore) {
                    return aScore - bScore;
                }
                return (b.comment?.length || 0) - (a.comment?.length || 0);
            });

            return items.slice(0, limit);
        }

        renderProgress() {
            this.renderEssentialEightWidget();

            const domainMetrics = this.domains
                .map(domain => this.buildDomainProgressMetric(domain))
                .filter(Boolean);

            const progressGrid = document.getElementById('progressGrid');
            if (progressGrid) {
                if (!domainMetrics.length) {
                    progressGrid.innerHTML = '<p class="history-empty-msg">No domain data available yet.</p>';
                } else {
                    progressGrid.innerHTML = domainMetrics.map(metric => this.renderProgressCard(metric)).join('');
                }
            }

            this.renderProgressInsights(domainMetrics);
            this.renderProgressSignals(domainMetrics);

            this.renderGapReport();
            this.renderUnassignedWidget();
            this.renderProgressHistorySection();
        }

            renderProgressHistorySection() {
                const grid = document.getElementById('domainHistoryGrid');
                if (grid) {
                    const cards = this.domains.map(domain => this.renderDomainHistoryCard(domain)).join('');
                    grid.innerHTML = cards || '<p class="history-empty-msg">No progress history yet. Update a requirement status to start tracking the trend.</p>';
                }
                this.renderRecentUpdatesList();
                this.renderTrendWatchSection();
            }

            renderDomainHistoryCard(domain) {
                const history = Array.isArray(this.progressHistory[domain.id]) ? this.progressHistory[domain.id] : [];
                if (!history.length) {
                    return `
                        <div class="history-card empty">
                            <div class="history-card-header">
                                <h4>${this.escapeHtml(domain.title)}</h4>
                                <span class="history-trend trend-neutral">No updates yet</span>
                            </div>
                            <p class="history-empty-msg">Change a requirement status to capture the first snapshot.</p>
                        </div>
                    `;
                }
                const latest = history[history.length - 1];
                const previous = history.length > 1 ? history[history.length - 2] : null;
                const delta = previous ? latest.percentage - previous.percentage : 0;
                const trendClass = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-neutral';
                const deltaText = previous ? `${delta > 0 ? '+' : ''}${delta}% since last update` : 'Baseline snapshot';
                const markers = history.slice(-4).map(entry => `<span class="history-dot" title="${this.formatTimestamp(entry.timestamp)}">${entry.percentage}%</span>`).join('');
                const breakdown = latest?.breakdown && typeof latest.breakdown === 'object' ? latest.breakdown : null;
                const hasBreakdown = !!breakdown;
                const notMet = hasBreakdown ? (breakdown.no || 0) : null;
                const riskManaged = hasBreakdown ? (breakdown.partial || 0) : null;
                const notSet = hasBreakdown ? (breakdown['not-set'] || 0) : null;
                return `
                    <div class="history-card">
                        <div class="history-card-header">
                            <div>
                                <h4>${this.escapeHtml(domain.title)}</h4>
                                <p class="history-meta">Last update ${this.formatTimestamp(latest.timestamp)}</p>
                            </div>
                            <span class="history-trend ${trendClass}">${deltaText}</span>
                        </div>
                        <div class="history-dots">${markers}</div>
                        <div class="history-summary">
                            <span><strong>${latest.met}</strong> met</span>
                            ${hasBreakdown ? `<span><strong>${riskManaged}</strong> risk managed</span>` : ''}
                            ${hasBreakdown ? `<span><strong>${notMet}</strong> not met</span>` : ''}
                            ${hasBreakdown ? `<span><strong>${notSet}</strong> not set</span>` : ''}
                            <span><strong>${latest.total}</strong> total</span>
                            <span>${latest.percentage}% compliance</span>
                        </div>
                    </div>
                `;
            }

            getStatusScore(status) {
                switch (status) {
                    case 'yes':
                    case 'na':
                        return 3;
                    case 'partial':
                        return 2;
                    case 'no':
                        return 1;
                    default:
                        return 0;
                }
            }

            normalizeStatus(status) {
                return ['not-set', 'yes', 'no', 'partial', 'na'].includes(status) ? status : 'not-set';
            }

            listRequirementIdsForDomain(domainId) {
                if (!domainId) {
                    return Object.keys(this.requirements || {});
                }
                const domain = this.domains.find(d => d.id === domainId);
                if (!domain) return [];
                return Array.isArray(domain.requirements) ? domain.requirements.slice() : [];
            }

            computeTrendWatchData({ domainId = '', days = 30, now = new Date() } = {}) {
                const nowDate = now instanceof Date ? now : new Date(now);
                const nowMs = nowDate.getTime();
                const daysMs = Math.max(1, Number(days) || 30) * 24 * 60 * 60 * 1000;
                const cutoffMs = nowMs - daysMs;

                const requirementIds = this.listRequirementIdsForDomain(domainId);
                const totals = { yes: 0, partial: 0, no: 0, na: 0, 'not-set': 0 };
                const items = [];

                requirementIds.forEach(reqId => {
                    const requirement = this.requirements[reqId];
                    if (!requirement) return;
                    const domainTitle = this.domains.find(d => d.id === requirement.domainId)?.title || 'Unknown domain';
                    const compliance = this.compliance[reqId] || {};
                    const currentStatus = this.normalizeStatus(compliance.status || 'not-set');
                    if (Object.prototype.hasOwnProperty.call(totals, currentStatus)) {
                        totals[currentStatus] += 1;
                    }

                    if (!(currentStatus === 'no' || currentStatus === 'partial')) {
                        return;
                    }

                    const history = Array.isArray(compliance.history) ? compliance.history : [];
                    const lastEntry = history.length ? history[history.length - 1] : null;
                    const prevEntry = history.length > 1 ? history[history.length - 2] : null;
                    const lastChangedAt = lastEntry?.timestamp || null;
                    const lastChangedMs = lastChangedAt ? new Date(lastChangedAt).getTime() : Number.NaN;
                    const hasValidLastChanged = Number.isFinite(lastChangedMs);
                    const daysSinceChange = hasValidLastChanged ? Math.floor((nowMs - lastChangedMs) / (24 * 60 * 60 * 1000)) : null;
                    const changedWithinWindow = hasValidLastChanged ? lastChangedMs >= cutoffMs : false;

                    const previousStatus = prevEntry?.status ? this.normalizeStatus(prevEntry.status) : null;
                    const prevScore = previousStatus ? this.getStatusScore(previousStatus) : null;
                    const curScore = this.getStatusScore(currentStatus);

                    let direction = 'flat';
                    if (prevScore !== null) {
                        if (curScore > prevScore) direction = 'up';
                        if (curScore < prevScore) direction = 'down';
                    }

                    const stuck = !hasValidLastChanged || nowMs - lastChangedMs >= daysMs;

                    items.push({
                        reqId,
                        title: requirement.title || reqId,
                        domainId: requirement.domainId,
                        domainTitle,
                        currentStatus,
                        previousStatus,
                        direction,
                        lastChangedAt,
                        daysSinceChange,
                        changedWithinWindow,
                        stuck
                    });
                });

                const improving = items.filter(item => item.direction === 'up' && item.changedWithinWindow);
                const regressing = items.filter(item => item.direction === 'down' && item.changedWithinWindow);
                const stuckItems = items.filter(item => item.stuck);

                const sortByAgeDesc = (a, b) => {
                    const aAge = typeof a.daysSinceChange === 'number' ? a.daysSinceChange : 99999;
                    const bAge = typeof b.daysSinceChange === 'number' ? b.daysSinceChange : 99999;
                    return bAge - aAge;
                };
                stuckItems.sort(sortByAgeDesc);

                const sortByRecent = (a, b) => {
                    const aMs = a.lastChangedAt ? new Date(a.lastChangedAt).getTime() : 0;
                    const bMs = b.lastChangedAt ? new Date(b.lastChangedAt).getTime() : 0;
                    return bMs - aMs;
                };

                return {
                    totals,
                    items,
                    stuck: stuckItems,
                    improving: improving.sort(sortByRecent),
                    regressing: regressing.sort(sortByRecent)
                };
            }

            renderTrendWatchSection() {
                const card = document.getElementById('trendWatchCard');
                if (!card) return;

                const domainSelect = document.getElementById('trendWatchDomainSelect');
                const thresholdSelect = document.getElementById('trendWatchThreshold');
                const metricsEl = document.getElementById('trendWatchMetrics');
                const listEl = document.getElementById('trendWatchList');
                if (!domainSelect || !thresholdSelect || !metricsEl || !listEl) return;

                // Populate domain options once.
                if (!domainSelect.dataset.ready) {
                    const domainOptions = ['<option value="">All domains</option>']
                        .concat(this.domains.map(domain => `<option value="${this.escapeHtml(domain.id)}">${this.escapeHtml(domain.title)}</option>`));
                    domainSelect.innerHTML = domainOptions.join('');
                    domainSelect.dataset.ready = 'true';
                }

                const storedDomain = this.readStorage(TREND_WATCH_DOMAIN_KEY, '');
                const storedDaysRaw = this.readStorage(TREND_WATCH_DAYS_KEY, 30);
                const storedDays = Number(storedDaysRaw);

                if (!domainSelect.dataset.bound) {
                    domainSelect.value = typeof storedDomain === 'string' ? storedDomain : '';
                    if (![...domainSelect.options].some(opt => opt.value === domainSelect.value)) {
                        domainSelect.value = '';
                    }
                    domainSelect.addEventListener('change', () => {
                        this.writeStorage(TREND_WATCH_DOMAIN_KEY, domainSelect.value || '');
                        this.renderTrendWatchSection();
                    });
                    domainSelect.dataset.bound = 'true';
                }

                if (!thresholdSelect.dataset.bound) {
                    if (Number.isFinite(storedDays)) {
                        const candidate = String(Math.max(1, Math.round(storedDays)));
                        if ([...thresholdSelect.options].some(opt => opt.value === candidate)) {
                            thresholdSelect.value = candidate;
                        }
                    }
                    thresholdSelect.addEventListener('change', () => {
                        const parsed = Number(thresholdSelect.value);
                        this.writeStorage(TREND_WATCH_DAYS_KEY, Number.isFinite(parsed) ? parsed : 30);
                        this.renderTrendWatchSection();
                    });
                    thresholdSelect.dataset.bound = 'true';
                }

                const domainId = domainSelect.value || '';
                const days = Number(thresholdSelect.value) || 30;
                const data = this.computeTrendWatchData({ domainId, days, now: new Date() });

                const notMetTotal = data.totals.no || 0;
                const riskManagedTotal = data.totals.partial || 0;
                const stuckCount = data.stuck.length;
                const improvingCount = data.improving.length;
                const regressingCount = data.regressing.length;

                metricsEl.innerHTML = [
                    `<span class="trend-chip"><strong>${notMetTotal}</strong> not met</span>`,
                    `<span class="trend-chip"><strong>${riskManagedTotal}</strong> risk managed</span>`,
                    `<span class="trend-chip trend-neutral"><strong>${stuckCount}</strong> stuck ≥ ${days}d</span>`,
                    `<span class="trend-chip trend-up"><strong>${improvingCount}</strong> improved (last ${days}d)</span>`,
                    `<span class="trend-chip trend-down"><strong>${regressingCount}</strong> regressed (last ${days}d)</span>`
                ].join('');

                const rows = [];

                const pushItem = (item, { flag } = {}) => {
                    const statusLabel = this.getStatusText(item.currentStatus);
                    const previousLabel = item.previousStatus ? this.getStatusText(item.previousStatus) : '—';
                    const ageLabel = typeof item.daysSinceChange === 'number' ? `${item.daysSinceChange}d ago` : 'No change recorded';
                    const flagMarkup = flag
                        ? `<span class="trend-flag ${flag}">${flag.replace('flag-', '')}</span>`
                        : '';
                    const directionLabel = item.previousStatus ? `${previousLabel} → ${statusLabel}` : statusLabel;

                    rows.push(`
                        <article class="trend-watch-item" data-action="view-requirement" data-requirement-id="${this.escapeHtml(item.reqId)}" tabindex="0" role="button">
                            <div>
                                <p class="trend-watch-title">${this.escapeHtml(item.reqId)} · ${this.escapeHtml(item.title)}</p>
                                <p class="trend-watch-meta">${this.escapeHtml(item.domainTitle)} · ${this.escapeHtml(directionLabel)} · ${ageLabel}</p>
                            </div>
                            <div class="trend-watch-badges">
                                ${flagMarkup}
                                <span class="recent-update-status ${item.currentStatus}">${statusLabel}</span>
                            </div>
                        </article>
                    `);
                };

                // Priority: regressions, then stuck, then recent improvements.
                data.regressing.slice(0, 6).forEach(item => pushItem(item, { flag: 'flag-regressing' }));
                data.stuck.slice(0, 8).forEach(item => pushItem(item, { flag: 'flag-stuck' }));
                data.improving.slice(0, 4).forEach(item => pushItem(item, { flag: 'flag-improving' }));

                listEl.innerHTML = rows.length
                    ? rows.join('')
                    : '<p class="empty-history">Nothing to watch right now. Mark some requirements Not Met or Risk Managed to start tracking movement.</p>';
            }

            getRecentRequirementUpdates(limit = 6) {
                const entries = [];
                Object.keys(this.compliance).forEach(reqId => {
                    const history = Array.isArray(this.compliance[reqId]?.history) ? this.compliance[reqId].history : [];
                    if (!history.length) return;
                    const last = history[history.length - 1];
                    const previous = history.length > 1 ? history[history.length - 2] : null;
                    entries.push({
                        reqId,
                        status: last.status,
                        timestamp: last.timestamp,
                        previousStatus: previous?.status || null,
                        domainId: last.domainId || this.requirements[reqId]?.domainId,
                        domainTitle: this.domains.find(d => d.id === (last.domainId || this.requirements[reqId]?.domainId))?.title || 'Unknown domain',
                        title: this.requirements[reqId]?.title || ''
                    });
                });
                entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return entries.slice(0, limit);
            }

            renderRecentUpdatesList(limit = 6) {
                const container = document.getElementById('recentUpdatesList');
                if (!container) return;
                const updates = this.getRecentRequirementUpdates(limit);
                if (!updates.length) {
                    container.innerHTML = '<p class="empty-history">No requirement updates recorded yet. Change a status to begin tracking progress.</p>';
                    return;
                }
                container.innerHTML = updates.map(update => `
                    <article class="recent-update">
                        <div>
                            <p class="recent-update-title">${this.escapeHtml(update.reqId)} · ${this.escapeHtml(update.title)}</p>
                            <p class="recent-update-meta">${this.escapeHtml(update.domainTitle)} · ${this.getStatusText(update.status)} · ${this.formatTimestamp(update.timestamp)}</p>
                        </div>
                        <span class="recent-update-status ${update.status}">
                            ${update.previousStatus ? `${this.getStatusText(update.previousStatus)} → ` : ''}${this.getStatusText(update.status)}
                        </span>
                    </article>
                `).join('');
            }

            renderRequirementProgressHistory(reqId) {
                const history = Array.isArray(this.compliance[reqId]?.history) ? this.compliance[reqId].history : [];
                if (!history.length) {
                    return '<p class="history-empty-msg">No status updates yet. Set a compliance state to start the timeline.</p>';
                }
                return `
                    <ul class="requirement-history-list">
                        ${history.slice(-5).reverse().map(entry => `
                            <li>
                                <span class="history-entry-status ${entry.status}">${this.getStatusText(entry.status)}</span>
                                <span class="history-entry-meta">${this.formatTimestamp(entry.timestamp)}</span>
                            </li>
                        `).join('')}
                    </ul>
                `;
            }

            formatTimestamp(timestamp) {
                if (!timestamp) return 'Unknown time';
                const date = new Date(timestamp);
                if (Number.isNaN(date.getTime())) return 'Invalid date';
                return date.toLocaleString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

        renderMyWorkView() {
            if (!this.currentUserProfile) return;

            this.renderMyWorkTagFilters();
            const displayName = this.currentUserProfile.name || 'You';
            const assignments = this.getCurrentUserAssignmentMap();
            const activeFilters = this.myWorkActiveTagFilters;
            const requirementIds = Object.keys(assignments).filter(reqId => (assignments[reqId] || []).length > 0);
            const filteredIds = requirementIds.filter(reqId => {
                if (!activeFilters.size) return true;
                const tags = assignments[reqId] || [];
                return Array.from(activeFilters).some(tagId => tags.includes(tagId));
            });

            const requirements = filteredIds
                .map(reqId => this.requirements[reqId])
                .filter(Boolean)
                .sort((a, b) => a.id.localeCompare(b.id));

            this.updateMyWorkDashboard(requirements);
            this.renderMyWorkMiniHeatmap(requirements);

            const listContainer = document.getElementById('myWorkRequirementsList');
            if (listContainer) {
                if (!requirements.length) {
                    listContainer.innerHTML = `
                        <div class="empty-state">
                            <h3>${this.escapeHtml(displayName)}, this space is empty.</h3>
                            <p>Tag requirements to surface them in your personal workspace.</p>
                        </div>
                    `;
                } else {
                    listContainer.innerHTML = requirements.map(req => this.renderMyWorkRequirementCard(req)).join('');
                }
            }

            const userNameInput = document.getElementById('myWorkUserNameInput');
            if (userNameInput) {
                userNameInput.value = displayName;
                userNameInput.onblur = (event) => {
                    this.persistMyWorkUserName(event?.target?.value || '');
                };
            }
        }

        renderMyWorkTagFilters() {
            const container = document.getElementById('myWorkTagFilters');
            if (!container) return;

            container.innerHTML = Object.keys(this.tagDefinitions).map(tagId => {
                const tag = this.tagDefinitions[tagId];
                if (!tag) return '';
                const usageCount = this.getCurrentUserTagUsage(tagId);
                const isActive = this.myWorkActiveTagFilters.has(tagId);
                const disabledClass = usageCount === 0 ? 'disabled' : '';
                const colorValue = this.escapeHtml(tag.color || '#64748b');
                const activeStyle = isActive ? `background-color: ${colorValue}; color: white;` : '';
                const label = this.escapeHtml(tag.name || tagId);
                return `
                    <div class="tag-option ${isActive ? 'selected' : ''} ${disabledClass}" 
                         style="border-color: ${colorValue}; ${activeStyle}"
                         data-action="mywork-toggle-filter"
                         data-tag-id="${tagId}"
                         tabindex="0"
                         role="button"
                         title="${this.escapeHtml(tag.description || '')}">
                        ${label}${usageCount ? ` (${usageCount})` : ''}
                    </div>
                `;
            }).join('');
        }

        toggleMyWorkFilter(tagId) {
            if (!tagId) return;
            if (this.getCurrentUserTagUsage(tagId) === 0) return;
            if (this.myWorkActiveTagFilters.has(tagId)) {
                this.myWorkActiveTagFilters.delete(tagId);
            } else {
                this.myWorkActiveTagFilters.add(tagId);
            }
            this.saveMyWorkFilters();
            this.renderMyWorkView();
        }

        clearMyWorkFilters() {
            if (!this.myWorkActiveTagFilters.size) return;
            this.myWorkActiveTagFilters.clear();
            this.saveMyWorkFilters();
            this.renderMyWorkView();
        }

        renderMyWorkRequirementCard(requirement) {
            const tags = this.getUserRequirementTags(requirement.id);
            const compliance = this.compliance[requirement.id] || { status: 'not-set' };
            const safeDescription = requirement.description ? this.escapeHtml(requirement.description) : '';
            const descriptionText = safeDescription.length > 160 ? `${safeDescription.substring(0, 160)}…` : safeDescription;

            return `
                <article class="requirement-card" data-req="${requirement.id}">
                    <div class="requirement-header">
                        <div>
                            <h4>${requirement.id}</h4>
                            <p class="requirement-meta">${this.escapeHtml(requirement.title)}</p>
                        </div>
                        <span class="status-badge ${compliance.status}">${this.getStatusText(compliance.status)}</span>
                    </div>
                    <p class="requirement-description">${descriptionText}</p>
                    <div class="tag-selector tag-selector-inline">
                        ${this.renderMyWorkTagOptions(requirement.id, tags)}
                    </div>
                    <div class="requirement-actions">
                        <button class="btn btn-link btn-small" data-action="view-requirement" data-requirement-id="${requirement.id}">View details</button>
                    </div>
                </article>
            `;
        }

        renderMyWorkTagOptions(requirementId, selectedTags) {
            return Object.keys(this.tagDefinitions).map(tagId => {
                const tag = this.tagDefinitions[tagId];
                if (!tag) return '';
                const isSelected = selectedTags.includes(tagId);
                const colorValue = this.escapeHtml(tag.color || '#64748b');
                const style = isSelected ? `background-color: ${colorValue}; color: white; border-color: ${colorValue};` : `border-color: ${colorValue};`;
                return `
                    <div class="tag-option ${isSelected ? 'selected' : ''}"
                         style="${style}"
                         data-action="toggle-tag"
                         data-requirement-id="${requirementId}"
                         data-tag-id="${tagId}"
                         tabindex="0"
                         role="button"
                         title="${this.escapeHtml(tag.description || '')}">
                        ${this.escapeHtml(tag.name || tagId)}
                    </div>
                `;
            }).join('');
        }

        updateMyWorkDashboard(requirements) {
            const total = requirements.length;
            const statuses = requirements.map(req => this.compliance[req.id]?.status || 'not-set');
            const metCount = statuses.filter(status => status === 'yes' || status === 'na').length;
            const partialCount = statuses.filter(status => status === 'partial').length;
            const notMetCount = statuses.filter(status => status === 'no').length;
            const notSetCount = statuses.filter(status => status === 'not-set').length;
            const complianceRate = total ? Math.round((metCount / total) * 100) : 0;

            const totalEl = document.getElementById('myWorkTotalAssignments');
            const complianceEl = document.getElementById('myWorkComplianceRate');
            const metEl = document.getElementById('myWorkMetCount');
            const partialEl = document.getElementById('myWorkPartialCount');
            const notMetEl = document.getElementById('myWorkNotMetCount');
            const notSetEl = document.getElementById('myWorkNoDataCount');

            if (totalEl) totalEl.textContent = total;
            if (complianceEl) complianceEl.textContent = `${complianceRate}%`;
            if (metEl) metEl.textContent = metCount;
            if (partialEl) partialEl.textContent = partialCount;
            if (notMetEl) notMetEl.textContent = notMetCount;
            if (notSetEl) notSetEl.textContent = notSetCount;
        }

        renderMyWorkMiniHeatmap(requirements) {
            const heatmap = document.getElementById('myWorkMiniHeatmap');
            if (!heatmap) return;
            if (!requirements.length) {
                heatmap.innerHTML = '<p class="subtitle-sm">No tagged requirements yet.</p>';
                return;
            }
            heatmap.innerHTML = requirements.map(req => {
                const status = this.compliance[req.id]?.status || 'not-set';
                const label = `${req.id}: ${this.getStatusText(status)}`;
                return `<span class="requirement-chip ${status}" title="${label}" aria-label="${label}"></span>`;
            }).join('');
        }

        getCurrentUserTagUsage(tagId) {
            if (!this.currentUserProfile) return 0;
            const assignments = this.getCurrentUserAssignmentMap();
            return Object.values(assignments).filter(tags => tags.includes(tagId)).length;
        }

        performSearch(query) {
            const results = [];
            const searchResults = document.getElementById('searchResults');
            const spinner = document.getElementById('searchSpinner');

            if (spinner) spinner.style.display = 'block';
            if (searchResults) searchResults.innerHTML = '';

            // Search projects
            this.projects.forEach(project => {
                if (project.name.toLowerCase().includes(query) || 
                    project.description.toLowerCase().includes(query)) {
                    results.push({
                        type: 'Project',
                        title: project.name,
                        description: project.description,
                        id: project.id
                    });
                }
            });

            // Search risks
            this.risks.forEach(risk => {
                if (risk.name.toLowerCase().includes(query) || 
                    risk.description.toLowerCase().includes(query) ||
                    risk.mitigation.toLowerCase().includes(query)) {
                    results.push({
                        type: 'Risk',
                        title: risk.name,
                        description: risk.description,
                        severity: risk.severity,
                        id: risk.id
                    });
                }
            });

            // Search requirements
            Object.values(this.requirements).forEach(requirement => {
                if (requirement.title.toLowerCase().includes(query) || 
                    requirement.description.toLowerCase().includes(query) ||
                    requirement.id.toLowerCase().includes(query)) {
                    const domain = this.domains.find(d => d.id === requirement.domainId);
                    results.push({
                        type: 'Requirement',
                        title: requirement.title,
                        description: requirement.description,
                        domain: domain ? domain.title : 'Unknown',
                        domainId: requirement.domainId,
                        reqId: requirement.id
                    });
                }
            });

            if (results.length === 0) {
                if (spinner) spinner.style.display = 'none';
                searchResults.innerHTML = '<p>No results found for your search.</p>';
                return;
            }

            const renderSearchResult = (result) => {
                const action = result.reqId ? 'view-requirement'
                    : result.type === 'Project' ? 'view-project'
                        : result.type === 'Risk' ? 'view-risk'
                            : result.domainId ? 'view-domain'
                                : '';
                const datasetAttrs = [
                    result.reqId ? `data-requirement-id="${result.reqId}"` : '',
                    result.projectId ? `data-project-id="${result.projectId}"` : (result.id && result.type === 'Project') ? `data-project-id="${result.id}"` : '',
                    result.domainId ? `data-domain-id="${result.domainId}"` : '',
                    result.riskId ? `data-risk-id="${result.riskId}"` : (result.type === 'Risk' && result.id) ? `data-risk-id="${result.id}"` : ''
                ].filter(Boolean).join(' ');
                const actionAttr = action ? `data-action="${action}"` : '';
                return `
                    <div class="search-result-item ${action ? 'search-result-clickable' : ''}" role="${action ? 'button' : 'article'}" tabindex="${action ? 0 : -1}" ${actionAttr} ${datasetAttrs}>
                        <span class="result-type ${result.type.toLowerCase()}">${result.type}</span>
                        ${result.reqId ? `<span class="result-req-id">${result.reqId}</span>` : ''}
                        <h4>${result.title}</h4>
                        <p>${result.description}</p>
                        ${result.domain ? `<span class="result-domain ${result.domainId ? 'result-domain-clickable' : ''}">Domain: ${result.domain}</span>` : ''}
                        ${result.severity ? `<span class="result-severity severity-${result.severity}">Risk Level: ${result.severity.toUpperCase()}</span>` : ''}
                    </div>
                `;
            };

            searchResults.innerHTML = `
                <h3>Search Results (${results.length})</h3>
                <div class="search-results-list">
                    ${results.map(renderSearchResult).join('')}
                </div>
            `;
            if (spinner) spinner.style.display = 'none';
        }

        // Project Management
        renderProjects() {
            const projectsList = document.getElementById('projectsList');
            if (!projectsList) return;

            if (this.projects.length === 0) {
                projectsList.innerHTML = `
                    <div class="empty-state">
                        <h3>No projects yet</h3>
                        <p>Create your first project to start tracking compliance work.</p>
                    </div>
                `;
                this.currentProjectId = null;
                this.clearProjectDetails();
                this.renderProjectRequirementWidget();
                return;
            }

            const selectedProjectExists = this.currentProjectId && this.projects.some(p => p.id === this.currentProjectId);

            projectsList.innerHTML = this.projects.map(project => `
                <div class="project-item ${selectedProjectExists && this.currentProjectId === project.id ? 'active' : ''}" data-project="${project.id}" data-action="view-project" data-project-id="${project.id}" tabindex="0" role="button">
                    <div class="project-name">${this.escapeHtml(project.name)}</div>
                    <div class="project-meta">
                        <span class="project-status ${project.status}">${this.getStatusText(project.status)}</span>
                        <span>${this.getProjectRisksCount(project.id)} risks</span>
                    </div>
                </div>
            `).join('');
            
            if (selectedProjectExists) {
                this.showProjectDetails(this.currentProjectId);
            } else {
                this.currentProjectId = null;
                this.clearProjectDetails();
            }

            this.renderProjectRequirementWidget();
        }

        renderProjectRequirementWidget() {
            const container = document.getElementById('projectRequirementsWidget');
            if (!container) return;

            if (this.projects.length === 0) {
                container.innerHTML = `
                    <div class="project-requirement-card">
                        <p class="empty-state">Create a project to start mapping requirements.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.projects.map(project => {
                const requirements = Array.isArray(project.requirements) ? project.requirements : [];
                const requirementRows = requirements.length > 0 ? requirements.map(reqId => {
                    const requirement = this.requirements[reqId];
                    const title = requirement ? requirement.title : 'Unknown requirement';
                    const domain = requirement ? this.domains.find(d => d.id === requirement.domainId) : null;
                    const domainLabel = domain ? domain.title : '';
                    const status = this.compliance[reqId]?.status || 'not-set';
                    return `
                        <div class="project-requirement-row">
                            <div>
                                <div class="project-requirement-title">${this.escapeHtml(title)}</div>
                                <div class="project-requirement-meta">
                                    <span class="requirement-code">${this.escapeHtml(reqId)}</span>
                                    ${domainLabel ? `<span>• ${this.escapeHtml(domainLabel)}</span>` : ''}
                                </div>
                            </div>
                            <span class="requirement-status ${status}">${this.getStatusText(status)}</span>
                        </div>
                    `;
                }).join('') : `
                    <div class="project-requirement-row empty-state">
                        <p class="subtitle-sm">No requirements tagged yet.</p>
                    </div>
                `;

                return `
                    <div class="project-requirement-card">
                        <div class="project-card-header">
                            <div>
                                <h4>${this.escapeHtml(project.name)}</h4>
                                <p class="subtitle-sm">${requirements.length} linked requirement${requirements.length === 1 ? '' : 's'}</p>
                            </div>
                            <span class="project-status ${project.status}">${this.getStatusText(project.status)}</span>
                        </div>
                        <div class="project-requirement-list">
                            ${requirementRows}
                        </div>
                    </div>
                `;
            }).join('');
        }

        showProjectDetails(projectId) {
            const projectDetails = document.getElementById('projectDetails');
            if (!projectDetails) return;

            const project = this.projects.find(p => p.id === projectId);
            if (!project) {
                this.clearProjectDetails();
                return;
            }

            if (!Array.isArray(project.requirements)) {
                project.requirements = [];
            }

            this.currentProjectId = projectId;

            this.updateBreadcrumb([
                { text: 'PSPF Domains', level: 'home' },
                { text: 'Projects', level: 'projects' },
                { text: project.name, level: 'project' }
            ]);

            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.toggle('active', item.dataset.project === projectId);
            });

            const safeName = this.escapeHtml(project.name);
            const safeDescription = project.description ? this.escapeHtml(project.description) : 'No description provided yet.';
            const createdLabel = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown';
            const requirementsCount = this.getProjectRequirementsCount(projectId);
            const risksCount = this.getProjectRisksCount(projectId);
            const incidentsCount = this.getProjectIncidentsCount(projectId);
            const linkedRequirements = Array.isArray(project.requirements) ? project.requirements : [];
            const metRequirements = linkedRequirements.filter(reqId => this.compliance[reqId]?.status === 'yes').length;
            const progressPercent = linkedRequirements.length ? Math.round((metRequirements / linkedRequirements.length) * 100) : 0;

            projectDetails.innerHTML = `
                <div class="project-header">
                    <div class="project-header-main">
                        <div class="project-meta-row">
                            <span class="project-status ${project.status}">${this.getStatusText(project.status)}</span>
                            <span class="text-secondary">Created ${createdLabel}</span>
                        </div>
                        <h3>${safeName}</h3>
                        <p class="subtitle-sm">${safeDescription}</p>
                        <div class="project-progress-compact">
                            <div class="progress-compact" aria-label="Project requirement progress">
                                <div class="progress-compact-fill" id="projectProgressFill" style="width:${progressPercent}%"></div>
                            </div>
                            <span id="projectProgressText">${progressPercent}% complete</span>
                        </div>
                    </div>
                    <div class="project-header-actions">
                        <button class="btn btn-primary" data-action="edit-project" data-project-id="${project.id}">Edit Project</button>
                        <button class="btn btn-outline" data-action="link-requirements" data-project-id="${project.id}">Link Requirements</button>
                        <button class="btn btn-outline" data-action="add-risk" data-project-id="${project.id}">Add Risk</button>
                        <button class="btn btn-outline" data-action="add-incident" data-project-id="${project.id}">Add Event</button>
                        <button class="btn btn-danger" data-action="delete-project" data-project-id="${project.id}">Delete Project</button>
                    </div>
                </div>

                <div class="project-detail-meta">
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Requirements</div>
                        <div class="project-detail-meta-value">${requirementsCount}</div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Risks</div>
                        <div class="project-detail-meta-value">${risksCount}</div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Events</div>
                        <div class="project-detail-meta-value">${incidentsCount}</div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Met Requirements</div>
                        <div class="project-detail-meta-value">${metRequirements}</div>
                    </div>
                </div>

                <div class="content-tabs">
                    <div class="tab-nav">
                        <button class="tab-btn active" data-tab="risks">Risks <span class="tab-count" id="risksCount">${risksCount}</span></button>
                        <button class="tab-btn" data-tab="requirements">Requirements <span class="tab-count" id="requirementsCount">${requirementsCount}</span></button>
                        <button class="tab-btn" data-tab="incidents">Events <span class="tab-count" id="incidentsCount">${incidentsCount}</span></button>
                    </div>
                    <div class="tab-content">
                        <div class="tab-pane active" id="risksTab">
                            <div class="section-header">
                                <div>
                                    <h3>Risks</h3>
                                    <p class="subtitle-sm">Identify and monitor threats impacting this project.</p>
                                </div>
                                <button class="btn btn-outline" data-action="add-risk" data-project-id="${project.id}">Add Risk</button>
                            </div>
                            <div id="risksList" aria-live="polite"></div>
                        </div>
                        <div class="tab-pane" id="requirementsTab">
                            <div class="section-header">
                                <div>
                                    <h3>Linked Requirements</h3>
                                    <p class="subtitle-sm">Map the PSPF obligations this project supports.</p>
                                </div>
                                <button class="btn btn-outline" data-action="link-requirements" data-project-id="${project.id}">Link Requirements</button>
                            </div>
                            <div id="projectRequirementsList" aria-live="polite"></div>
                        </div>
                        <div class="tab-pane" id="incidentsTab">
                            <div class="section-header">
                                <div>
                                    <h3>Events & Lessons</h3>
                                    <p class="subtitle-sm">Capture incidents, milestones, and outcomes.</p>
                                </div>
                                <button class="btn btn-outline" data-action="add-incident" data-project-id="${project.id}">Add Event</button>
                            </div>
                            <div id="incidentsList" aria-live="polite"></div>
                        </div>
                    </div>
                </div>
            `;

            this.switchProjectTab('risks');
            this.updateProjectTabCounts();
        }

        clearProjectDetails() {
            const projectDetails = document.getElementById('projectDetails');
            if (projectDetails) {
                projectDetails.innerHTML = `
                    <div class="placeholder-content">
                        <h4>Select a Project</h4>
                        <p>Choose a project from the list to view its details and track risks or events.</p>
                    </div>
                `;
            }
        }

        getProjectRisksCount(projectId) {
            return this.risks.filter(risk => risk.projectId === projectId).length;
        }

        getProjectRequirementsCount(projectId) {
            const project = this.projects.find(p => p.id === projectId);
            return (project && project.requirements) ? project.requirements.length : 0;
        }

        getProjectIncidentsCount(projectId) {
            return this.incidents.filter(incident => incident.projectId === projectId).length;
        }

        addRisk(projectId) {
            this.currentProjectId = projectId;
            this.showRiskModal(null, projectId);
        }

        showProjectModal(projectId = null) {
            this.editingProject = projectId;
            const modal = document.getElementById('projectModal');
            const title = document.getElementById('projectModalTitle');
            const form = document.getElementById('projectForm');

            if (projectId) {
                const project = this.projects.find(p => p.id === projectId);
                if (project) {
                    // Ensure requirements array exists on legacy records
                    if (!Array.isArray(project.requirements)) project.requirements = [];
                    title.textContent = 'Edit Project';
                    document.getElementById('projectName').value = project.name;
                    document.getElementById('projectDesc').value = project.description;
                    document.getElementById('projectStatusSelect').value = project.status;
                }
            } else {
                title.textContent = 'Add Project';
                form.reset();
            }

            if (modal) {
                this.openModal(modal, { initialFocusSelector: '#projectName' });
            }
        }

        handleProjectForm(e) {
            e.preventDefault();
            
            const projectData = {
                name: document.getElementById('projectName').value,
                description: document.getElementById('projectDesc').value,
                status: document.getElementById('projectStatusSelect').value,
                createdAt: new Date().toISOString()
            };

            if (this.editingProject) {
                const index = this.projects.findIndex(p => p.id === this.editingProject);
                if (index !== -1) {
                    this.projects[index] = { ...this.projects[index], ...projectData, requirements: this.projects[index].requirements || [] };
                }
            } else {
                projectData.id = Date.now().toString();
                this.projects.push({ ...projectData, requirements: [] });
            }

            this.saveData();
            this.hideModal('projectModal');
            this.renderProjects();
            this.updateStats();
            this.updateDataStats();
        }

        deleteProject(projectId) {
            if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                this.projects = this.projects.filter(p => p.id !== projectId);
                this.risks = this.risks.filter(risk => risk.projectId !== projectId);
                this.incidents = this.incidents.filter(incident => incident.projectId !== projectId);
                this.saveData();
                this.renderProjects();
                this.clearProjectDetails();
                this.updateStats();
                this.updateDataStats();
            }
        }

        updateProjectTabCounts() {
            const risksCountEl = document.getElementById('risksCount');
            const incidentsCountEl = document.getElementById('incidentsCount');
            const reqCountEl = document.getElementById('requirementsCount');
            const pid = this.currentProjectId;
            if (risksCountEl) risksCountEl.textContent = this.risks.filter(r => r.projectId === pid).length;
            if (incidentsCountEl) incidentsCountEl.textContent = this.incidents.filter(i => i.projectId === pid).length;
            const project = this.projects.find(p => p.id === pid);
            if (reqCountEl) reqCountEl.textContent = project && Array.isArray(project.requirements) ? project.requirements.length : 0;
        }

        // Modal Management
        hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) this.closeModal(modal);
            this.editingProject = null;
            this.editingRisk = null;
            this.editingIncident = null;
        }

        getFocusableElements(container) {
            if (!container) return [];
            const selectors = [
                'a[href]',
                'area[href]',
                'button:not([disabled])',
                'input:not([disabled]):not([type="hidden"])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
                '[contenteditable="true"]'
            ];
            const nodes = Array.from(container.querySelectorAll(selectors.join(',')));
            return nodes.filter(node => {
                const style = window.getComputedStyle(node);
                if (style.visibility === 'hidden' || style.display === 'none') return false;
                return node.getClientRects().length > 0;
            });
        }

        ensureModalAria(modal) {
            if (!modal || typeof document === 'undefined') return;
            if (!modal.id) {
                this._modalIdSeed += 1;
                modal.id = `modal-${this._modalIdSeed}`;
            }
            if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog');
            if (!modal.hasAttribute('aria-modal')) modal.setAttribute('aria-modal', 'true');
            if (!modal.hasAttribute('aria-hidden')) modal.setAttribute('aria-hidden', 'true');

            const content = modal.querySelector('.modal-content');
            if (content && !content.hasAttribute('tabindex')) {
                content.setAttribute('tabindex', '-1');
            }

            if (!modal.hasAttribute('aria-labelledby')) {
                const heading = content?.querySelector('h1, h2, h3, h4, h5, h6');
                if (heading) {
                    if (!heading.id) {
                        heading.id = `${modal.id}-title`;
                    }
                    modal.setAttribute('aria-labelledby', heading.id);
                }
            }
        }

        appendAriaDescribedBy(modal, id) {
            if (!modal || !id) return;
            const current = (modal.getAttribute('aria-describedby') || '').trim();
            const tokens = current ? current.split(/\s+/).filter(Boolean) : [];
            if (!tokens.includes(id)) tokens.push(id);
            if (tokens.length) {
                modal.setAttribute('aria-describedby', tokens.join(' '));
            }
        }

        setBackgroundAriaHidden(hidden) {
            const targets = [document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')];
            targets.forEach(el => {
                if (!el) return;
                if (hidden) el.setAttribute('aria-hidden', 'true');
                else el.removeAttribute('aria-hidden');
            });
        }

        openModal(modal, options = {}) {
            if (!modal || typeof document === 'undefined') return;

            const {
                initialFocusSelector,
                closeOnBackdrop = true,
                closeOnEscape = true
            } = options;

            // If already open via our state tracking, do nothing.
            if (this._modalState.has(modal)) return;

            this.ensureModalAria(modal);

            const previouslyFocused = document.activeElement;
            const content = modal.querySelector('.modal-content');

            const trapTabKey = (event) => {
                if (event.key !== 'Tab') return;
                const focusables = this.getFocusableElements(modal);
                if (focusables.length === 0) {
                    event.preventDefault();
                    content?.focus({ preventScroll: true });
                    return;
                }
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const active = document.activeElement;

                if (event.shiftKey) {
                    if (active === first || active === modal) {
                        event.preventDefault();
                        last.focus({ preventScroll: true });
                    }
                } else {
                    if (active === last) {
                        event.preventDefault();
                        first.focus({ preventScroll: true });
                    }
                }
            };

            const onKeyDown = (event) => {
                if (event.key === 'Escape' && closeOnEscape) {
                    event.preventDefault();
                    this.closeModal(modal);
                    return;
                }
                trapTabKey(event);
            };

            const onMouseDown = (event) => {
                if (!closeOnBackdrop) return;
                if (event.target === modal) {
                    this.closeModal(modal);
                }
            };

            this._modalState.set(modal, {
                previouslyFocused,
                onKeyDown,
                onMouseDown
            });

            // Page-level state (scroll lock + hide background from SR)
            this._openModalCount += 1;
            if (this._openModalCount === 1) {
                this._bodyOverflowBeforeModal = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                this.setBackgroundAriaHidden(true);
            }

            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            modal.addEventListener('keydown', onKeyDown);
            modal.addEventListener('mousedown', onMouseDown);

            // Focus the most appropriate element once visible
            requestAnimationFrame(() => {
                const initial = initialFocusSelector ? modal.querySelector(initialFocusSelector) : null;
                const focusables = this.getFocusableElements(modal);
                (initial || focusables[0] || content || modal).focus({ preventScroll: true });
            });
        }

        closeModal(modal) {
            if (!modal || typeof document === 'undefined') return;

            const state = this._modalState.get(modal);

            // Always hide, even if we didn't open it (keeps backwards compatibility).
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');

            if (state) {
                modal.removeEventListener('keydown', state.onKeyDown);
                modal.removeEventListener('mousedown', state.onMouseDown);
                this._modalState.delete(modal);

                this._openModalCount = Math.max(0, this._openModalCount - 1);
                if (this._openModalCount === 0) {
                    document.body.style.overflow = this._bodyOverflowBeforeModal || '';
                    this._bodyOverflowBeforeModal = null;
                    this.setBackgroundAriaHidden(false);
                }

                if (state.previouslyFocused && typeof state.previouslyFocused.focus === 'function') {
                    // Only restore if still in DOM
                    if (document.contains(state.previouslyFocused)) {
                        requestAnimationFrame(() => state.previouslyFocused.focus({ preventScroll: true }));
                    }
                }
            }
        }

        createModal(content, options = {}) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            if (options.id) modal.id = options.id;
            modal.innerHTML = content;

            this.ensureModalAria(modal);

            // Ensure dynamically-created modals have an explicit close button.
            const modalContent = modal.querySelector('.modal-content') || modal;
            if (modalContent && !modalContent.querySelector('.modal-close')) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'modal-close';
                closeBtn.setAttribute('aria-label', 'Close dialog');
                closeBtn.setAttribute('data-action', 'close-modal');
                closeBtn.setAttribute('data-modal-id', modal.id);
                closeBtn.textContent = '×';

                const heading = modalContent.querySelector('h1, h2, h3, h4, h5, h6');
                if (heading && heading.parentElement === modalContent) {
                    const header = document.createElement('div');
                    header.className = 'modal-header';
                    modalContent.insertBefore(header, heading);
                    header.appendChild(heading);
                    header.appendChild(closeBtn);
                } else {
                    modalContent.insertBefore(closeBtn, modalContent.firstChild);
                }
            }

            // Provide a consistent SR hint for keyboard users.
            const hintId = `${modal.id}-hint`;
            if (!modal.querySelector(`#${CSS.escape(hintId)}`)) {
                const hint = document.createElement('p');
                hint.id = hintId;
                hint.className = 'visually-hidden';
                hint.textContent = 'Press Escape to close this dialog.';
                modalContent.insertBefore(hint, modalContent.firstChild);
                this.appendAriaDescribedBy(modal, hintId);
            }

            // Track event listeners for cleanup
            modal._eventListeners = [];
            modal.addTrackedListener = (element, event, handler) => {
                if (!element) return;
                element.addEventListener(event, handler);
                modal._eventListeners.push({ element, event, handler });
            };

            const originalRemove = modal.remove.bind(modal);
            modal.remove = () => {
                modal._eventListeners.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
                modal._eventListeners = [];
                this.closeModal(modal);
                this.activeModals.delete(modal);
                originalRemove();
            };

            document.body.appendChild(modal);
            this.activeModals.add(modal);
            this.openModal(modal, options);

            return modal;
        }

        // Risk Management CRUD Operations
        showRiskModal(riskId = null, projectId = null) {
            this.editingRisk = riskId;
            if (projectId) {
                this.currentProjectId = projectId;
            }
            const modal = document.getElementById('riskModal');
            const title = document.getElementById('riskModalTitle');
            const form = document.getElementById('riskForm');

            if (riskId) {
                const risk = this.risks.find(r => r.id === riskId);
                if (risk) {
                    if (!projectId && risk.projectId) {
                        this.currentProjectId = risk.projectId;
                    }
                    title.textContent = 'Edit Risk';
                    document.getElementById('riskName').value = risk.name;
                    document.getElementById('riskDesc').value = risk.description;
                    document.getElementById('riskLikelihood').value = risk.likelihood;
                    document.getElementById('riskImpact').value = risk.impact;
                    document.getElementById('riskMitigation').value = risk.mitigation || '';
                    this._applyExternalFieldGuards('risks', risk, form);
                }
            } else {
                title.textContent = 'Add Risk';
                form.reset();
                form.querySelector('.external-record-banner')?.remove();
                form.querySelectorAll('.field-locked').forEach(el => {
                    el.disabled = false;
                    el.classList.remove('field-locked');
                });
                form.querySelectorAll('.lock-icon').forEach(el => el.remove());
            }

            if (modal) {
                this.openModal(modal, { initialFocusSelector: '#riskName' });
            }
        }

        handleRiskForm(e) {
            e.preventDefault();
            this.saveRisk();
        }

        saveRisk() {
            const likelihood = document.getElementById('riskLikelihood').value;
            const impact = document.getElementById('riskImpact').value;
            const severity = this.calculateRiskSeverity(likelihood, impact);

            const riskData = {
                name: document.getElementById('riskName').value,
                description: document.getElementById('riskDesc').value,
                likelihood: likelihood,
                impact: impact,
                severity: severity,
                mitigation: document.getElementById('riskMitigation').value,
                projectId: this.currentProjectId,
                createdAt: new Date().toISOString()
            };

            if (this.editingRisk) {
                const index = this.risks.findIndex(r => r.id === this.editingRisk);
                if (index !== -1) {
                    const existing = this.risks[index];
                    // Restore locked field values for external records
                    if (this.isExternalRecord(existing)) {
                        (existing._externalSource.lockedFields || []).forEach(f => {
                            if (f in existing) riskData[f] = existing[f];
                        });
                    }
                    this.risks[index] = { ...existing, ...riskData };
                }
            } else {
                riskData.id = Date.now().toString();
                this.risks.push(riskData);
                this.trackEvent('risk:create');
            }

            this.saveData();
            this.hideModal('riskModal');
            this.renderRisks();
            this.updateDataStats();
            this.updateProjectTabCounts();
        }

        calculateRiskSeverity(likelihood, impact) {
            const values = {
                'very-low': 1,
                'low': 2,
                'medium': 3,
                'high': 4,
                'very-high': 5
            };

            const likelihoodValue = values[likelihood] || 1;
            const impactValue = values[impact] || 1;
            const score = likelihoodValue * impactValue;

            if (score <= 4) return 'low';
            if (score <= 10) return 'medium';
            if (score <= 16) return 'high';
            return 'critical';
        }

        editRisk(riskId) {
            const risk = this.risks.find(r => r.id === riskId);
            if (risk) {
                this.showRiskModal(riskId, risk.projectId);
            }
        }

        deleteRisk(riskId) {
            if (confirm('Are you sure you want to delete this risk? This action cannot be undone.')) {
                this.risks = this.risks.filter(r => r.id !== riskId);
                this.saveData();
                this.renderRisks();
                this.updateDataStats();
                this.updateProjectTabCounts();
            }
        }

        renderRisks(projectId = null) {
            const risksList = document.getElementById('risksList');
            if (!risksList) return;

            let risksToShow = this.risks;
            if (projectId) {
                risksToShow = this.risks.filter(r => r.projectId === projectId);
            }

            if (risksToShow.length === 0) {
                risksList.innerHTML = `
                    <div class="empty-state">
                        <h3>No risks identified</h3>
                        <p>Add risks to track and manage potential issues.</p>
                    </div>
                `;
                return;
            }

            risksList.innerHTML = risksToShow.map(risk => {
                const severityIcon = this.getRiskSeverityIcon(risk.severity);
                const severityClass = `severity-${risk.severity}`;
                const externalBadge = this.isExternalRecord(risk)
                    ? `<span class="external-record-badge" title="Sourced from ${this.escapeHtml(risk._externalSource.systemName)}">🔗 External</span>`
                    : '';

                return `
                    <div class="risk-card ${severityClass}">
                        <div class="risk-header">
                            <h4>${risk.name}${externalBadge ? ' ' + externalBadge : ''}</h4>
                            <div class="risk-severity">
                                <span class="severity-badge ${risk.severity}">${severityIcon} ${risk.severity.toUpperCase()}</span>
                            </div>
                        </div>
                        <p class="risk-description">${risk.description}</p>
                        <div class="risk-matrix">
                            <div class="risk-factor">
                                <span class="factor-label">Likelihood:</span>
                                <span class="factor-value ${risk.likelihood}">${risk.likelihood.replace('-', ' ')}</span>
                            </div>
                            <div class="risk-factor">
                                <span class="factor-label">Impact:</span>
                                <span class="factor-value ${risk.impact}">${risk.impact.replace('-', ' ')}</span>
                            </div>
                        </div>
                        ${risk.mitigation ? `
                            <div class="risk-mitigation">
                                <strong>Mitigation Strategy:</strong>
                                <p>${risk.mitigation}</p>
                            </div>
                        ` : ''}
                        <div class="risk-actions">
                            <button class="btn btn-outline btn-small" data-action="edit-risk" data-risk-id="${risk.id}">Edit</button>
                            <button class="btn btn-danger btn-small" data-action="delete-risk" data-risk-id="${risk.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        getRiskSeverityIcon(severity) {
            const icons = {
                'low': '🟢',
                'medium': '🟡',
                'high': '🟠',
                'critical': '🔴'
            };
            return icons[severity] || '⚪';
        }

        // Incident CRUD operations
        handleIncidentForm(e) {
            e.preventDefault();
            this.saveIncident();
        }

        showIncidentModal(incidentId = null, projectId = null) {
            const modal = document.getElementById('incidentModal');
            const title = document.getElementById('incidentModalTitle');
            const form = document.getElementById('incidentForm');
            if (!modal || !form) return;

            if (projectId) {
                this.currentProjectId = projectId;
            }

            if (!this.currentProjectId) {
                this.showNotification('Select a project before logging an event.', 'warning');
                return;
            }

            if (incidentId) {
                const incident = this.incidents.find(i => i.id === incidentId);
                if (incident) {
                    if (!projectId && incident.projectId) {
                        this.currentProjectId = incident.projectId;
                    }
                    this.editingIncident = incidentId;
                    title.textContent = 'Edit Event';
                    document.getElementById('incidentName').value = incident.name || '';
                    document.getElementById('incidentDesc').value = incident.description || '';
                    document.getElementById('incidentDate').value = this.formatDateTimeLocal(incident.date);
                    document.getElementById('incidentSeverity').value = incident.severity || 'low';
                    document.getElementById('incidentResolution').value = incident.resolution || '';
                }
            } else {
                this.editingIncident = null;
                title.textContent = 'Add Event';
                form.reset();
                const dateInput = document.getElementById('incidentDate');
                if (dateInput) {
                    dateInput.value = this.formatDateTimeLocal(new Date().toISOString());
                }
            }

            this.openModal(modal, { initialFocusSelector: '#incidentName' });
        }

        saveIncident() {
            if (!this.currentProjectId) {
                this.showNotification('Select a project before saving an event.', 'error');
                return;
            }

            const nameInput = document.getElementById('incidentName');
            const descriptionInput = document.getElementById('incidentDesc');
            const dateInput = document.getElementById('incidentDate');
            const severityInput = document.getElementById('incidentSeverity');
            const resolutionInput = document.getElementById('incidentResolution');

            const dateValue = dateInput?.value;
            const parsedDate = dateValue ? new Date(dateValue) : new Date();
            if (Number.isNaN(parsedDate.getTime())) {
                this.showNotification('Please provide a valid date for the event.', 'error');
                return;
            }

            const incidentData = {
                name: nameInput?.value.trim() || 'Untitled event',
                description: descriptionInput?.value.trim() || '',
                date: parsedDate.toISOString(),
                severity: severityInput?.value || 'low',
                resolution: resolutionInput?.value.trim() || '',
                projectId: this.currentProjectId,
                updatedAt: new Date().toISOString()
            };

            if (this.editingIncident) {
                const index = this.incidents.findIndex(i => i.id === this.editingIncident);
                if (index !== -1) {
                    this.incidents[index] = { ...this.incidents[index], ...incidentData };
                }
            } else {
                incidentData.id = Date.now().toString();
                incidentData.createdAt = incidentData.updatedAt;
                this.incidents.push(incidentData);
            }

            this.saveData();
            this.hideModal('incidentModal');
            this.renderIncidents(this.currentProjectId);
            this.updateProjectTabCounts();
            this.updateDataStats();
            this.showNotification('Event saved successfully.', 'success');
        }

        deleteIncident(incidentId) {
            if (!incidentId) return;
            if (!confirm('Delete this event? This action cannot be undone.')) {
                return;
            }
            this.incidents = this.incidents.filter(incident => incident.id !== incidentId);
            this.saveData();
            this.renderIncidents(this.currentProjectId);
            this.updateProjectTabCounts();
            this.updateDataStats();
            this.showNotification('Event deleted.', 'success');
        }

        renderIncidents(projectId = null) {
            const incidentsList = document.getElementById('incidentsList');
            if (!incidentsList) return;

            const targetProjectId = projectId || this.currentProjectId;
            let incidentsToShow = this.incidents;
            if (targetProjectId) {
                incidentsToShow = incidentsToShow.filter(incident => incident.projectId === targetProjectId);
            }

            if (incidentsToShow.length === 0) {
                incidentsList.innerHTML = `
                    <div class="empty-state">
                        <h3>No events recorded</h3>
                        <p>Log security incidents, milestones, or lessons learned for this project.</p>
                    </div>
                `;
                return;
            }

            const sortedIncidents = [...incidentsToShow].sort((a, b) => {
                const aDate = new Date(a.date || a.createdAt || 0).getTime();
                const bDate = new Date(b.date || b.createdAt || 0).getTime();
                return bDate - aDate;
            });

            incidentsList.innerHTML = sortedIncidents.map(incident => {
                const severity = incident.severity || 'low';
                const severityIcon = this.getIncidentSeverityIcon(severity);
                const parsedDate = incident.date ? new Date(incident.date) : null;
                const readableDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleString() : 'Date not set';
                const safeName = this.escapeHtml(incident.name || 'Untitled event');
                const safeDescription = incident.description ? this.escapeHtml(incident.description) : 'No description provided.';
                const safeResolution = incident.resolution ? this.escapeHtml(incident.resolution) : '';
                return `
                    <div class="risk-card incident-card">
                        <div class="risk-header">
                            <h4>${safeName}</h4>
                            <div class="risk-severity">
                                <span class="severity-badge ${severity}">${severityIcon} ${severity.toUpperCase()}</span>
                            </div>
                        </div>
                        <p class="risk-description">${safeDescription}</p>
                        <div class="risk-matrix">
                            <div class="risk-factor">
                                <span class="factor-label">Occurred:</span>
                                <span class="factor-value">${readableDate}</span>
                            </div>
                            <div class="risk-factor">
                                <span class="factor-label">Severity:</span>
                                <span class="factor-value ${severity}">${severity.toUpperCase()}</span>
                            </div>
                        </div>
                        ${safeResolution ? `
                            <div class="risk-mitigation">
                                <strong>Resolution:</strong>
                                <p>${safeResolution}</p>
                            </div>
                        ` : ''}
                        <div class="risk-actions">
                            <button class="btn btn-outline btn-small" data-action="edit-incident" data-incident-id="${incident.id}">Edit</button>
                            <button class="btn btn-danger btn-small" data-action="delete-incident" data-incident-id="${incident.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        getIncidentSeverityIcon(severity) {
            const icons = {
                low: '🟢',
                medium: '🟡',
                high: '🟠',
                critical: '🔴'
            };
            return icons[severity] || '⚪';
        }

        formatDateTimeLocal(value) {
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '';
            }
            const tzOffsetMs = date.getTimezoneOffset() * 60000;
            const local = new Date(date.getTime() - tzOffsetMs);
            return local.toISOString().slice(0, 16);
        }

        switchProjectTab(tabName) {
            const projectDetails = document.getElementById('projectDetails');
            if (!projectDetails) return;

            // Remove active class from all tab buttons and panes
            projectDetails.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            projectDetails.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            // Add active class to selected tab button and pane
            const activeBtn = projectDetails.querySelector(`[data-tab="${tabName}"]`);
            const activePane = document.getElementById(`${tabName}Tab`);

            if (activeBtn) activeBtn.classList.add('active');
            if (activePane) activePane.classList.add('active');

            // Render content based on tab
            switch (tabName) {
                case 'risks':
                    this.renderRisks(this.currentProjectId);
                    this.updateProjectTabCounts();
                    break;
                case 'requirements':
                    this.renderProjectRequirements();
                    this.updateProjectTabCounts();
                    break;
                case 'incidents':
                    this.renderIncidents(this.currentProjectId);
                    this.updateProjectTabCounts();
                    break;
            }
        }

        updateBreadcrumb(items) {
            const breadcrumb = document.getElementById('breadcrumb');
            if (!breadcrumb) return;

            breadcrumb.innerHTML = items.map((item, index) => {
                const isLast = index === items.length - 1;
                return isLast ? 
                    `<span class="current">${item.text}</span>` :
                    `<a href="#" data-level="${item.level}">${item.text}</a>`;
            }).join(' / ');
        }

        // Data Management
        updateDataStats() {
            const projectCount = this.projects.length;
            const riskCount = this.risks.length;
            const incidentCount = this.incidents.length;
            const lastModified = localStorage.getItem('pspf_last_modified');

            document.getElementById('dataProjectCount').textContent = projectCount;
            document.getElementById('dataRiskCount').textContent = riskCount;
            document.getElementById('dataIncidentCount').textContent = incidentCount;
            document.getElementById('dataLastModified').textContent = 
                lastModified ? new Date(lastModified).toLocaleDateString() : 'Never';

            this.renderIncidentTrend();
            this.renderEvidenceCoverageSummary();
            this.renderDataIntegrityDiagnostics();
            this.populateScopedExportSelectors();
            this.renderImportHistory();
            this.renderExternalCaptureSummary();
        }

        computeDataIntegrityDiagnostics() {
            return this.computeIntegrityDiagnosticsForData({
                projects: this.projects,
                risks: this.risks,
                incidents: this.incidents,
                compliance: this.compliance,
                actions: this.actions,
                directions: this.directions,
                relationships: this.relationships
            });
        }

        computeIntegrityDiagnosticsForData(data) {
            const diagnostics = {
                orphanRiskLinks: 0,
                orphanIncidentLinks: 0,
                relationshipErrors: 0,
                totalIssues: 0,
                messages: []
            };

            const source = data && typeof data === 'object' ? data : {};

            const projects = Array.isArray(source.projects) ? source.projects : [];
            const risks = Array.isArray(source.risks) ? source.risks : [];
            const incidents = Array.isArray(source.incidents) ? source.incidents : [];
            const relationships = Array.isArray(source.relationships) ? source.relationships : [];
            const actions = Array.isArray(source.actions) ? source.actions : [];
            const directions = Array.isArray(source.directions) ? source.directions : [];
            const compliance = source.compliance && typeof source.compliance === 'object' ? source.compliance : {};

            const projectIds = new Set(projects.map(project => project?.id).filter(Boolean));

            diagnostics.orphanRiskLinks = risks.filter(risk => {
                if (!risk || typeof risk !== 'object') return false;
                if (!risk.projectId) return false;
                return !projectIds.has(risk.projectId);
            }).length;

            diagnostics.orphanIncidentLinks = incidents.filter(incident => {
                if (!incident || typeof incident !== 'object') return false;
                if (!incident.projectId) return false;
                return !projectIds.has(incident.projectId);
            }).length;

            const relationshipValidation = this.validateRelationshipIntegrity({
                projects,
                risks,
                incidents,
                compliance,
                actions,
                directions,
                relationships
            });

            diagnostics.relationshipErrors = relationshipValidation.errors.length;
            diagnostics.messages = relationshipValidation.errors.slice(0, 6);
            diagnostics.totalIssues = diagnostics.orphanRiskLinks + diagnostics.orphanIncidentLinks + diagnostics.relationshipErrors;
            return diagnostics;
        }

        buildIntegrityReportPayload() {
            const diagnostics = this.computeDataIntegrityDiagnostics();
            return {
                version: EXPORT_FORMAT_VERSION,
                schema: {
                    id: EXPORT_SCHEMA_ID,
                    version: EXPORT_FORMAT_VERSION
                },
                generatedAt: new Date().toISOString(),
                scope: { type: 'integrity-report' },
                summary: {
                    totalIssues: diagnostics.totalIssues,
                    orphanRiskLinks: diagnostics.orphanRiskLinks,
                    orphanIncidentLinks: diagnostics.orphanIncidentLinks,
                    relationshipErrors: diagnostics.relationshipErrors
                },
                details: diagnostics.messages,
                dataSnapshot: {
                    projects: this.projects.length,
                    risks: this.risks.length,
                    incidents: this.incidents.length,
                    relationships: this.relationships.length,
                    actions: this.actions.length,
                    directions: this.directions.length
                }
            };
        }

        exportIntegrityReport() {
            try {
                const payload = this.buildIntegrityReportPayload();
                this.downloadJsonFile(payload, 'pspf-integrity-report');
                this.showNotification('Integrity report exported.', 'success');
            } catch (error) {
                console.error('Integrity report export failed:', error);
                this.showNotification('Failed to export integrity report.', 'error');
            }
        }

        renderDataIntegrityDiagnostics() {
            if (typeof document === 'undefined') {
                return;
            }

            const container = document.getElementById('dataIntegrityPanel');
            if (!container) {
                return;
            }

            const diagnostics = this.computeDataIntegrityDiagnostics();
            if (diagnostics.totalIssues === 0) {
                container.classList.remove('warning');
                container.classList.add('healthy');
                container.innerHTML = `
                    <h4>Integrity Check</h4>
                    <p class="integrity-summary">No integrity anomalies detected in current local data.</p>
                `;
                return;
            }

            container.classList.remove('healthy');
            container.classList.add('warning');
            container.innerHTML = `
                <h4>Integrity Check</h4>
                <p class="integrity-summary">${diagnostics.totalIssues} anomaly${diagnostics.totalIssues === 1 ? '' : 'ies'} found. Review before sharing or relying on reports.</p>
                <ul class="integrity-metrics">
                    <li>Orphan risk links: <strong>${diagnostics.orphanRiskLinks}</strong></li>
                    <li>Orphan event links: <strong>${diagnostics.orphanIncidentLinks}</strong></li>
                    <li>Relationship issues: <strong>${diagnostics.relationshipErrors}</strong></li>
                </ul>
                ${diagnostics.messages.length ? `
                    <details class="integrity-details">
                        <summary>View anomaly details</summary>
                        <ul>
                            ${diagnostics.messages.map(message => `<li>${this.escapeHtml(message)}</li>`).join('')}
                        </ul>
                    </details>
                ` : ''}
                <div class="integrity-actions">
                    <button class="btn btn-outline btn-small" data-action="review-integrity-issues">Review Linked Records</button>
                    <button class="btn btn-secondary btn-small" data-action="export-integrity-report">Export Anomaly Report</button>
                </div>
            `;
        }

        renderIncidentTrend() {
            if (typeof document === 'undefined') {
                return;
            }

            const sparklineEl = document.getElementById('incidentSparkline');
            const changeEl = document.getElementById('incidentTrendChange');
            if (!sparklineEl || !changeEl) {
                return;
            }

            const buckets = this.buildIncidentTrendBuckets();
            const totalEvents = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

            if (totalEvents === 0) {
                sparklineEl.innerHTML = '<div class="trend-empty">No events recorded yet.</div>';
                changeEl.textContent = '0 vs prev.';
                changeEl.classList.remove('trend-up', 'trend-down');
                return;
            }

            const maxCount = Math.max(...buckets.map(bucket => bucket.count), 1);
            sparklineEl.innerHTML = buckets.map(bucket => {
                const percent = Math.max((bucket.count / maxCount) * 100, 4);
                return `
                    <div class="spark-bar" style="height:${percent.toFixed(2)}%;" role="img" aria-label="${bucket.label}: ${bucket.count} incidents">
                        <span>${bucket.label}: ${bucket.count}</span>
                    </div>
                `;
            }).join('');

            const lastBucket = buckets[buckets.length - 1];
            const prevBucket = buckets.length > 1 ? buckets[buckets.length - 2] : { count: 0 };
            const delta = lastBucket.count - prevBucket.count;
            const prefix = delta > 0 ? '+' : '';
            changeEl.textContent = `${prefix}${delta} vs prev.`;
            changeEl.classList.remove('trend-up', 'trend-down');
            if (delta > 0) {
                changeEl.classList.add('trend-up');
            } else if (delta < 0) {
                changeEl.classList.add('trend-down');
            }
        }

        buildIncidentTrendBuckets(monthCount = 6) {
            const now = new Date();
            const buckets = [];
            for (let offset = monthCount - 1; offset >= 0; offset--) {
                const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                buckets.push({
                    key,
                    label: date.toLocaleString('default', { month: 'short' }),
                    count: 0
                });
            }

            const bucketMap = buckets.reduce((acc, bucket) => {
                acc[bucket.key] = bucket;
                return acc;
            }, {});

            if (!Array.isArray(this.incidents)) {
                return buckets;
            }

            this.incidents.forEach(incident => {
                const rawDate = incident.date || incident.createdAt;
                if (!rawDate) return;
                const incidentDate = new Date(rawDate);
                if (Number.isNaN(incidentDate.getTime())) return;

                const key = `${incidentDate.getFullYear()}-${incidentDate.getMonth()}`;
                const bucket = bucketMap[key];
                if (bucket) {
                    bucket.count += 1;
                }
            });

            return buckets;
        }

        renderEvidenceCoverageSummary() {
            if (typeof document === 'undefined') {
                return;
            }

            const valueEl = document.getElementById('evidenceCoverageValue');
            const subtitleEl = document.getElementById('evidenceCoverageSubtitle');
            const deltaEl = document.getElementById('evidenceCoverageDelta');
            if (!valueEl || !subtitleEl || !deltaEl) {
                return;
            }

            const requirementIds = Object.keys(this.requirements || {});
            const totalRequirements = requirementIds.length;
            const withEvidence = requirementIds.reduce((count, reqId) => {
                const url = this.compliance[reqId]?.url;
                return url && url.trim().length ? count + 1 : count;
            }, 0);
            const percentage = totalRequirements ? Math.round((withEvidence / totalRequirements) * 100) : 0;

            valueEl.textContent = `${percentage}%`;
            subtitleEl.textContent = `${withEvidence} of ${totalRequirements} requirements include reference links.`;

            let previousValue = null;
            if (this.storageAvailable) {
                const stored = localStorage.getItem('pspf_evidence_coverage_last');
                if (stored !== null && stored !== undefined) {
                    const parsed = Number(stored);
                    if (!Number.isNaN(parsed)) {
                        previousValue = parsed;
                    }
                }
                localStorage.setItem('pspf_evidence_coverage_last', String(percentage));
            }

            if (previousValue === null) {
                deltaEl.textContent = '—';
                deltaEl.classList.remove('trend-up', 'trend-down');
            } else {
                const delta = percentage - previousValue;
                const prefix = delta > 0 ? '+' : '';
                deltaEl.textContent = `${prefix}${delta}%`;
                deltaEl.classList.remove('trend-up', 'trend-down');
                if (delta > 0) {
                    deltaEl.classList.add('trend-up');
                } else if (delta < 0) {
                    deltaEl.classList.add('trend-down');
                }
            }
        }

        populateScopedExportSelectors() {
            if (typeof document === 'undefined') {
                return;
            }

            const domainSelect = document.getElementById('domainExportSelect');
            const domainBtn = document.getElementById('exportDomainBtn');
            if (domainSelect) {
                const previousValue = domainSelect.value;
                const domainOptions = this.domains
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map(domain => `<option value="${this.escapeHtml(domain.id)}">${this.escapeHtml(domain.title)}</option>`)
                    .join('');
                domainSelect.innerHTML = `<option value="">Select a domain…</option>${domainOptions}`;
                if (previousValue && this.domains.some(domain => domain.id === previousValue)) {
                    domainSelect.value = previousValue;
                } else {
                    domainSelect.value = '';
                }
                if (domainBtn) {
                    domainBtn.disabled = !domainSelect.value;
                }
            }

            // Share package domain selector
            const sharePackageSelect = document.getElementById('sharePackageDomainSelect');
            const sharePackageBtn = document.getElementById('exportSharePackageBtn');
            if (sharePackageSelect) {
                const prevShare = sharePackageSelect.value;
                const shareOptions = this.domains
                    .slice()
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map(d => `<option value="${this.escapeHtml(d.id)}">${this.escapeHtml(d.title)}</option>`)
                    .join('');
                sharePackageSelect.innerHTML = `<option value="">Select a domain…</option>${shareOptions}`;
                if (prevShare && this.domains.some(d => d.id === prevShare)) {
                    sharePackageSelect.value = prevShare;
                } else {
                    sharePackageSelect.value = '';
                }
                if (sharePackageBtn) sharePackageBtn.disabled = !sharePackageSelect.value;
            }

            const projectSelect = document.getElementById('projectExportSelect');
            const projectBtn = document.getElementById('exportProjectBtn');
            if (projectSelect) {
                const previousProject = projectSelect.value;
                const projectOptions = this.projects
                    .slice()
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(project => `<option value="${this.escapeHtml(project.id)}">${this.escapeHtml(project.name || 'Untitled Project')}</option>`)
                    .join('');
                projectSelect.innerHTML = `<option value="">Select a project…</option>${projectOptions}`;
                if (previousProject && this.projects.some(project => project.id === previousProject)) {
                    projectSelect.value = previousProject;
                } else {
                    projectSelect.value = '';
                }
                if (projectBtn) {
                    projectBtn.disabled = !projectSelect.value;
                }
            }
        }

        // Requirements linking
        renderProjectRequirements() {
            const list = document.getElementById('projectRequirementsList');
            if (!list) return;
            const project = this.projects.find(p => p.id === this.currentProjectId);
            if (!project) return;
            const linked = Array.isArray(project.requirements) ? project.requirements : [];

            if (linked.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <h3>No Requirements Linked</h3>
                        <p>Link PSPF requirements that this project addresses.</p>
                    </div>
                `;
                return;
            }

            const items = linked.map(reqId => {
                const req = this.requirements[reqId];
                const domain = req ? this.domains.find(d => d.id === req.domainId) : null;
                const title = req ? this.escapeHtml(req.title) : this.escapeHtml(reqId);
                const domainTitle = domain ? this.escapeHtml(domain.title) : 'Unknown domain';
                const status = this.compliance[reqId]?.status || 'not-set';
                return `
                    <div class="project-requirement-row">
                        <div>
                            <div class="project-requirement-title">${title}</div>
                            <div class="project-requirement-meta">
                                <span class="requirement-code">${this.escapeHtml(reqId)}</span>
                                <span>• ${domainTitle}</span>
                            </div>
                        </div>
                        <div class="requirement-row-actions">
                            <span class="requirement-status ${status}">${this.getStatusText(status)}</span>
                            <button class="btn btn-outline btn-small" data-action="unlink-requirement" data-requirement-id="${reqId}">Unlink</button>
                        </div>
                    </div>
                `;
            }).join('');

            list.innerHTML = items;
        }

        showLinkRequirementsModal() {
            const modal = document.getElementById('linkRequirementsModal');
            const checklist = document.getElementById('requirementsChecklist');
            const searchInput = document.getElementById('requirementsSearch');
            if (!modal || !checklist) return;

            const project = this.projects.find(p => p.id === this.currentProjectId);
            const selected = new Set(project?.requirements || []);

            const renderChecklist = (filter = '') => {
                const f = filter.toLowerCase();
                const groups = this.domains.map(domain => {
                    const reqs = domain.requirements
                        .map(id => this.requirements[id])
                        .filter(r => r && (r.id.toLowerCase().includes(f) || r.title.toLowerCase().includes(f)));
                    if (reqs.length === 0) return '';
                    const items = reqs.map(r => `
                        <label style="display:flex; align-items:center; gap:.5rem; padding:.25rem .5rem;">
                            <input type="checkbox" value="${r.id}" ${selected.has(r.id) ? 'checked' : ''}>
                            <span style="font-weight:500; color: var(--text-primary);">${r.id}</span>
                            <span style="color: var(--text-secondary);">${r.title}</span>
                        </label>
                    `).join('');
                    return `
                        <div style="margin-bottom:.5rem;">
                            <div style="font-weight:600; color: var(--text-primary); margin:.5rem .25rem;">${domain.title}</div>
                            ${items}
                        </div>
                    `;
                }).join('');
                checklist.innerHTML = groups || '<p class="text-secondary" style="padding:.5rem;">No results</p>';
                // Attach change listeners
                checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const id = e.target.value;
                        if (e.target.checked) selected.add(id); else selected.delete(id);
                    });
                });
            };

            renderChecklist('');
            if (searchInput) {
                searchInput.value = '';
                searchInput.oninput = (e) => renderChecklist(e.target.value);
            }

            // Wire buttons
            const cancelBtn = document.getElementById('cancelLinkRequirements');
            const saveBtn = document.getElementById('saveLinkRequirements');
            if (cancelBtn) cancelBtn.onclick = () => this.hideModal('linkRequirementsModal');
            if (saveBtn) saveBtn.onclick = () => {
                const p = this.projects.find(p => p.id === this.currentProjectId);
                if (p) {
                    p.requirements = Array.from(selected);
                    this.saveData();
                    this.updateProjectTabCounts();
                    this.renderProjectRequirements();
                    this.renderProjectRequirementWidget();
                }
                this.hideModal('linkRequirementsModal');
            };

            this.openModal(modal, { initialFocusSelector: '#requirementsSearch' });
        }

        unlinkRequirementFromProject(reqId) {
            const p = this.projects.find(p => p.id === this.currentProjectId);
            if (!p || !Array.isArray(p.requirements)) return;
            p.requirements = p.requirements.filter(id => id !== reqId);
            this.saveData();
            this.updateProjectTabCounts();
            this.renderProjectRequirements();
            this.renderProjectRequirementWidget();
        }

        downloadJsonFile(payload, filenamePrefix) {
            if (typeof document === 'undefined') {
                return;
            }

            const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            const dateStamp = new Date().toISOString().split('T')[0];
            downloadLink.download = `${filenamePrefix}-${dateStamp}.json`;

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        }

        getPortableDataSnapshot() {
            return {
                projects: this.projects,
                risks: this.risks,
                incidents: this.incidents,
                compliance: this.compliance,
                actions: this.actions,
                directions: this.directions,
                relationships: this.relationships,
                evidenceRecords: this.evidenceRecords,
                importBatches: this.importBatches,
                mergeReviews: this.mergeReviews
            };
        }

        buildDataEnvelope({ scope, summary, data }) {
            return {
                version: EXPORT_FORMAT_VERSION,
                schema: {
                    id: EXPORT_SCHEMA_ID,
                    version: EXPORT_FORMAT_VERSION
                },
                exportedAt: new Date().toISOString(),
                scope,
                summary,
                data
            };
        }

        resolveImportPayload(importData) {
            if (!importData || typeof importData !== 'object') {
                return null;
            }

            if (importData.data && typeof importData.data === 'object') {
                return importData.data;
            }

            if (importData.payload?.data && typeof importData.payload.data === 'object') {
                return importData.payload.data;
            }

            return null;
        }

        resolvePersistedStateData(envelope) {
            if (!envelope || typeof envelope !== 'object') {
                return null;
            }
            if (envelope.schema?.id !== EXPORT_SCHEMA_ID) {
                return null;
            }
            if (!envelope.data || typeof envelope.data !== 'object') {
                return null;
            }
            return envelope.data;
        }

        buildLocalStateEnvelope() {
            const data = this.getPortableDataSnapshot();
            return {
                version: CURRENT_DATA_MODEL_VERSION,
                schema: {
                    id: EXPORT_SCHEMA_ID,
                    version: CURRENT_DATA_MODEL_VERSION
                },
                savedAt: new Date().toISOString(),
                scope: { type: 'local-state' },
                summary: {
                    projects: data.projects.length,
                    risks: data.risks.length,
                    incidents: data.incidents.length,
                    complianceRecords: Object.keys(data.compliance || {}).length,
                    actions: data.actions.length,
                    directions: data.directions.length,
                    relationships: data.relationships.length
                },
                data
            };
        }

        // ── Stage 5: Targeted share package export ────────────────────────────

        buildSharePackage(requirementIds) {
            const reqSet = new Set(Array.isArray(requirementIds) ? requirementIds : []);

            // Collect linked entity IDs via relationships
            const linkedRiskIds      = new Set();
            const linkedActionIds    = new Set();
            const linkedDirectionIds = new Set();
            const includedRelIds     = new Set();

            this.relationships.forEach(r => {
                const involvesReq = (r.sourceType === 'requirement' && reqSet.has(r.sourceId))
                                 || (r.targetType === 'requirement' && reqSet.has(r.targetId));
                if (!involvesReq) return;
                includedRelIds.add(r.id);
                if (r.sourceType === 'risk') linkedRiskIds.add(r.sourceId);
                if (r.targetType === 'risk') linkedRiskIds.add(r.targetId);
                if (r.sourceType === 'action') linkedActionIds.add(r.sourceId);
                if (r.targetType === 'action') linkedActionIds.add(r.targetId);
                if (r.sourceType === 'direction') linkedDirectionIds.add(r.sourceId);
                if (r.targetType === 'direction') linkedDirectionIds.add(r.targetId);
            });

            // Also include risk↔action relationships for included risks/actions
            const additionalRels = this.relationships.filter(r => {
                if (includedRelIds.has(r.id)) return false;
                return (linkedRiskIds.has(r.sourceId) || linkedRiskIds.has(r.targetId)
                     || linkedActionIds.has(r.sourceId) || linkedActionIds.has(r.targetId));
            });
            additionalRels.forEach(r => includedRelIds.add(r.id));

            const compliance = {};
            reqSet.forEach(id => { if (this.compliance[id]) compliance[id] = this.compliance[id]; });

            const evidenceRecords = this.evidenceRecords.filter(e => reqSet.has(e.requirementId));
            const risks      = this.risks.filter(r => linkedRiskIds.has(r.id));
            const actions    = this.actions.filter(a => linkedActionIds.has(a.id));
            const directions = this.directions.filter(d => linkedDirectionIds.has(d.id));
            const relationships = this.relationships.filter(r => includedRelIds.has(r.id));
            const requirementDetails = Array.from(reqSet).map(id => {
                const r = this.requirements[id];
                return r ? { id: r.id, title: r.title, domainId: r.domainId } : null;
            }).filter(Boolean);

            return this.buildDataEnvelope({
                scope: { type: 'share-package', requirementCount: reqSet.size },
                summary: {
                    requirements: requirementDetails.length,
                    complianceRecords: Object.keys(compliance).length,
                    evidenceRecords: evidenceRecords.length,
                    directions: directions.length,
                    risks: risks.length,
                    actions: actions.length,
                    relationships: relationships.length,
                },
                data: {
                    requirements: requirementDetails,
                    compliance,
                    evidenceRecords,
                    directions,
                    risks,
                    actions,
                    relationships,
                    projects: [],
                    incidents: [],
                    importBatches: [],
                    mergeReviews: [],
                }
            });
        }

        exportSharePackage(domainId) {
            if (!domainId) { this.showNotification('Select a domain for the share package.', 'warning'); return; }
            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) { this.showNotification('Domain not found.', 'error'); return; }
            try {
                const payload = this.buildSharePackage(domain.requirements || []);
                this.downloadJsonFile(payload, `pspf-share-${domain.id}`);
                this.trackEvent('share:export');
                this.showNotification(`Share package exported for ${domain.title}`, 'success');
            } catch (err) {
                console.error('Share package export failed:', err);
                this.showNotification('Share package export failed. Please try again.', 'error');
            }
        }

        // ── Stage 5: Staged import with merge review ──────────────────────────

        /**
         * Computes a diff between an incoming sanitised data snapshot and current state.
         * Returns per-entity-type arrays of { added, conflicts, matched }
         */
        computeImportDiff(incoming, current) {
            const ARRAY_TYPES = ['projects', 'risks', 'incidents', 'actions', 'directions', 'relationships', 'evidenceRecords'];
            const result = {};

            ARRAY_TYPES.forEach(type => {
                const inArr  = Array.isArray(incoming[type]) ? incoming[type] : [];
                const curMap = new Map((Array.isArray(current[type]) ? current[type] : []).map(e => [e.id, e]));
                const added = [], conflicts = [], matched = [];
                inArr.forEach(item => {
                    if (!curMap.has(item.id)) {
                        added.push(item);
                    } else {
                        const existing = curMap.get(item.id);
                        const changed  = JSON.stringify(existing) !== JSON.stringify(item);
                        if (changed) conflicts.push({ incoming: item, existing });
                        else         matched.push(item);
                    }
                });
                result[type] = { added, conflicts, matched };
            });

            // Compliance is an object keyed by reqId — treat differently
            const inComp  = (incoming.compliance && typeof incoming.compliance === 'object') ? incoming.compliance : {};
            const curComp = (current.compliance  && typeof current.compliance  === 'object') ? current.compliance  : {};
            const compAdded = [], compConflicts = [], compMatched = [];
            Object.entries(inComp).forEach(([key, val]) => {
                if (!curComp[key]) {
                    compAdded.push({ key, incoming: val });
                } else if (JSON.stringify(curComp[key]) !== JSON.stringify(val)) {
                    compConflicts.push({ key, incoming: val, existing: curComp[key] });
                } else {
                    compMatched.push({ key });
                }
            });
            result.compliance = { added: compAdded, conflicts: compConflicts, matched: compMatched };

            return result;
        }

        /**
         * Applies a staged import with the given strategy:
         *   'merge-incoming' — add new, overwrite conflicts with incoming
         *   'merge-keep-mine' — add new, keep existing for conflicts
         *   'replace-all' — replace all arrays/objects wholesale
         */
        applyMerge(sanitizedData, diff, strategy) {
            const ARRAY_TYPES = ['projects', 'risks', 'incidents', 'actions', 'directions', 'relationships', 'evidenceRecords'];

            if (strategy === 'replace-all') {
                ARRAY_TYPES.forEach(type => { this[type] = Array.isArray(sanitizedData[type]) ? sanitizedData[type] : this[type]; });
                this.compliance    = sanitizedData.compliance    || this.compliance;
                this.importBatches = Array.isArray(sanitizedData.importBatches) ? sanitizedData.importBatches : this.importBatches;
                this.mergeReviews  = Array.isArray(sanitizedData.mergeReviews)  ? sanitizedData.mergeReviews  : this.mergeReviews;
                return;
            }

            // Merge strategies: start from current, add new, optionally overwrite conflicts
            ARRAY_TYPES.forEach(type => {
                const { added, conflicts } = diff[type];
                const curMap = new Map(this[type].map(e => [e.id, e]));
                added.forEach(item => curMap.set(item.id, item));
                if (strategy === 'merge-incoming') {
                    conflicts.forEach(({ incoming }) => curMap.set(incoming.id, incoming));
                }
                this[type] = Array.from(curMap.values());
            });

            // Compliance
            const { added: cAdded, conflicts: cConflicts } = diff.compliance;
            cAdded.forEach(({ key, incoming }) => { this.compliance[key] = incoming; });
            if (strategy === 'merge-incoming') {
                cConflicts.forEach(({ key, incoming }) => { this.compliance[key] = incoming; });
            }
        }

        recordImportBatch({ strategy, filename, diff, appliedAt }) {
            const totalAdded    = this._diffCount(diff, 'added');
            const totalConflicts = this._diffCount(diff, 'conflicts');
            const totalMatched  = this._diffCount(diff, 'matched');
            this.importBatches.push({
                id: `ib-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                appliedAt,
                filename: filename || 'unknown',
                strategy,
                totalAdded,
                totalConflicts,
                totalMatched,
            });
        }

        _diffCount(diff, key) {
            return Object.values(diff).reduce((sum, v) => sum + (Array.isArray(v[key]) ? v[key].length : 0), 0);
        }

        stageImport(parsedData, filename) {
            const validation = this.validateImportData(parsedData);
            if (!validation.valid) {
                this.showNotification(`Import failed: ${validation.errors.join(', ')}`, 'error', 8000);
                return;
            }
            const payloadData     = this.resolveImportPayload(parsedData);
            const sanitizedData   = this.sanitizeImportData(payloadData || {});
            const currentSnapshot = this.getPortableDataSnapshot();
            const diff            = this.computeImportDiff(sanitizedData, currentSnapshot);
            const diagnostics     = this.computeIntegrityDiagnosticsForData(sanitizedData);

            this._stagedImportData     = sanitizedData;
            this._stagedImportDiff     = diff;
            this._stagedImportFile     = filename || 'imported file';
            this._stagedImportWarnings = validation.warnings;
            this._stagedImportDiag     = diagnostics;

            this.openImportReviewModal();
        }

        openImportReviewModal() {
            if (!this.ensureCapabilityAvailable('advancedMerge')) return;
            const modal = document.getElementById('importReviewModal');
            if (!modal) return;
            this.renderImportReview();
            this.openModal(modal, { initialFocusSelector: 'input[name="importStrategy"]' });
        }

        renderImportReview() {
            const diff = this._stagedImportDiff;
            if (!diff) return;

            // Source info
            const sourceEl = document.getElementById('importReviewSource');
            if (sourceEl) {
                sourceEl.innerHTML = `
                    <div class="import-review-file">
                        <span class="import-review-file-icon">📄</span>
                        <span class="import-review-file-name">${this.escapeHtml(this._stagedImportFile)}</span>
                        ${this._stagedImportWarnings?.length ? `<span class="import-review-warn">⚠️ ${this._stagedImportWarnings.map(w => this.escapeHtml(w)).join('; ')}</span>` : ''}
                    </div>`;
            }

            // Diff table
            const tbody = document.getElementById('importDiffBody');
            if (tbody) {
                const LABELS = {
                    projects: 'Projects', risks: 'Risks', incidents: 'Events',
                    actions: 'Actions', directions: 'Directions',
                    relationships: 'Relationships', evidenceRecords: 'Evidence records',
                    compliance: 'Compliance records'
                };
                tbody.innerHTML = Object.entries(diff).map(([type, counts]) => {
                    const added    = counts.added?.length    ?? 0;
                    const conflicts = counts.conflicts?.length ?? 0;
                    const matched  = counts.matched?.length  ?? 0;
                    return `<tr>
                        <td>${LABELS[type] || type}</td>
                        <td class="diff-col-new${added    ? ' has-value' : ''}">${added}</td>
                        <td class="diff-col-conflict${conflicts ? ' has-value' : ''}">${conflicts}</td>
                        <td class="diff-col-match">${matched}</td>
                    </tr>`;
                }).join('');
            }

            // Conflict details
            const conflictList = document.getElementById('importConflictList');
            const conflictDetails = document.getElementById('importConflictDetails');
            if (conflictList && conflictDetails) {
                const conflicts = Object.entries(diff).flatMap(([type, counts]) =>
                    (counts.conflicts || []).map(c => ({ type, ...c }))
                );
                if (!conflicts.length) {
                    conflictDetails.style.display = 'none';
                } else {
                    conflictDetails.style.display = '';
                    conflictList.innerHTML = conflicts.map(c => {
                        const label = c.incoming?.id || c.key || c.incoming?.title || 'Unknown';
                        return `<div class="import-conflict-item">
                            <span class="import-conflict-type">${this.escapeHtml(c.type)}</span>
                            <span class="import-conflict-id">${this.escapeHtml(String(label))}</span>
                        </div>`;
                    }).join('');
                }
            }

            // Integrity warning
            const warnEl = document.getElementById('importIntegrityWarning');
            if (warnEl) {
                const d = this._stagedImportDiag;
                if (d && d.totalIssues > 0) {
                    warnEl.classList.remove('hidden');
                    warnEl.innerHTML = `⚠️ <strong>${d.totalIssues} integrity anomal${d.totalIssues === 1 ? 'y' : 'ies'} detected</strong> in the imported file (orphans: ${d.orphanRiskLinks + d.orphanIncidentLinks}, relationship issues: ${d.relationshipErrors}). You can still apply the import.`;
                } else {
                    warnEl.classList.add('hidden');
                }
            }
        }

        renderImportHistory() {
            const list = document.getElementById('importHistoryList');
            if (!list) return;
            if (!this.importBatches.length) {
                list.innerHTML = '<p class="empty-state">No imports recorded yet.</p>';
                return;
            }
            list.innerHTML = [...this.importBatches].reverse().map(batch => {
                const strategyLabel = { 'merge-incoming': 'Merge (incoming)', 'merge-keep-mine': 'Merge (keep mine)', 'replace-all': 'Replace all' }[batch.strategy] || batch.strategy;
                const date = batch.appliedAt ? new Date(batch.appliedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
                return `<div class="import-history-item">
                    <div class="import-history-meta">
                        <span class="import-history-file">${this.escapeHtml(batch.filename || 'unknown file')}</span>
                        <span class="import-history-date">${this.escapeHtml(date)}</span>
                    </div>
                    <div class="import-history-stats">
                        <span class="import-stat import-stat-added">+${batch.totalAdded} added</span>
                        <span class="import-stat import-stat-conflict">${batch.totalConflicts} conflicts</span>
                        <span class="import-stat import-stat-match">${batch.totalMatched} unchanged</span>
                        <span class="import-stat import-stat-strategy">${this.escapeHtml(strategyLabel)}</span>
                    </div>
                </div>`;
            }).join('');
        }

        // ── Stage 6: Integration and External Capture ─────────────────────────

        isExternalRecord(record) {
            return !!(record && record._externalSource && record._externalSource.systemId);
        }

        isFieldLocked(record, fieldName) {
            if (!this.isExternalRecord(record)) return false;
            const locked = record._externalSource.lockedFields;
            return Array.isArray(locked) && locked.includes(fieldName);
        }

        validateExternalCapture(data) {
            const errors = [];
            if (!data || typeof data !== 'object') { return { valid: false, errors: ['Not a valid JSON object'] }; }
            if (data.schema !== EXTERNAL_CAPTURE_SCHEMA) {
                errors.push(`Unsupported schema "${data.schema || '(none)'}". Expected "${EXTERNAL_CAPTURE_SCHEMA}".`);
            }
            if (!data.systemName || typeof data.systemName !== 'string') errors.push('Missing or invalid systemName.');
            if (!data.systemId   || typeof data.systemId   !== 'string') errors.push('Missing or invalid systemId.');
            if (!data.records    || typeof data.records    !== 'object') errors.push('Missing records object.');
            if (errors.length) return { valid: false, errors };

            const rec = data.records;
            const VALID_ENTITY_TYPES = ['risks', 'actions', 'directions'];
            for (const type of VALID_ENTITY_TYPES) {
                if (rec[type] !== undefined && !Array.isArray(rec[type])) {
                    errors.push(`records.${type} must be an array.`);
                }
            }
            const hasAny = VALID_ENTITY_TYPES.some(t => Array.isArray(rec[t]) && rec[t].length > 0);
            if (!hasAny) errors.push('No records found. Provide at least one non-empty risks, actions, or directions array.');
            return { valid: errors.length === 0, errors };
        }

        /**
         * Ingest external records: stamp _externalSource lineage, merge into local arrays.
         * On re-ingest, locked fields are refreshed from the source; local-only fields preserved.
         */
        applyExternalCapture(data) {
            const { systemName, systemId, capturedAt = new Date().toISOString(), records } = data;
            const ENTITY_MAP = [
                { type: 'risks',      arr: this.risks,      prefix: 'risk',  lockedFields: EXTERNAL_LOCKED_FIELDS.risks      },
                { type: 'actions',    arr: this.actions,    prefix: 'act',   lockedFields: EXTERNAL_LOCKED_FIELDS.actions    },
                { type: 'directions', arr: this.directions, prefix: 'dir',   lockedFields: EXTERNAL_LOCKED_FIELDS.directions },
            ];

            let totalAdded = 0, totalUpdated = 0;

            ENTITY_MAP.forEach(({ type, arr, prefix, lockedFields }) => {
                const incoming = Array.isArray(records[type]) ? records[type] : [];
                incoming.forEach(extRecord => {
                    const externalId = String(extRecord.id || '');
                    if (!externalId) return;

                    // Find existing by systemId + externalId
                    const existingIdx = arr.findIndex(r =>
                        r._externalSource?.systemId === systemId &&
                        r._externalSource?.externalId === externalId
                    );

                    const source = { systemName, systemId, externalId, capturedAt, lockedFields };

                    if (existingIdx !== -1) {
                        // Update locked fields from incoming, keep local fields
                        const existing = arr[existingIdx];
                        const updated = { ...existing };
                        lockedFields.forEach(field => {
                            if (extRecord[field] !== undefined) updated[field] = extRecord[field];
                        });
                        updated._externalSource = source;
                        arr[existingIdx] = updated;
                        totalUpdated++;
                    } else {
                        // New record: assign local id, stamp source
                        const newId = `${prefix}-ext-${sanitizeExternalId(systemId)}-${sanitizeExternalId(externalId)}`;
                        const newRecord = { ...extRecord, id: newId, createdAt: capturedAt, _externalSource: source };
                        arr.push(newRecord);
                        totalAdded++;
                    }
                });
            });

            this.saveData();
            this.renderExternalCaptureSummary();
            this.trackEvent('external:capture');
            this.showNotification(`External capture applied: ${totalAdded} added, ${totalUpdated} updated.`, 'success', 5000);
        }

        ingestExternalCaptureFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    const validation = this.validateExternalCapture(parsed);
                    if (!validation.valid) {
                        this.showNotification(`External capture failed: ${validation.errors.join(', ')}`, 'error', 8000);
                        return;
                    }
                    this.applyExternalCapture(parsed);
                } catch (err) {
                    console.error('External capture ingest failed:', err);
                    this.showNotification(`External capture failed: ${err.message || 'Invalid JSON'}`, 'error');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        renderExternalCaptureSummary() {
            const el = document.getElementById('externalCaptureSummary');
            if (!el) return;

            const counts = {
                risks:      this.risks.filter(r => this.isExternalRecord(r)).length,
                actions:    this.actions.filter(a => this.isExternalRecord(a)).length,
                directions: this.directions.filter(d => this.isExternalRecord(d)).length,
            };
            const total = counts.risks + counts.actions + counts.directions;

            if (total === 0) {
                el.classList.add('hidden');
                return;
            }
            el.classList.remove('hidden');
            const systems = new Set([
                ...this.risks.filter(r => this.isExternalRecord(r)).map(r => r._externalSource.systemName),
                ...this.actions.filter(a => this.isExternalRecord(a)).map(a => a._externalSource.systemName),
                ...this.directions.filter(d => this.isExternalRecord(d)).map(d => d._externalSource.systemName),
            ]);
            el.innerHTML = `
                <div class="external-capture-stats">
                    <span class="external-stat">📊 ${total} external record${total !== 1 ? 's' : ''}</span>
                    ${counts.risks      ? `<span class="external-stat">${counts.risks} risk${counts.risks !== 1 ? 's' : ''}</span>` : ''}
                    ${counts.actions    ? `<span class="external-stat">${counts.actions} action${counts.actions !== 1 ? 's' : ''}</span>` : ''}
                    ${counts.directions ? `<span class="external-stat">${counts.directions} direction${counts.directions !== 1 ? 's' : ''}</span>` : ''}
                    <span class="external-stat-source">from ${[...systems].map(s => this.escapeHtml(s)).join(', ')}</span>
                </div>`;
        }

        /**
         * Applies locked-field guards to an edit modal when the record is externally sourced.
         * Disables locked inputs and inserts an inline banner.
         */
        _applyExternalFieldGuards(entityType, record, formEl) {
            if (!formEl || !this.isExternalRecord(record)) return;

            const lockedFields = record._externalSource.lockedFields || EXTERNAL_LOCKED_FIELDS[entityType] || [];
            const systemName   = record._externalSource.systemName || 'an external system';

            // Remove any prior banner
            formEl.querySelector('.external-record-banner')?.remove();

            // Insert banner at top of form
            const banner = document.createElement('div');
            banner.className = 'external-record-banner';
            banner.setAttribute('role', 'note');
            banner.innerHTML = `🔒 <strong>External record</strong> — sourced from <strong>${this.escapeHtml(systemName)}</strong>. Locked fields cannot be edited locally.`;
            formEl.prepend(banner);

            // Disable locked field inputs
            const FIELD_ID_MAP = {
                // risks
                name: 'riskName', likelihood: 'riskLikelihood', impact: 'riskImpact', severity: null,
                // actions
                title: ['actionTitle', 'directionTitle'], type: 'actionType', status: 'actionStatus', dueDate: 'actionDueDate',
                // directions
                instrumentNumber: 'directionInstrumentNumber', issuedAt: 'directionIssuedAt', description: ['directionDescription', 'riskDesc'],
            };

            lockedFields.forEach(field => {
                let ids = FIELD_ID_MAP[field];
                if (!ids) return;
                if (!Array.isArray(ids)) ids = [ids];
                ids.forEach(id => {
                    const input = formEl.querySelector(`#${id}`);
                    if (input) {
                        input.disabled = true;
                        input.classList.add('field-locked');
                        // Accessible label
                        const label = formEl.querySelector(`label[for="${id}"]`);
                        if (label && !label.querySelector('.lock-icon')) {
                            label.insertAdjacentHTML('beforeend', ' <span class="lock-icon" aria-label="locked">🔒</span>');
                        }
                    }
                });
            });
        }

        // ── Stage 7: Privacy-preserving local analytics ────────────────────────

        isAnalyticsEnabled() {
            try { return localStorage.getItem(ANALYTICS_OPT_IN_KEY) === 'true'; }
            catch { return false; }
        }

        trackEvent(eventName) {
            if (!this.isAnalyticsEnabled()) return;
            if (!ANALYTICS_EVENT_NAMES.includes(eventName)) return;
            try {
                const raw = localStorage.getItem(ANALYTICS_DATA_KEY);
                const data = raw ? JSON.parse(raw) : {};
                data[eventName] = (data[eventName] || 0) + 1;
                localStorage.setItem(ANALYTICS_DATA_KEY, JSON.stringify(data));
            } catch { /* non-fatal */ }
        }

        getAnalyticsData() {
            try {
                const raw = localStorage.getItem(ANALYTICS_DATA_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch { return {}; }
        }

        resetAnalyticsData() {
            try { localStorage.removeItem(ANALYTICS_DATA_KEY); } catch { /* non-fatal */ }
        }

        renderAnalyticsPanel() {
            const panel = document.getElementById('analyticsPanel');
            const optIn = document.getElementById('analyticsOptIn');
            if (!panel || !optIn) return;

            const enabled = this.isAnalyticsEnabled();
            optIn.checked = enabled;

            if (!enabled) {
                panel.innerHTML = '<p class="analytics-off-notice">Usage tracking is off. Enable it above to see your activity summary here.</p>';
                return;
            }

            const data = this.getAnalyticsData();
            const views = ['home', 'search', 'progress', 'project', 'myWork', 'map', 'data', 'help'];
            const viewLabels = {
                home: 'Home', search: 'Search', progress: 'Progress', project: 'Projects',
                myWork: 'My Work', map: 'Relationship Map', data: 'Data', help: 'Help',
            };
            const viewRows = views.map(v =>
                `<tr><td>${viewLabels[v]}</td><td class="analytics-count">${data[`view:${v}`] || 0}</td></tr>`
            ).join('');
            const actionRows = [
                ['Compliance updates',  data['compliance:update'] || 0],
                ['Risks created',       data['risk:create']       || 0],
                ['Actions created',     data['action:create']     || 0],
                ['Imports applied',     data['import:apply']      || 0],
                ['Share exports',       data['share:export']      || 0],
                ['External captures',   data['external:capture']  || 0],
            ].map(([label, count]) =>
                `<tr><td>${label}</td><td class="analytics-count">${count}</td></tr>`
            ).join('');

            panel.innerHTML = `
                <div class="analytics-grid">
                    <div class="analytics-table-section">
                        <h5>View visits</h5>
                        <table class="analytics-table" aria-label="View visit counts"><tbody>${viewRows}</tbody></table>
                    </div>
                    <div class="analytics-table-section">
                        <h5>Activity</h5>
                        <table class="analytics-table" aria-label="Activity counts"><tbody>${actionRows}</tbody></table>
                    </div>
                </div>
                <button class="btn btn-outline btn-small analytics-reset-btn" type="button" data-action="reset-analytics">
                    Reset counters
                </button>`;
        }

        exportData() {
            try {
                const data = this.getPortableDataSnapshot();
                const exportData = this.buildDataEnvelope({
                    scope: { type: 'full' },
                    summary: {
                        projects: data.projects.length,
                        risks: data.risks.length,
                        incidents: data.incidents.length,
                        complianceRecords: Object.keys(data.compliance || {}).length,
                        actions: data.actions.length,
                        directions: data.directions.length,
                        relationships: data.relationships.length
                    },
                    data
                });

                this.downloadJsonFile(exportData, 'pspf-explorer-backup');
                this.showNotification('Data exported successfully!', 'success');
                
            } catch (error) {
                console.error('Export failed:', error);
                this.showNotification('Export failed. Please try again.', 'error');
            }
        }

        buildRequirementExportDetails(requirementIds = []) {
            const requirementArray = Array.isArray(requirementIds) ? requirementIds : [];
            return requirementArray.map(reqId => {
                const requirement = this.requirements[reqId] || {};
                const domain = requirement.domainId ? this.domains.find(d => d.id === requirement.domainId) : null;
                const complianceRecord = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };

                return {
                    id: reqId,
                    title: requirement.title || '',
                    description: requirement.description || '',
                    domainId: requirement.domainId || null,
                    domainTitle: domain?.title || '',
                    compliance: {
                        status: complianceRecord.status || 'not-set',
                        comment: complianceRecord.comment || '',
                        url: complianceRecord.url || ''
                    }
                };
            });
        }

        exportDomainData(domainId) {
            if (!domainId) {
                this.showNotification('Select a domain to export.', 'warning');
                return;
            }

            const domain = this.domains.find(d => d.id === domainId);
            if (!domain) {
                this.showNotification('Unable to find the selected domain.', 'error');
                return;
            }

            try {
                const requirementIds = Array.isArray(domain.requirements) ? domain.requirements : [];
                const requirements = this.buildRequirementExportDetails(requirementIds);
                const requirementSet = new Set(requirementIds);
                const relatedProjects = this.projects.filter(project => 
                    Array.isArray(project.requirements) && project.requirements.some(reqId => requirementSet.has(reqId))
                );
                const projectIds = new Set(relatedProjects.map(project => project.id));
                const relatedIncidents = this.incidents.filter(incident => incident.projectId && projectIds.has(incident.projectId));

                const payload = this.buildDataEnvelope({
                    scope: {
                        type: 'domain',
                        id: domain.id,
                        title: domain.title
                    },
                    summary: {
                        requirements: requirements.length,
                        projects: relatedProjects.length,
                        incidents: relatedIncidents.length
                    },
                    data: {
                        domain: {
                            id: domain.id,
                            title: domain.title,
                            description: domain.description
                        },
                        requirements,
                        projects: relatedProjects,
                        incidents: relatedIncidents
                    }
                });

                this.downloadJsonFile(payload, `pspf-domain-${domain.id}`);
                this.showNotification(`Exported ${domain.title} report`, 'success');
            } catch (error) {
                console.error('Domain export failed:', error);
                this.showNotification('Domain export failed. Please try again.', 'error');
            }
        }

        exportProjectData(projectId) {
            if (!projectId) {
                this.showNotification('Select a project to export.', 'warning');
                return;
            }

            const project = this.projects.find(p => p.id === projectId);
            if (!project) {
                this.showNotification('Unable to find the selected project.', 'error');
                return;
            }

            try {
                const requirementDetails = this.buildRequirementExportDetails(project.requirements || []);
                const projectRisks = this.risks.filter(risk => risk.projectId === projectId);
                const projectIncidents = this.incidents.filter(incident => incident.projectId === projectId);

                const payload = this.buildDataEnvelope({
                    scope: {
                        type: 'project',
                        id: project.id,
                        name: project.name
                    },
                    summary: {
                        requirements: requirementDetails.length,
                        risks: projectRisks.length,
                        incidents: projectIncidents.length
                    },
                    data: {
                        project,
                        requirements: requirementDetails,
                        risks: projectRisks,
                        incidents: projectIncidents
                    }
                });

                this.downloadJsonFile(payload, `pspf-project-${project.id}`);
                this.showNotification(`Exported ${project.name || 'project'} report`, 'success');
            } catch (error) {
                console.error('Project export failed:', error);
                this.showNotification('Project export failed. Please try again.', 'error');
            }
        }

        importData(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    this.stageImport(parsed, file.name);
                } catch (error) {
                    console.error('Import failed:', error);
                    this.showNotification(`Import failed: ${error.message || 'Invalid JSON format'}`, 'error');
                }
            };

            reader.readAsText(file);
            event.target.value = '';
        }

        /**
         * Validates the structure and content of imported data
         * @param {Object} importData - The parsed JSON data from the backup file
         * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
         */
        validateImportData(importData) {
            const errors = [];
            const warnings = [];

            // Check basic structure
            if (!importData || typeof importData !== 'object') {
                errors.push('Invalid file format: not a valid JSON object');
                return { valid: false, errors, warnings };
            }

            // Check version
            if (!importData.version) {
                errors.push('Missing version field - this may not be a valid PSPF Explorer backup');
            } else if (!SUPPORTED_IMPORT_VERSIONS.has(importData.version)) {
                warnings.push(`Unknown version "${importData.version}" - some data may not import correctly`);
            }

            if (importData.schema && typeof importData.schema === 'object') {
                if (importData.schema.id && importData.schema.id !== EXPORT_SCHEMA_ID) {
                    warnings.push(`Unexpected schema id "${importData.schema.id}"`);
                }
            }

            // Check data object exists
            const data = this.resolveImportPayload(importData);
            if (!data) {
                errors.push('Missing or invalid data field');
                return { valid: false, errors, warnings };
            }

            // Validate projects array
            if (data.projects !== undefined) {
                if (!Array.isArray(data.projects)) {
                    errors.push('Projects must be an array');
                } else {
                    const projectValidation = this.validateProjectsArray(data.projects);
                    errors.push(...projectValidation.errors);
                    warnings.push(...projectValidation.warnings);
                }
            }

            // Validate risks array
            if (data.risks !== undefined) {
                if (!Array.isArray(data.risks)) {
                    errors.push('Risks must be an array');
                } else {
                    const riskValidation = this.validateRisksArray(data.risks);
                    errors.push(...riskValidation.errors);
                    warnings.push(...riskValidation.warnings);
                }
            }

            // Validate incidents array
            if (data.incidents !== undefined) {
                if (!Array.isArray(data.incidents)) {
                    errors.push('Incidents must be an array');
                } else {
                    const incidentValidation = this.validateIncidentsArray(data.incidents);
                    errors.push(...incidentValidation.errors);
                    warnings.push(...incidentValidation.warnings);
                }
            }

            // Validate compliance object
            if (data.compliance !== undefined) {
                if (typeof data.compliance !== 'object' || Array.isArray(data.compliance)) {
                    errors.push('Compliance must be an object');
                } else {
                    const complianceValidation = this.validateComplianceObject(data.compliance);
                    errors.push(...complianceValidation.errors);
                    warnings.push(...complianceValidation.warnings);
                }
            }

            // Validate v2 optional arrays
            ['actions', 'directions', 'relationships', 'evidenceRecords', 'importBatches', 'mergeReviews'].forEach((key) => {
                if (data[key] !== undefined && !Array.isArray(data[key])) {
                    errors.push(`${key} must be an array`);
                }
            });

            if (Array.isArray(data.relationships)) {
                const relationshipValidation = this.validateRelationshipIntegrity(data);
                errors.push(...relationshipValidation.errors);
                warnings.push(...relationshipValidation.warnings);
            }

            // Check for reasonable data sizes (prevent DoS via huge files)
            const maxItems = 10000;
            if (data.projects?.length > maxItems) {
                errors.push(`Too many projects (${data.projects.length}). Maximum allowed: ${maxItems}`);
            }
            if (data.risks?.length > maxItems) {
                errors.push(`Too many risks (${data.risks.length}). Maximum allowed: ${maxItems}`);
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        }

        validateProjectsArray(projects) {
            const errors = [];
            const warnings = [];
            const seenIds = new Set();

            projects.forEach((project, index) => {
                const prefix = `Project ${index + 1}`;

                if (!project || typeof project !== 'object') {
                    errors.push(`${prefix}: Invalid project object`);
                    return;
                }

                // Required fields
                if (!project.id || typeof project.id !== 'string') {
                    errors.push(`${prefix}: Missing or invalid id`);
                } else {
                    if (seenIds.has(project.id)) {
                        errors.push(`${prefix}: Duplicate project id "${project.id}"`);
                    }
                    seenIds.add(project.id);
                }

                if (!project.name || typeof project.name !== 'string') {
                    errors.push(`${prefix}: Missing or invalid name`);
                } else if (project.name.length > 500) {
                    warnings.push(`${prefix}: Name is very long (${project.name.length} chars)`);
                }

                // Optional fields type checking
                if (project.description !== undefined && typeof project.description !== 'string') {
                    warnings.push(`${prefix}: Description should be a string`);
                }

                if (project.status !== undefined) {
                    const validStatuses = ['planning', 'active', 'on-hold', 'completed'];
                    if (!validStatuses.includes(project.status)) {
                        warnings.push(`${prefix}: Unknown status "${project.status}"`);
                    }
                }

                if (project.requirements !== undefined && !Array.isArray(project.requirements)) {
                    warnings.push(`${prefix}: Requirements should be an array`);
                }
            });

            return { errors, warnings };
        }

        validateRisksArray(risks) {
            const errors = [];
            const warnings = [];
            const seenIds = new Set();

            risks.forEach((risk, index) => {
                const prefix = `Risk ${index + 1}`;

                if (!risk || typeof risk !== 'object') {
                    errors.push(`${prefix}: Invalid risk object`);
                    return;
                }

                if (!risk.id || typeof risk.id !== 'string') {
                    errors.push(`${prefix}: Missing or invalid id`);
                } else {
                    if (seenIds.has(risk.id)) {
                        errors.push(`${prefix}: Duplicate risk id "${risk.id}"`);
                    }
                    seenIds.add(risk.id);
                }

                if (!risk.name || typeof risk.name !== 'string') {
                    errors.push(`${prefix}: Missing or invalid name`);
                }

                const validLevels = ['very-low', 'low', 'medium', 'high', 'very-high'];
                if (risk.likelihood !== undefined && !validLevels.includes(risk.likelihood)) {
                    warnings.push(`${prefix}: Unknown likelihood level "${risk.likelihood}"`);
                }

                if (risk.impact !== undefined && !validLevels.includes(risk.impact)) {
                    warnings.push(`${prefix}: Unknown impact level "${risk.impact}"`);
                }
            });

            return { errors, warnings };
        }

        validateIncidentsArray(incidents) {
            const errors = [];
            const warnings = [];
            const seenIds = new Set();

            incidents.forEach((incident, index) => {
                const prefix = `Event ${index + 1}`;

                if (!incident || typeof incident !== 'object') {
                    errors.push(`${prefix}: Invalid event object`);
                    return;
                }

                if (!incident.id || typeof incident.id !== 'string') {
                    errors.push(`${prefix}: Missing or invalid id`);
                } else {
                    if (seenIds.has(incident.id)) {
                        errors.push(`${prefix}: Duplicate event id "${incident.id}"`);
                    }
                    seenIds.add(incident.id);
                }

                if (incident.severity !== undefined) {
                    const validSeverities = ['low', 'medium', 'high', 'critical'];
                    if (!validSeverities.includes(incident.severity)) {
                        warnings.push(`${prefix}: Unknown severity "${incident.severity}"`);
                    }
                }
            });

            return { errors, warnings };
        }

        validateComplianceObject(compliance) {
            const errors = [];
            const warnings = [];
            const validStatuses = ['not-set', 'yes', 'no', 'partial', 'na'];

            Object.entries(compliance).forEach(([reqId, data]) => {
                if (!reqId || typeof reqId !== 'string') {
                    warnings.push(`Invalid compliance key found`);
                    return;
                }

                if (!data || typeof data !== 'object') {
                    warnings.push(`Compliance ${reqId}: Invalid data format`);
                    return;
                }

                if (data.status !== undefined && !validStatuses.includes(data.status)) {
                    warnings.push(`Compliance ${reqId}: Unknown status "${data.status}"`);
                }

                if (data.comment !== undefined && typeof data.comment !== 'string') {
                    warnings.push(`Compliance ${reqId}: Comment should be a string`);
                }

                if (data.url !== undefined && typeof data.url !== 'string') {
                    warnings.push(`Compliance ${reqId}: URL should be a string`);
                }
            });

            return { errors, warnings };
        }

        validateRelationshipIntegrity(data) {
            const errors = [];
            const warnings = [];
            const relationships = Array.isArray(data.relationships) ? data.relationships : [];
            if (!relationships.length) {
                return { errors, warnings };
            }

            const allowedTypes = new Set(['requirement', 'project', 'risk', 'incident', 'action', 'direction']);
            const entityIdsByType = {
                requirement: new Set(Object.keys(this.requirements || {})),
                project: new Set((data.projects || []).map(item => item?.id).filter(Boolean)),
                risk: new Set((data.risks || []).map(item => item?.id).filter(Boolean)),
                incident: new Set((data.incidents || []).map(item => item?.id).filter(Boolean)),
                action: new Set((data.actions || []).map(item => item?.id).filter(Boolean)),
                direction: new Set((data.directions || []).map(item => item?.id).filter(Boolean))
            };

            (data.projects || []).forEach((project) => {
                (project?.requirements || []).forEach((reqId) => {
                    if (typeof reqId === 'string' && reqId) {
                        entityIdsByType.requirement.add(reqId);
                    }
                });
            });
            Object.keys(data.compliance || {}).forEach((reqId) => {
                if (typeof reqId === 'string' && reqId) {
                    entityIdsByType.requirement.add(reqId);
                }
            });

            const seenSignatures = new Set();
            relationships.forEach((relationship, index) => {
                const prefix = `Relationship ${index + 1}`;
                if (!relationship || typeof relationship !== 'object') {
                    errors.push(`${prefix}: Invalid relationship object`);
                    return;
                }

                const sourceType = typeof relationship.sourceType === 'string' ? relationship.sourceType.trim().toLowerCase() : '';
                const sourceId = typeof relationship.sourceId === 'string' ? relationship.sourceId.trim() : '';
                const targetType = typeof relationship.targetType === 'string' ? relationship.targetType.trim().toLowerCase() : '';
                const targetId = typeof relationship.targetId === 'string' ? relationship.targetId.trim() : '';
                const relation = typeof relationship.relation === 'string' && relationship.relation.trim()
                    ? relationship.relation.trim().toLowerCase()
                    : 'supports';

                if (!allowedTypes.has(sourceType)) {
                    errors.push(`${prefix}: Unsupported sourceType "${relationship.sourceType || ''}"`);
                }
                if (!allowedTypes.has(targetType)) {
                    errors.push(`${prefix}: Unsupported targetType "${relationship.targetType || ''}"`);
                }
                if (!sourceId) {
                    errors.push(`${prefix}: Missing sourceId`);
                }
                if (!targetId) {
                    errors.push(`${prefix}: Missing targetId`);
                }

                if (sourceType && sourceId && entityIdsByType[sourceType] && !entityIdsByType[sourceType].has(sourceId)) {
                    errors.push(`${prefix}: Source ${sourceType}:${sourceId} is orphaned`);
                }
                if (targetType && targetId && entityIdsByType[targetType] && !entityIdsByType[targetType].has(targetId)) {
                    errors.push(`${prefix}: Target ${targetType}:${targetId} is orphaned`);
                }

                if (sourceType === targetType && sourceId && sourceId === targetId) {
                    errors.push(`${prefix}: Self-referential circular relationship is not allowed`);
                }

                const signature = `${sourceType}:${sourceId}->${targetType}:${targetId}:${relation}`;
                if (sourceType && sourceId && targetType && targetId) {
                    if (seenSignatures.has(signature)) {
                        errors.push(`${prefix}: Duplicate relationship detected`);
                    }
                    seenSignatures.add(signature);
                }
            });

            return { errors, warnings };
        }

        /**
         * Sanitizes imported data to ensure safe values
         * @param {Object} data - The data object to sanitize
         * @returns {Object} - Sanitized data
         */
        sanitizeImportData(data) {
            const sanitizeString = (str, maxLength = 10000) => {
                if (typeof str !== 'string') return '';
                // Remove any potential script tags or dangerous content
                return str
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .slice(0, maxLength);
            };

            const sanitizeId = (id) => {
                if (typeof id !== 'string') return String(Date.now());
                // Only allow alphanumeric, dashes, and underscores
                return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || String(Date.now());
            };

            const sanitizeOptionalId = (id) => {
                if (typeof id !== 'string') return '';
                return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
            };

            const sanitizeExternalSource = (src) => {
                if (!src || typeof src !== 'object') return undefined;
                return {
                    systemName:  sanitizeString(src.systemName,  200),
                    systemId:    sanitizeString(src.systemId,    100),
                    externalId:  sanitizeString(src.externalId,  100),
                    capturedAt:  typeof src.capturedAt === 'string' ? sanitizeString(src.capturedAt, 40) : new Date().toISOString(),
                    lockedFields: Array.isArray(src.lockedFields)
                        ? src.lockedFields.filter(f => typeof f === 'string').map(f => sanitizeString(f, 50))
                        : [],
                };
            };

            // Sanitize projects
            const projects = (data.projects || []).map(project => ({
                id: sanitizeId(project.id),
                name: sanitizeString(project.name, 500),
                description: sanitizeString(project.description, 5000),
                status: ['planning', 'active', 'on-hold', 'completed'].includes(project.status) 
                    ? project.status : 'planning',
                createdAt: project.createdAt || new Date().toISOString(),
                requirements: Array.isArray(project.requirements) 
                    ? project.requirements.filter(r => typeof r === 'string').map(r => sanitizeId(r))
                    : []
            }));

            // Sanitize risks
            const risks = (data.risks || []).map(risk => {
                const rec = {
                    id: sanitizeId(risk.id),
                    name: sanitizeString(risk.name, 500),
                    description: sanitizeString(risk.description, 5000),
                    likelihood: ['very-low', 'low', 'medium', 'high', 'very-high'].includes(risk.likelihood) 
                        ? risk.likelihood : 'medium',
                    impact: ['very-low', 'low', 'medium', 'high', 'very-high'].includes(risk.impact) 
                        ? risk.impact : 'medium',
                    severity: ['low', 'medium', 'high', 'critical'].includes(risk.severity) 
                        ? risk.severity : 'medium',
                    mitigation: sanitizeString(risk.mitigation, 5000),
                    projectId: risk.projectId ? sanitizeOptionalId(risk.projectId) : null,
                    createdAt: risk.createdAt || new Date().toISOString()
                };
                if (risk._externalSource) rec._externalSource = sanitizeExternalSource(risk._externalSource);
                return rec;
            });

            // Sanitize incidents
            const incidents = (data.incidents || []).map(incident => ({
                id: sanitizeId(incident.id),
                name: sanitizeString(incident.name, 500),
                description: sanitizeString(incident.description, 5000),
                severity: ['low', 'medium', 'high', 'critical'].includes(incident.severity) 
                    ? incident.severity : 'low',
                resolution: sanitizeString(incident.resolution, 5000),
                date: incident.date || new Date().toISOString(),
                projectId: incident.projectId ? sanitizeOptionalId(incident.projectId) : null,
                createdAt: incident.createdAt || new Date().toISOString()
            }));

            // Sanitize compliance
            const compliance = {};
            if (data.compliance && typeof data.compliance === 'object') {
                Object.entries(data.compliance).forEach(([key, value]) => {
                    const sanitizedKey = sanitizeId(key);
                    if (sanitizedKey && value && typeof value === 'object') {
                        compliance[sanitizedKey] = {
                            status: ['not-set', 'yes', 'no', 'partial', 'na'].includes(value.status) 
                                ? value.status : 'not-set',
                            comment: sanitizeString(value.comment, 5000),
                            url: sanitizeString(value.url, 2000)
                        };
                    }
                });
            }

            const directions = (data.directions || []).map(direction => {
                const rec = {
                    id: sanitizeId(direction.id),
                    title: sanitizeString(direction.title, 500),
                    instrumentNumber: sanitizeString(direction.instrumentNumber, 200),
                    issuedAt: typeof direction.issuedAt === 'string' ? sanitizeString(direction.issuedAt, 30) : null,
                    description: sanitizeString(direction.description, 5000),
                    createdAt: direction.createdAt || new Date().toISOString()
                };
                if (direction._externalSource) rec._externalSource = sanitizeExternalSource(direction._externalSource);
                return rec;
            });

            const allowedActionTypes = ['remediation', 'uplift', 'review', 'training', 'other'];
            const allowedActionStatuses = ['not-started', 'in-progress', 'completed', 'cancelled'];
            const actions = (data.actions || []).map(action => {
                const rec = {
                    id: sanitizeId(action.id),
                    title: sanitizeString(action.title, 500),
                    type: allowedActionTypes.includes(action.type) ? action.type : 'other',
                    status: allowedActionStatuses.includes(action.status) ? action.status : 'not-started',
                    dueDate: typeof action.dueDate === 'string' ? sanitizeString(action.dueDate, 30) : null,
                    description: sanitizeString(action.description, 5000),
                    createdAt: action.createdAt || new Date().toISOString()
                };
                if (action._externalSource) rec._externalSource = sanitizeExternalSource(action._externalSource);
                return rec;
            });

            const relationships = (data.relationships || []).map(link => ({
                id: sanitizeId(link.id),
                sourceType: sanitizeString(link.sourceType, 100),
                sourceId: sanitizeOptionalId(link.sourceId),
                targetType: sanitizeString(link.targetType, 100),
                targetId: sanitizeOptionalId(link.targetId),
                relation: sanitizeString(link.relation, 100) || 'supports',
                createdAt: link.createdAt || new Date().toISOString()
            }));

            const evidenceRecords = (data.evidenceRecords || []).map(record => ({
                id: sanitizeId(record.id),
                requirementId: sanitizeOptionalId(record.requirementId),
                type: sanitizeString(record.type, 100),
                note: sanitizeString(record.note, 5000),
                url: sanitizeString(record.url, 2000),
                createdAt: record.createdAt || new Date().toISOString()
            }));

            const importBatches = (data.importBatches || []).map(batch => ({
                id: sanitizeId(batch.id),
                source: sanitizeString(batch.source, 500),
                importedAt: batch.importedAt || new Date().toISOString(),
                note: sanitizeString(batch.note, 2000)
            }));

            const mergeReviews = (data.mergeReviews || []).map(review => ({
                id: sanitizeId(review.id),
                status: sanitizeString(review.status, 100) || 'pending',
                summary: sanitizeString(review.summary, 2000),
                reviewedAt: review.reviewedAt || null
            }));

            return {
                projects,
                risks,
                incidents,
                compliance,
                actions,
                directions,
                relationships,
                evidenceRecords,
                importBatches,
                mergeReviews
            };
        }

        clearAllData() {
            if (!confirm('This will permanently delete ALL your data. This action cannot be undone!\n\nAre you sure?')) {
                return;
            }

            try {
                this.projects = [];
                this.risks = [];
                this.incidents = [];
                this.compliance = {};
                this.actions = [];
                this.directions = [];
                this.relationships = [];
                this.evidenceRecords = [];
                this.importBatches = [];
                this.mergeReviews = [];

                if (this.storageAvailable) {
                    localStorage.removeItem('pspf_projects');
                    localStorage.removeItem('pspf_risks');
                    localStorage.removeItem('pspf_incidents');
                    localStorage.removeItem('pspf_compliance');
                    localStorage.removeItem('pspf_actions');
                    localStorage.removeItem('pspf_directions');
                    localStorage.removeItem('pspf_relationships');
                    localStorage.removeItem('pspf_evidence_records');
                    localStorage.removeItem('pspf_import_batches');
                    localStorage.removeItem('pspf_merge_reviews');
                    localStorage.removeItem('pspf_state_v2');
                    localStorage.removeItem('pspf_last_modified');
                    localStorage.removeItem(DATA_MODEL_VERSION_KEY);
                    localStorage.removeItem(MY_WORK_USER_NAME_KEY);
                    localStorage.removeItem(MY_WORK_FILTERS_KEY);
                }

                this.updateDataStats();
                this.renderHome();

                this.showNotification('All data has been cleared successfully.', 'success');
                
            } catch (error) {
                console.error('Clear data failed:', error);
                this.showNotification('Failed to clear data. Please try again.', 'error');
            }
        }

        // Tag Management System
        renderTagManagement() {
            const tagManagementArea = document.getElementById('tagManagementArea');
            if (!tagManagementArea) return;

            const tagKeys = Object.keys(this.tagDefinitions);
            
            if (tagKeys.length === 0) {
                tagManagementArea.innerHTML = '<p style="color: var(--text-secondary); padding: 16px; text-align: center;">No tags defined. Add your first tag below.</p>';
                return;
            }

            tagManagementArea.innerHTML = tagKeys.map(tagKey => {
                const tag = this.tagDefinitions[tagKey];
                const tagCount = this.countTagUsage(tagKey);
                
                return `
                    <div class="tag-management-item">
                        <div class="tag-management-info">
                            <div class="tag-management-color" style="background-color: ${tag.color};"></div>
                            <div class="tag-management-details">
                                <div class="tag-management-name">${tag.name || tagKey}</div>
                                <div class="tag-management-description">${tag.description} • Used ${tagCount} time${tagCount !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                        <div class="tag-management-actions">
                            <button class="btn btn-outline btn-small" data-action="edit-tag" data-tag-key="${tagKey}">Edit</button>
                            <button class="btn btn-danger btn-small" data-action="delete-tag" data-tag-key="${tagKey}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        countTagUsage(tagKey) {
            let count = 0;
            Object.values(this.userTagAssignments).forEach(userMap => {
                Object.values(userMap).forEach(tags => {
                    if (tags.includes(tagKey)) {
                        count++;
                    }
                });
            });
            return count;
        }

        addNewTag() {
            const nameInput = document.getElementById('newTagName');
            const colorInput = document.getElementById('newTagColor');
            const descriptionInput = document.getElementById('newTagDescription');

            if (!nameInput || !colorInput || !descriptionInput) return;

            const name = nameInput.value.trim();
            const color = colorInput.value;
            const description = descriptionInput.value.trim();

            if (!name) {
                this.showNotification('Please enter a tag name.', 'warning');
                return;
            }

            // Normalize tag name (lowercase, no spaces)
            const tagKey = name.toLowerCase().replace(/\s+/g, '-');

            if (this.tagDefinitions[tagKey]) {
                this.showNotification('A tag with this name already exists.', 'warning');
                return;
            }

            this.tagDefinitions[tagKey] = {
                name: name,
                color: color,
                description: description || `Custom ${name} tag`
            };

            this.saveTagDefinitions();
            
            // Clear form
            nameInput.value = '';
            colorInput.value = '#3b82f6';
            descriptionInput.value = '';

            // Refresh UI
            this.renderTagManagement();
            this.populateTagFilters();
            this.renderMyWorkView();

            this.showNotification(`Tag "${name}" added successfully!`, 'success');
        }

        editTag(tagKey) {
            const tag = this.tagDefinitions[tagKey];
            if (!tag) return;

            const newName = prompt('Enter new tag name:', tagKey);
            if (!newName || newName.trim() === '') return;

            const newColor = prompt('Enter new color (hex code):', tag.color);
            if (!newColor || !newColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                this.showNotification('Invalid color format. Please use hex format like #3b82f6', 'warning');
                return;
            }

            const newDescription = prompt('Enter new description:', tag.description);
            if (!newDescription || newDescription.trim() === '') return;

            const newTagKey = newName.toLowerCase().replace(/\s+/g, '-');

            // If name changed, update all user assignments that use this tag
            if (newTagKey !== tagKey) {
                if (this.tagDefinitions[newTagKey]) {
                    this.showNotification('A tag with this name already exists.', 'warning');
                    return;
                }

                Object.values(this.userTagAssignments).forEach(userMap => {
                    Object.keys(userMap).forEach(reqId => {
                        userMap[reqId] = userMap[reqId].map(t => t === tagKey ? newTagKey : t);
                    });
                });

                delete this.tagDefinitions[tagKey];
            }

            this.tagDefinitions[newTagKey] = {
                name: newName,
                color: newColor,
                description: newDescription
            };

            this.saveTagDefinitions();
            this.saveUserTagAssignments();
            
            // Refresh UI
            this.renderTagManagement();
            this.populateTagFilters();
            this.renderMyWorkView();

            this.showNotification('Tag updated successfully!', 'success');
        }

        deleteTag(tagKey) {
            const tagCount = this.countTagUsage(tagKey);
            
            const confirmMessage = tagCount > 0 
                ? `This tag is used on ${tagCount} requirement${tagCount !== 1 ? 's' : ''}. Deleting it will remove it from all requirements.\n\nAre you sure?`
                : 'Are you sure you want to delete this tag?';

            if (!confirm(confirmMessage)) return;

            Object.values(this.userTagAssignments).forEach(userMap => {
                Object.keys(userMap).forEach(reqId => {
                    const remaining = userMap[reqId].filter(t => t !== tagKey);
                    if (remaining.length) {
                        userMap[reqId] = remaining;
                    } else {
                        delete userMap[reqId];
                    }
                });
            });

            delete this.tagDefinitions[tagKey];

            this.saveTagDefinitions();
            this.saveUserTagAssignments();
            
            // Refresh UI
            this.renderTagManagement();
            this.populateTagFilters();
            this.renderMyWorkView();

            this.showNotification('Tag deleted successfully!', 'success');
        }

        saveTagDefinitions() {
            if (!this.storageAvailable) {
                return;
            }
            localStorage.setItem('pspf_tag_definitions', JSON.stringify(this.tagDefinitions));
        }

        loadTagDefinitions() {
            const savedTags = this.readStorage('pspf_tag_definitions', null);
            if (savedTags) {
                // Merge custom tags with defaults (custom tags override defaults)
                this.tagDefinitions = { ...this.tagDefinitions, ...savedTags };
            }
        }

        initializeUserProfile() {
            const savedProfile = this.readStorage('pspf_user_profile', null);
            if (savedProfile && savedProfile.id) {
                this.currentUserProfile = savedProfile;
                return;
            }
            const generatedId = `user-${Date.now().toString(36)}`;
            this.currentUserProfile = { id: generatedId, name: 'You' };
            this.saveUserProfile();
        }

        saveUserProfile() {
            if (!this.storageAvailable || !this.currentUserProfile) return;
            localStorage.setItem('pspf_user_profile', JSON.stringify(this.currentUserProfile));
        }

        loadUserTagAssignments() {
            this.userTagAssignments = this.readStorage('pspf_user_tag_assignments', {});
            if (!this.currentUserProfile) return;
            if (!this.userTagAssignments[this.currentUserProfile.id]) {
                this.userTagAssignments[this.currentUserProfile.id] = {};
            }

            if (!this.storageAvailable || !localStorage.getItem('pspf_user_tag_assignments')) {
                const demoTags = this.userTagAssignments[this.currentUserProfile.id];
                demoTags['GOV-001'] = ['high'];
                demoTags['GOV-002'] = ['critical'];
                demoTags['TECH-099'] = ['medium'];
                demoTags['INFO-058'] = ['low', 'medium'];
                this.saveUserTagAssignments();
            }
        }

        saveUserTagAssignments() {
            if (!this.storageAvailable) return;
            localStorage.setItem('pspf_user_tag_assignments', JSON.stringify(this.userTagAssignments));
        }

        loadMyWorkPreferences() {
            const storedName = this.readStorage(MY_WORK_USER_NAME_KEY, null);
            if (typeof storedName === 'string' && storedName.trim()) {
                if (!this.currentUserProfile) {
                    this.currentUserProfile = { id: `user-${Date.now().toString(36)}`, name: storedName };
                } else {
                    this.currentUserProfile.name = storedName;
                }
            }

            const storedFilters = this.readStorage(MY_WORK_FILTERS_KEY, []);
            if (Array.isArray(storedFilters)) {
                const validFilters = storedFilters.filter(tagId => !!this.tagDefinitions[tagId]);
                this.myWorkActiveTagFilters = new Set(validFilters);
                if (this.storageAvailable && storedFilters.length !== validFilters.length) {
                    this.saveMyWorkFilters();
                }
            } else {
                this.myWorkActiveTagFilters = new Set();
            }
        }

        persistMyWorkUserName(rawName) {
            const normalized = (rawName || '').trim() || 'You';
            if (!this.currentUserProfile) {
                this.currentUserProfile = { id: `user-${Date.now().toString(36)}`, name: normalized };
            } else {
                this.currentUserProfile.name = normalized;
            }
            this.saveUserProfile();
            this.saveMyWorkUserName(normalized);
            this.renderMyWorkView();
        }

        saveMyWorkUserName(name) {
            if (!this.storageAvailable) return;
            localStorage.setItem(MY_WORK_USER_NAME_KEY, JSON.stringify(name));
        }

        saveMyWorkFilters() {
            if (!this.storageAvailable) return;
            localStorage.setItem(MY_WORK_FILTERS_KEY, JSON.stringify(Array.from(this.myWorkActiveTagFilters)));
        }

        // Requirement Management System
        initializeRequirementUUIDs() {
            // Add UUIDs to existing requirements if they don't have them
            Object.keys(this.requirements).forEach(reqId => {
                if (!this.requirements[reqId].uuid) {
                    this.requirements[reqId].uuid = this.generateUUID();
                }
            });
            this.saveData();
        }

        generateUUID() {
            return 'req_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        showRequirementManagerModal() {
            const modalContent = `
                <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
                    <h3>📋 Requirement Management</h3>
                    <div style="margin-bottom: 1rem;">
                        <button class="btn btn-primary" id="addReqBtn">+ Add New Requirement</button>
                        <button class="btn btn-secondary" id="exportReqBtn">Export Requirements</button>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <select id="domainFilter" style="min-width: 150px;">
                            <option value="">All Domains</option>
                            ${this.domains.map(d => `<option value="${d.id}">${this.escapeHtml(d.title)}</option>`).join('')}
                        </select>
                        <input type="text" id="requirementSearch" placeholder="Search requirements..." style="flex: 1;">
                    </div>
                    
                    <div id="requirementsManagerList" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
                        <!-- Requirements list will be populated here -->
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-secondary" id="closeReqMgrBtn">Close</button>
                    </div>
                </div>
            `;
            
            const modal = this.createModal(modalContent, { id: 'requirementManagerModal' });
            
            // Attach tracked event listeners for proper cleanup
            modal.addTrackedListener(modal.querySelector('#addReqBtn'), 'click', () => this.showAddRequirementModal());
            modal.addTrackedListener(modal.querySelector('#exportReqBtn'), 'click', () => this.exportRequirements());
            modal.addTrackedListener(modal.querySelector('#closeReqMgrBtn'), 'click', () => modal.remove());
            modal.addTrackedListener(modal.querySelector('#domainFilter'), 'change', () => this.filterRequirements('requirementsManagerList'));
            modal.addTrackedListener(modal.querySelector('#requirementSearch'), 'input', () => this.filterRequirements('requirementsManagerList'));
            
            this.renderRequirementsList('requirementsManagerList');
        }

        renderRequirementsList(targetId = 'requirementsList') {
            if (targetId === 'requirementsList') {
                this.renderDomainRequirementsSidebar();
                return;
            }

            const container = document.getElementById(targetId);
            if (!container) return;

            const domainFilter = document.getElementById('domainFilter')?.value || '';
            const searchFilter = document.getElementById('requirementSearch')?.value.toLowerCase() || '';
            
            let requirementsToShow = Object.values(this.requirements);
            
            if (domainFilter) {
                requirementsToShow = requirementsToShow.filter(req => req.domainId === domainFilter);
            }
            
            if (searchFilter) {
                requirementsToShow = requirementsToShow.filter(req => 
                    req.id.toLowerCase().includes(searchFilter) ||
                    req.title.toLowerCase().includes(searchFilter) ||
                    req.description.toLowerCase().includes(searchFilter)
                );
            }
            
            requirementsToShow.sort((a, b) => a.id.localeCompare(b.id));
            
            container.innerHTML = requirementsToShow.map(req => {
                const domain = this.domains.find(d => d.id === req.domainId);
                const hasCompliance = this.compliance[req.id];
                
                return `
                    <div class="requirement-mgmt-item" style="
                        border: 1px solid var(--border-light); 
                        border-radius: 8px; 
                        padding: 1rem; 
                        margin-bottom: 0.5rem;
                        background: var(--bg-card);
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 1rem;
                    ">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <strong style="color: var(--primary-color);">${req.id}</strong>
                                <span style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: 4px;">
                                    ${domain ? domain.title : 'Unknown'}
                                </span>
                                ${hasCompliance ? '<span style="font-size: 0.8rem; color: var(--success-color);">📊 Has Data</span>' : ''}
                            </div>
                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${req.title}</div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.4;">${req.description.length > 150 ? req.description.substring(0, 150) + '...' : req.description}</div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                            <button class="btn btn-outline btn-small" data-action="edit-requirement-mgmt" data-req-uuid="${req.uuid}">Edit</button>
                            <button class="btn btn-danger btn-small" data-action="delete-requirement-mgmt" data-req-uuid="${req.uuid}" 
                                    ${hasCompliance ? 'title="Warning: This requirement has compliance data"' : ''}>Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            if (requirementsToShow.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No requirements found matching your criteria.</div>';
            }
        }

        renderDomainRequirementsSidebar() {
            const requirementsList = document.getElementById('requirementsList');
            if (!requirementsList) return;

            this.populateTagFilters();
            this.updateTagFiltersVisibility();

            const domain = this.domains.find(d => d.id === this.selectedDomain);
            if (!domain) {
                requirementsList.innerHTML = `
                    <div class="empty-state">
                        <h4>Select a domain</h4>
                        <p>Choose a domain above to see its requirements and assign tags.</p>
                    </div>
                `;
                return;
            }

            let requirementIds = [...domain.requirements];

            if (this.activeTagFilters.size > 0) {
                requirementIds = requirementIds.filter(reqId => {
                    const userTags = this.getUserRequirementTags(reqId);
                    return userTags.some(tag => this.activeTagFilters.has(tag));
                });
            }

            const query = (this.requirementsSearchQuery || '').trim().toLowerCase();
            if (query) {
                requirementIds = requirementIds.filter(reqId => {
                    const req = this.requirements[reqId];
                    const title = (req?.title || '').toLowerCase();
                    return reqId.toLowerCase().includes(query) || title.includes(query);
                });
            }

            if (!requirementIds.length) {
                requirementsList.innerHTML = `
                    <div class="empty-state">
                        <h4>No requirements match</h4>
                        <p>Try clearing tags or adjusting the search box.</p>
                    </div>
                `;
                return;
            }

            requirementsList.innerHTML = requirementIds
                .map(reqId => this.renderRequirementListItem(reqId))
                .join('');
        }

        filterRequirements(targetId = 'requirementsList') {
            this.renderRequirementsList(targetId);
        }

        showAddRequirementModal() {
            this.showRequirementEditModal();
        }

        editRequirement(uuid) {
            const requirement = Object.values(this.requirements).find(req => req.uuid === uuid);
            if (requirement) {
                this.showRequirementEditModal(requirement);
            }
        }

        showRequirementEditModal(requirement = null) {
            const isEdit = !!requirement;
            const modalContent = `
                <div class="modal-content">
                    <h3>${isEdit ? 'Edit Requirement' : 'Add New Requirement'}</h3>
                    <form id="requirementEditForm">
                        <div class="form-group">
                            <label for="reqId">Requirement ID</label>
                            <input type="text" id="reqId" required placeholder="e.g., GOV-036" 
                                   value="${requirement ? this.escapeHtml(requirement.id) : ''}"
                                   pattern="[A-Z]+-[0-9]+" title="Format: DOMAIN-NUMBER (e.g., GOV-036)">
                            <small style="color: var(--text-secondary);">Format: DOMAIN-NUMBER (e.g., GOV-036, TECH-108)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="reqDomain">Domain</label>
                            <select id="reqDomain" required>
                                <option value="">Select Domain</option>
                                ${this.domains.map(domain => `
                                    <option value="${domain.id}" ${requirement && requirement.domainId === domain.id ? 'selected' : ''}>
                                        ${this.escapeHtml(domain.title)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="reqTitle">Title</label>
                            <input type="text" id="reqTitle" required placeholder="Requirement title"
                                   value="${requirement ? this.escapeHtml(requirement.title) : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="reqDescription">Description</label>
                            <textarea id="reqDescription" required placeholder="Detailed requirement description" rows="4">${requirement ? this.escapeHtml(requirement.description) : ''}</textarea>
                        </div>
                        
                        ${isEdit ? `
                            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                                <strong>⚠️ Important:</strong> Changing the Requirement ID will preserve all existing compliance data 
                                and project links through the internal UUID system.
                            </div>
                        ` : ''}
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelReqEditBtn">Cancel</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Requirement</button>
                        </div>
                    </form>
                </div>
            `;
            
            const modal = this.createModal(modalContent);
            
            // Attach tracked event listeners for proper cleanup
            modal.addTrackedListener(modal.querySelector('#cancelReqEditBtn'), 'click', () => modal.remove());
            
            const form = modal.querySelector('#requirementEditForm');
            modal.addTrackedListener(form, 'submit', (e) => {
                e.preventDefault();
                this.saveRequirement(requirement);
                modal.remove();
            });
        }

        saveRequirement(existingRequirement = null) {
            const reqId = document.getElementById('reqId').value.trim();
            const domain = document.getElementById('reqDomain').value;
            const title = document.getElementById('reqTitle').value.trim();
            const description = document.getElementById('reqDescription').value.trim();
            
            // Validate ID format
            if (!/^[A-Z]+-[0-9]+$/.test(reqId)) {
                this.showNotification('Invalid ID format. Use format: DOMAIN-NUMBER (e.g., GOV-036)', 'error');
                return;
            }
            
            // Check for duplicate IDs (unless editing existing)
            if (!existingRequirement && this.requirements[reqId]) {
                this.showNotification('A requirement with this ID already exists.', 'warning');
                return;
            }
            
            if (existingRequirement) {
                // Update existing requirement
                const oldId = existingRequirement.id;
                
                // If ID changed, we need to update domain arrays and migrate compliance data
                if (oldId !== reqId) {
                    this.migrateRequirementData(oldId, reqId);
                }
                
                // Update the requirement object
                delete this.requirements[oldId]; // Remove old key
                this.requirements[reqId] = {
                    ...existingRequirement,
                    id: reqId,
                    domainId: domain,
                    title: title,
                    description: description
                };
                
            } else {
                // Create new requirement
                const uuid = this.generateUUID();
                this.requirements[reqId] = {
                    id: reqId,
                    uuid: uuid,
                    domainId: domain,
                    title: title,
                    description: description
                };
                
                // Add to domain requirements array
                const targetDomain = this.domains.find(d => d.id === domain);
                if (targetDomain) {
                    targetDomain.requirements.push(reqId);
                    // Sort requirements in domain
                    targetDomain.requirements.sort();
                }
            }
            
            this.saveData();
            this.renderRequirementsList();
            this.renderRequirementsList('requirementsManagerList');
            this.renderDomainsGrid();
            this.showNotification(`Requirement ${reqId} ${existingRequirement ? 'updated' : 'created'} successfully!`, 'success');
        }

        migrateRequirementData(oldId, newId) {
            // Update domain requirements arrays
            this.domains.forEach(domain => {
                const index = domain.requirements.indexOf(oldId);
                if (index !== -1) {
                    domain.requirements[index] = newId;
                }
            });
            
            // Migrate compliance data
            if (this.compliance[oldId]) {
                this.compliance[newId] = this.compliance[oldId];
                delete this.compliance[oldId];
            }
            
            // Update project requirements
            this.projects.forEach(project => {
                if (Array.isArray(project.requirements)) {
                    const index = project.requirements.indexOf(oldId);
                    if (index !== -1) {
                        project.requirements[index] = newId;
                    }
                }
            });
        }

        deleteRequirement(uuid) {
            const requirement = Object.values(this.requirements).find(req => req.uuid === uuid);
            if (!requirement) return;
            
            const hasCompliance = this.compliance[requirement.id];
            const message = hasCompliance 
                ? `This requirement has compliance data. Are you sure you want to delete "${requirement.id}"?\n\nThis will also delete all associated compliance data and project links.`
                : `Are you sure you want to delete requirement "${requirement.id}"?`;
            
            if (!confirm(message)) return;
            
            // Remove from domain requirements array
            this.domains.forEach(domain => {
                domain.requirements = domain.requirements.filter(id => id !== requirement.id);
            });
            
            // Remove compliance data
            delete this.compliance[requirement.id];
            
            // Remove from project requirements
            this.projects.forEach(project => {
                if (Array.isArray(project.requirements)) {
                    project.requirements = project.requirements.filter(id => id !== requirement.id);
                }
            });
            
            // Remove the requirement itself
            delete this.requirements[requirement.id];
            
            this.saveData();
            this.renderRequirementsList();
            this.renderRequirementsList('requirementsManagerList');
            this.renderDomainsGrid();
            this.showNotification(`Requirement ${requirement.id} deleted successfully.`, 'success');
        }

        exportRequirements() {
            const requirementsData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                domains: this.domains.map(d => ({
                    id: d.id,
                    title: d.title,
                    description: d.description,
                    requirements: d.requirements
                })),
                requirements: Object.values(this.requirements)
            };
            
            const blob = new Blob([JSON.stringify(requirementsData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `pspf-requirements-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            this.showNotification('Requirements exported successfully!', 'success');
        }

        saveData() {
            if (!this.storageAvailable) {
                return;
            }
            localStorage.setItem('pspf_projects', JSON.stringify(this.projects));
            localStorage.setItem('pspf_risks', JSON.stringify(this.risks));
            localStorage.setItem('pspf_incidents', JSON.stringify(this.incidents));
            localStorage.setItem('pspf_compliance', JSON.stringify(this.compliance));
            localStorage.setItem('pspf_actions', JSON.stringify(this.actions));
            localStorage.setItem('pspf_directions', JSON.stringify(this.directions));
            localStorage.setItem('pspf_relationships', JSON.stringify(this.relationships));
            localStorage.setItem('pspf_evidence_records', JSON.stringify(this.evidenceRecords));
            localStorage.setItem('pspf_import_batches', JSON.stringify(this.importBatches));
            localStorage.setItem('pspf_merge_reviews', JSON.stringify(this.mergeReviews));
            localStorage.setItem('pspf_state_v2', JSON.stringify(this.buildLocalStateEnvelope()));
            this.saveProgressHistory();
            localStorage.setItem(DATA_MODEL_VERSION_KEY, CURRENT_DATA_MODEL_VERSION);
            localStorage.setItem('pspf_last_modified', new Date().toISOString());
        }

        saveProgressHistory() {
            if (!this.storageAvailable) return;
            localStorage.setItem('pspf_progress_history', JSON.stringify(this.progressHistory));
        }

        writeStorage(key, value) {
            if (!this.storageAvailable) {
                return;
            }

            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn(`Failed to write storage key "${key}":`, error);
            }
        }

        readStorage(key, fallback) {
            if (!this.storageAvailable) {
                return this.cloneFallback(fallback);
            }

            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : this.cloneFallback(fallback);
            } catch (error) {
                console.warn(`Failed to read storage key "${key}":`, error);
                return this.cloneFallback(fallback);
            }
        }

        normalizeProgressHistory() {
            if (!this.progressHistory || typeof this.progressHistory !== 'object') {
                this.progressHistory = {};
                return;
            }
            Object.keys(this.progressHistory).forEach(domainId => {
                const entry = this.progressHistory[domainId];
                if (!Array.isArray(entry)) {
                    this.progressHistory[domainId] = [];
                    return;
                }
                this.progressHistory[domainId] = entry.filter(item => item && item.timestamp && typeof item.percentage === 'number');
            });
        }

        cloneFallback(value) {
            if (Array.isArray(value)) {
                return [...value];
            }
            if (value && typeof value === 'object') {
                return { ...value };
            }
            return value;
        }
    }

    export function bootstrapPSPFExplorer() {
        if (typeof document === 'undefined') {
            return null;
        }
        const instance = new PSPFExplorer();
        if (typeof window !== 'undefined') {
            window.pspfExplorer = instance;
        }
        return instance;
    }

    if (typeof document !== 'undefined') {
        const bootstrap = () => bootstrapPSPFExplorer();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap);
        } else {
            bootstrap();
        }
    }
