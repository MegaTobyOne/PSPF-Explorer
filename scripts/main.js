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

            // Initialize data structures
            this.projects = this.readStorage('pspf_projects', []);
            this.risks = this.readStorage('pspf_risks', []);
            this.incidents = this.readStorage('pspf_incidents', []);
            this.compliance = this.readStorage('pspf_compliance', {});
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
            this.editingProject = null;
            this.editingRisk = null;
            this.editingIncident = null;
            this.isDomainGridCollapsed = false;
            this.isTagFiltersCollapsed = false;
            
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
            this.renderHome();
            this.renderProjects();
            this.renderTagManagement();
            this.renderMyWorkView();
            this.renderProgress();
            this.renderDomainRequirementHeatmap();
            this.showWelcomeModalIfFirstTime();
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

            document.getElementById('dataBtn').addEventListener('click', () => {
                this.showView('data');
                this.updateNavButtons('dataBtn');
                this.updateDataStats();
            });

            document.getElementById('helpBtn').addEventListener('click', () => {
                this.showView('help');
                this.updateNavButtons('helpBtn');
            });

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
                importDataBtn.addEventListener('click', () => importFileInput.click());
                importFileInput.addEventListener('change', (e) => this.importData(e));
            }

            const clearDataBtn = document.getElementById('clearDataBtn');
            if (clearDataBtn) {
                clearDataBtn.addEventListener('click', () => this.clearAllData());
            }

            const manageRequirementsBtn = document.getElementById('manageRequirementsBtn');
            if (manageRequirementsBtn) {
                manageRequirementsBtn.addEventListener('click', () => {
                    this.showRequirementManagerModal();
                });
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
                // Domain actions
                case 'view-domain':
                    const domainId = target.dataset.domainId;
                    if (domainId) {
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

                default:
                    console.warn(`Unknown delegated action: ${action}`);
            }
        }

        showWelcomeModalIfFirstTime() {
            if (!this.storageAvailable || typeof document === 'undefined') {
                return;
            }
            const hasSeenWelcome = localStorage.getItem('pspf_welcome_seen');
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
                modal.style.display = 'block';
            }
        }

        hideWelcomeModal() {
            if (typeof document === 'undefined') {
                return;
            }
            const modal = document.getElementById('welcomeModal');
            if (modal) {
                modal.style.display = 'none';
                if (this.storageAvailable) {
                    localStorage.setItem('pspf_welcome_seen', 'true');
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
            }

            if (viewName === 'myWork') {
                this.renderMyWorkView();
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

            let selectedDomainId = previousValue && this.domains.some(domain => domain.id === previousValue)
                ? previousValue
                : (this.selectedDomain || this.domains[0]?.id || '');

            if (selectedDomainId) {
                select.value = selectedDomainId;
            }

            if (!select.dataset.listenerAdded) {
                select.addEventListener('change', (event) => {
                    this.updateGapReportList(event.target.value);
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

        updateGapReportList(domainId) {
            const summaryEl = document.getElementById('gapReportSummary');
            const listEl = document.getElementById('gapReportList');
            if (!summaryEl || !listEl) {
                return;
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

        renderRequirementListItem(reqId) {
            const requirement = this.requirements[reqId];
            if (!requirement) {
                console.warn(`Requirement ${reqId} not found in definitions`);
                return '';
            }
            const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
            const hasUrl = Boolean(compliance.url);
            const title = this.escapeHtml(requirement.title || '');

            return `
                <div class="requirement-item" data-req="${reqId}" data-action="view-requirement" data-requirement-id="${reqId}" tabindex="0" role="button" aria-label="${reqId} ${title}" title="${title}">
                    <div class="requirement-info">
                        <div class="requirement-code-row">
                            <span class="requirement-code">${reqId}</span>
                            ${hasUrl ? '<span class="url-indicator" title="Has reference link">🔗</span>' : ''}
                        </div>
                    </div>
                    <span class="requirement-status ${compliance.status}">${this.getStatusText(compliance.status)}</span>
                </div>
            `;
        }

        showRequirementDetails(reqId) {
            const requirement = this.requirements[reqId];
            const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
            const requirementDetails = document.getElementById('requirementDetails');
            
            if (!requirement || !requirementDetails) return;

            // Update active state in sidebar (if the list is currently rendered)
            const sidebarItems = document.querySelectorAll('.requirement-item');
            if (sidebarItems.length) {
                sidebarItems.forEach(item => item.classList.remove('active'));
            }
            const activeSidebarItem = document.querySelector(`[data-req="${reqId}"]`);
            if (activeSidebarItem) {
                activeSidebarItem.classList.add('active');
            }

            // Get linked projects
            const linkedProjects = this.projects.filter(project => 
                Array.isArray(project.requirements) && project.requirements.includes(reqId)
            );

            requirementDetails.innerHTML = `
                <h4>${requirement.title}</h4>
                <p><strong>Requirement ID:</strong> ${reqId}</p>
                <p>${requirement.description}</p>
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
                    
                    <h5>Reference URL</h5>
                    <input type="url" class="compliance-url" data-req="${reqId}" 
                           placeholder="https://example.com/policy-document" 
                           value="${compliance.url || ''}" 
                           onblur="window.pspfExplorer.updateComplianceUrl('${reqId}', this.value)">
                    <small class="field-help">📎 Link to relevant documentation, policies, or evidence</small>
                    
                    <h5>Comments</h5>
                    <textarea class="compliance-comment" data-req="${reqId}" placeholder="Add implementation notes, evidence, or comments..." onblur="window.pspfExplorer.updateComplianceComment('${reqId}', this.value)">${compliance.comment}</textarea>
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
            const met = requirements.filter(reqId => {
                const status = this.compliance[reqId]?.status;
                return status === 'yes' || status === 'na';
            }).length;
            const snapshot = {
                timestamp: new Date().toISOString(),
                met,
                total: requirements.length,
                percentage: requirements.length ? Math.round((met / requirements.length) * 100) : 0
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

        renderProgress() {
            this.renderEssentialEightWidget();

            const progressGrid = document.getElementById('progressGrid');
            if (!progressGrid) return;

            progressGrid.innerHTML = this.domains.map((domain) => {
                const health = this.calculateDomainHealth(domain.id);
                const requirements = domain.requirements;
                const completedRequirements = requirements.filter(reqId => 
                    this.compliance[reqId] && this.compliance[reqId].status === 'yes'
                ).length;
                const percentage = Math.round((completedRequirements / requirements.length) * 100);

                return `
                    <div class="progress-card ${health.status}">
                        <div class="progress-header">
                            <h3>${domain.title}</h3>
                            <div class="pulse-dot ${health.status}"></div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="progress-stats">
                            <span>${completedRequirements}/${requirements.length} completed</span>
                            <span>${percentage}%</span>
                        </div>
                        <p class="progress-status">${health.text}</p>
                        <button class="btn btn-outline btn-small" data-action="view-domain" data-domain-id="${domain.id}">
                            Manage Compliance
                        </button>
                    </div>
                `;
            }).join('');

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
                            <span><strong>${latest.total}</strong> total</span>
                            <span>${latest.percentage}% compliance</span>
                        </div>
                    </div>
                `;
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

            modal.style.display = 'block';
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
            if (modal) {
                modal.style.display = 'none';
            }
            this.editingProject = null;
            this.editingRisk = null;
            this.editingIncident = null;
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
                }
            } else {
                title.textContent = 'Add Risk';
                form.reset();
            }

            modal.style.display = 'block';
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
                    this.risks[index] = { ...this.risks[index], ...riskData };
                }
            } else {
                riskData.id = Date.now().toString();
                this.risks.push(riskData);
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

                return `
                    <div class="risk-card ${severityClass}">
                        <div class="risk-header">
                            <h4>${risk.name}</h4>
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

            modal.style.display = 'block';
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
            this.populateScopedExportSelectors();
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

            modal.style.display = 'block';
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

        exportData() {
            try {
                const exportData = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    data: {
                        projects: this.projects,
                        risks: this.risks,
                        incidents: this.incidents,
                        compliance: this.compliance
                    }
                };

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

                const payload = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
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
                };

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

                const payload = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
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
                };

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
                    const importData = JSON.parse(e.target.result);
                    
                    // Validate the backup file structure and data
                    const validation = this.validateImportData(importData);
                    
                    if (!validation.valid) {
                        this.showNotification(`Import failed: ${validation.errors.join(', ')}`, 'error', 8000);
                        return;
                    }

                    // Show warnings if any
                    let confirmMessage = 'This will replace all current data with imported data.';
                    if (validation.warnings.length > 0) {
                        confirmMessage += `\\n\\nWarnings:\\n${validation.warnings.join('\\n')}`;
                    }
                    confirmMessage += '\\n\\nContinue?';

                    if (!confirm(confirmMessage)) {
                        return;
                    }

                    // Sanitize and import the data
                    const sanitizedData = this.sanitizeImportData(importData.data);
                    
                    this.projects = sanitizedData.projects;
                    this.risks = sanitizedData.risks;
                    this.incidents = sanitizedData.incidents;
                    this.compliance = sanitizedData.compliance;

                    this.saveData();
                    this.updateDataStats();
                    this.renderHome();

                    const summary = `Imported: ${this.projects.length} projects, ${this.risks.length} risks, ${this.incidents.length} events, ${Object.keys(this.compliance).length} compliance records`;
                    
                    this.showNotification(summary, 'success', 6000);
                    
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
            } else if (!['1.0', '1.1', '2.0'].includes(importData.version)) {
                warnings.push(`Unknown version "${importData.version}" - some data may not import correctly`);
            }

            // Check data object exists
            if (!importData.data || typeof importData.data !== 'object') {
                errors.push('Missing or invalid data field');
                return { valid: false, errors, warnings };
            }

            const data = importData.data;

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
            const risks = (data.risks || []).map(risk => ({
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
                projectId: risk.projectId ? sanitizeId(risk.projectId) : null,
                createdAt: risk.createdAt || new Date().toISOString()
            }));

            // Sanitize incidents
            const incidents = (data.incidents || []).map(incident => ({
                id: sanitizeId(incident.id),
                name: sanitizeString(incident.name, 500),
                description: sanitizeString(incident.description, 5000),
                severity: ['low', 'medium', 'high', 'critical'].includes(incident.severity) 
                    ? incident.severity : 'low',
                resolution: sanitizeString(incident.resolution, 5000),
                date: incident.date || new Date().toISOString(),
                projectId: incident.projectId ? sanitizeId(incident.projectId) : null,
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

            return { projects, risks, incidents, compliance };
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

                if (this.storageAvailable) {
                    localStorage.removeItem('pspf_projects');
                    localStorage.removeItem('pspf_risks');
                    localStorage.removeItem('pspf_incidents');
                    localStorage.removeItem('pspf_compliance');
                    localStorage.removeItem('pspf_last_modified');
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

            if (!requirementIds.length) {
                requirementsList.innerHTML = `
                    <div class="empty-state">
                        <h4>No requirements match these tags</h4>
                        <p>Clear the tag filter to view all requirements in this domain.</p>
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
            this.saveProgressHistory();
            localStorage.setItem('pspf_last_modified', new Date().toISOString());
        }

        saveProgressHistory() {
            if (!this.storageAvailable) return;
            localStorage.setItem('pspf_progress_history', JSON.stringify(this.progressHistory));
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
