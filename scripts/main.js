// Import domain data from module files
let PSPFDomainsData;

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
            this.tasks = this.readStorage('pspf_tasks', []);
            this.risks = this.readStorage('pspf_risks', []);
            this.incidents = this.readStorage('pspf_incidents', []);
            this.compliance = this.readStorage('pspf_compliance', {});
            this.progressHistory = this.readStorage('pspf_progress_history', {});
            this.normalizeProgressHistory();

            this.userProfiles = this.readStorage('pspf_user_profiles', {});
            this.currentUserProfile = null;
            this.userTagAssignments = this.readStorage('pspf_user_tag_assignments', {});
            this.myWorkActiveTagFilters = new Set();
            
            this.currentView = 'home';
            this.selectedDomain = null;
            this.editingProject = null;
            this.editingTask = null;
            this.editingRisk = null;
            this.editingIncident = null;
            
            if (this.options.autoInit) {
                this.init();
            }
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
                <span class="notification-message">${this.escapeHtml(message)}</span>
                <button class="notification-close" aria-label="Close notification">×</button>
            `;

            container.appendChild(notification);

            // Trigger animation
            requestAnimationFrame(() => {
                notification.classList.add('notification-show');
            });

            // Close button handler
            const closeBtn = notification.querySelector('.notification-close');
            const removeNotification = () => {
                notification.classList.remove('notification-show');
                notification.classList.add('notification-hide');
                setTimeout(() => notification.remove(), 300);
            };
            closeBtn.addEventListener('click', removeNotification);

            // Auto-remove after duration
            if (duration > 0) {
                setTimeout(removeNotification, duration);
            }
        }

        /**
         * Escape HTML to prevent XSS
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * Create a modal with proper event listener cleanup
         * @param {string} content - HTML content for the modal
         * @param {Object} options - Modal options
         * @returns {HTMLElement} The modal element
         */
        createModal(content, options = {}) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            if (options.id) modal.id = options.id;
            modal.innerHTML = content;
            
            // Store event listeners for cleanup
            modal._eventListeners = [];
            
            // Helper to add tracked event listeners
            modal.addTrackedListener = (element, event, handler) => {
                element.addEventListener(event, handler);
                modal._eventListeners.push({ element, event, handler });
            };
            
            // Enhanced remove method that cleans up listeners
            const originalRemove = modal.remove.bind(modal);
            modal.remove = () => {
                // Clean up all tracked event listeners
                modal._eventListeners.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
                modal._eventListeners = [];
                this.activeModals.delete(modal);
                originalRemove();
            };
            
            document.body.appendChild(modal);
            modal.style.display = 'block';
            this.activeModals.add(modal);
            
            return modal;
        }

        init() {
            this.loadDomainData();
            this.loadTagDefinitions(); // Load custom tag definitions
            this.initializeUserProfile();
            this.loadUserTagAssignments();
            this.loadSavedRequirements(); // Load saved tags
            this.initializeRequirementUUIDs();

            if (typeof document !== 'undefined') {
                this.setupEventListeners();
                this.setupEventDelegation();
                this.showWelcomeModalIfFirstTime();
                this.renderHome();
                this.updateDataStats();
            }
        }

        loadDomainData() {
            // Initialize tag definitions
            this.tagDefinitions = {
                'critical': { name: 'Critical', color: '#ef4444', description: 'Critical priority requirements' },
                'high': { name: 'High', color: '#f97316', description: 'High priority requirements' },
                'medium': { name: 'Medium', color: '#eab308', description: 'Medium priority requirements' },
                'low': { name: 'Low', color: '#22c55e', description: 'Low priority requirements' }
            };

            // Initialize active tag filters
            this.activeTagFilters = new Set();

            // Domain definitions are loaded from domain modules
            // See: scripts/domains/index.js for the consolidated exports
            this.domains = PSPFDomainsData.domains;

            // Requirements are loaded from domain module files
            // See: scripts/domains/*.js for individual domain requirements
            this.requirements = PSPFDomainsData.requirements;
            
            // Essential Eight controls are defined in scripts/domains/technology.js
            this.essentialEightControls = PSPFDomainsData.essentialEightControls;
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

            // Back button in project detail view
            const backToProjectsBtn = document.getElementById('backToProjectsBtn');
            if (backToProjectsBtn) {
                backToProjectsBtn.addEventListener('click', () => {
                    const listView = document.getElementById('projectListView');
                    const detailView = document.getElementById('projectDetailView');
                    if (detailView) detailView.classList.add('hidden');
                    if (listView) listView.classList.remove('hidden');
                    this.renderProjects();
                });
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

            // Task modal
            const taskForm = document.getElementById('taskForm');
            const cancelTask = document.getElementById('cancelTask');
            
            if (taskForm) {
                taskForm.addEventListener('submit', (e) => this.handleTaskForm(e));
            }
            if (cancelTask) {
                cancelTask.addEventListener('click', () => this.hideModal('taskModal'));
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

            // Project view tab switching
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabName = e.target.getAttribute('data-tab');
                    if (tabName) {
                        this.switchProjectTab(tabName);
                    }
                });
            });

            // Add Task button in project view
            const addTaskBtn = document.getElementById('addTaskBtn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', () => {
                    this.showTaskModal(null, this.currentProjectId);
                });
            }

            // Add Risk button in project view
            const addRiskBtn = document.getElementById('addRiskBtn');
            if (addRiskBtn) {
                addRiskBtn.addEventListener('click', () => {
                    this.showRiskModal(null, this.currentProjectId);
                });
            }

            // Link Requirements button in project view
            const linkReqBtn = document.getElementById('linkRequirementBtn');
            if (linkReqBtn) {
                linkReqBtn.addEventListener('click', () => {
                    this.showLinkRequirementsModal();
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

                case 'add-task':
                    const taskProjectId = target.dataset.projectId;
                    if (taskProjectId) this.addTask(taskProjectId);
                    break;

                case 'add-risk':
                    const riskProjectId = target.dataset.projectId;
                    if (riskProjectId) this.addRisk(riskProjectId);
                    break;

                // Task actions
                case 'edit-task':
                    const editTaskId = target.dataset.taskId;
                    if (editTaskId) this.editTask(editTaskId);
                    break;

                case 'delete-task':
                    const deleteTaskId = target.dataset.taskId;
                    if (deleteTaskId) this.deleteTask(deleteTaskId);
                    break;

                case 'complete-task':
                    const completeTaskId = target.dataset.taskId;
                    if (completeTaskId) this.markTaskComplete(completeTaskId);
                    break;

                case 'reopen-task':
                    const reopenTaskId = target.dataset.taskId;
                    if (reopenTaskId) this.markTaskIncomplete(reopenTaskId);
                    break;

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

                case 'view-task':
                    const taskId = target.dataset.taskId;
                    if (taskId) this.showTaskModal(taskId);
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
            }

            // Special handling for project view
            if (viewName === 'project') {
                const listView = document.getElementById('projectListView');
                const detailView = document.getElementById('projectDetailView');
                if (listView) listView.classList.remove('hidden');
                if (detailView) detailView.classList.add('hidden');
                this.renderProjects();
            }

            // Special handling for data view
            if (viewName === 'data') {
                this.renderTagManagement();
            }
        }

        updateNavButtons(activeId) {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.removeAttribute('aria-current');
            });
            
                if (viewName === 'myWork') {
                    this.renderMyWorkView();
                }
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
                            <span class="domain-health-pill ${health.status}">${health.text}</span>
                        </header>
                        <div class="requirement-chip-grid">
                            ${requirementTiles}
                        </div>
                    </article>
                `;
            }).join('');
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
            const requirementsList = document.getElementById('requirementsList');

            if (selectedDomainTitle) selectedDomainTitle.textContent = domain.title + ' Requirements';
            if (selectedDomainDescription) selectedDomainDescription.textContent = domain.description;

            if (requirementsList) {
                requirementsList.innerHTML = domain.requirements.map(reqId => {
                    const requirement = this.requirements[reqId];
                    // Skip if requirement is not defined
                    if (!requirement) {
                        console.warn(`Requirement ${reqId} not found in definitions`);
                        return '';
                    }
                    const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
                    
                    return `
                        <div class="requirement-item" data-req="${reqId}" data-action="view-requirement" data-requirement-id="${reqId}" tabindex="0" role="button">
                            <div class="requirement-info">
                                <span class="requirement-code">${reqId}</span>
                                ${compliance.url ? '<span class="url-indicator" title="Has reference link">🔗</span>' : ''}
                                <div class="requirement-tags">${this.renderTagsInList(requirement)}</div>
                            </div>
                            <span class="requirement-status ${compliance.status}">${this.getStatusText(compliance.status)}</span>
                        </div>
                    `;
                }).join('');
            }

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
            
            return `
                <div class="tag-manager">
                    <h5>Tags</h5>
                    <div class="tag-selector">
                        ${Object.keys(this.tagDefinitions).map(tagId => {
                            const tag = this.tagDefinitions[tagId];
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
                        }).join('')}
                    </div>
                    <div class="tags-display">
                        ${tags.map(tagId => {
                            const tag = this.tagDefinitions[tagId];
                            return `<span class="tag" style="background-color: ${tag.color}">${tag.name}</span>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        renderTagsInList(requirement) {
            const tags = this.getUserRequirementTags(requirement.id);
            if (tags.length === 0) return '';
            
            return tags.map(tagId => {
                const tag = this.tagDefinitions[tagId];
                if (!tag) return '';
                return `<span class="tag" style="background-color: ${tag.color}">${tag.name}</span>`;
            }).join('');
        }

        showRequirementDetails(reqId) {
            const requirement = this.requirements[reqId];
            const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
            const requirementDetails = document.getElementById('requirementDetails');
            
            if (!requirement || !requirementDetails) return;

            // Update active state in sidebar
            document.querySelectorAll('.requirement-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-req="${reqId}"]`).classList.add('active');

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
            const totalTasks = this.tasks.length;
            const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
            const totalRisks = this.risks.length;
            const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Animate number updates
            this.animateNumber('totalProjectsProgress', totalProjects);
            this.animateNumber('totalTasks', totalTasks);
            this.animateNumber('completedTasks', completedTasks);
            this.animateNumber('totalRisks', totalRisks);
            
            // Update main compliance display
            document.getElementById('overallCompliance').textContent = complianceLabel;
            
            // Update progress rings
            this.updateProgressRing('taskCompletionRing', 'taskCompletionPercent', taskCompletionPercentage);
            this.updateProgressRing('complianceRing', 'compliancePercent', rawCompliancePercentage);
            
            // Update mini charts
            this.updateMiniChart('projectsChart', Math.min(totalProjects * 10, 100));
            this.updateMiniChart('tasksChart', Math.min(totalTasks * 5, 100));
            this.updateMiniChart('risksChart', Math.min(totalRisks * 15, 100));
            
            // Update trend indicators
            this.updateTrendIndicators(totalProjects, totalTasks, completedTasks, rawCompliancePercentage, totalRisks);

            this.renderDomainRequirementHeatmap();

            // Refresh Essential Eight summary
            this.renderEssentialEightWidget();
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
        
        updateTrendIndicators(projects, tasks, completed, compliance, risks) {
            // Simple trend logic - in a real app, you'd compare with historical data
            const trends = {
                projects: projects > 0 ? 'up' : 'neutral',
                tasks: tasks > 0 ? 'up' : 'neutral', 
                completion: completed > 0 ? 'up' : 'neutral',
                compliance: compliance > 50 ? 'up' : compliance > 0 ? 'neutral' : 'down',
                risks: risks > 0 ? 'down' : 'neutral' // More risks = negative trend
            };
            
            this.setTrend('projectsTrend', trends.projects, 'Active projects');
            this.setTrend('tasksTrend', trends.tasks, 'Total tasks');
            this.setTrend('completionTrend', trends.completion, 'Task completion');
            this.setTrend('complianceTrend', trends.compliance, 'Compliance level');
            this.setTrend('risksTrend', trends.risks, 'Risk level');
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
                    const trimmed = (event.target.value || '').trim();
                    this.currentUserProfile.name = trimmed || 'You';
                    this.saveUserProfile();
                    this.renderMyWorkView();
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
            this.renderMyWorkView();
        }

        clearMyWorkFilters() {
            if (!this.myWorkActiveTagFilters.size) return;
            this.myWorkActiveTagFilters.clear();
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

            // Search tasks
            this.tasks.forEach(task => {
                if (task.name.toLowerCase().includes(query) || 
                    task.description.toLowerCase().includes(query)) {
                    results.push({
                        type: 'Task',
                        title: task.name,
                        description: task.description,
                        id: task.id
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
                        : result.type === 'Task' ? 'view-task'
                            : result.type === 'Risk' ? 'view-risk'
                                : result.domainId ? 'view-domain'
                                    : '';
                const datasetAttrs = [
                    result.reqId ? `data-requirement-id="${result.reqId}"` : '',
                    result.projectId ? `data-project-id="${result.projectId}"` : (result.id && result.type === 'Project') ? `data-project-id="${result.id}"` : '',
                    result.domainId ? `data-domain-id="${result.domainId}"` : '',
                    result.taskId ? `data-task-id="${result.taskId}"` : (result.type === 'Task' && result.id) ? `data-task-id="${result.id}"` : '',
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
                return;
            }

            projectsList.innerHTML = this.projects.map(project => `
                <div class="project-item" data-project="${project.id}" data-action="view-project" data-project-id="${project.id}" tabindex="0" role="button">
                    <div class="project-name">${project.name}</div>
                    <div class="project-meta">
                        <span class="project-status ${project.status}">${this.getStatusText(project.status)}</span>
                        <span>${this.getProjectTasksCount(project.id)} tasks</span>
                    </div>
                </div>
            `).join('');
            
            // Clear the details panel
            this.clearProjectDetails();
        }

        showProjectDetails(projectId) {
            const project = this.projects.find(p => p.id === projectId);
            const projectDetails = document.getElementById('projectDetails');
            
            if (!project || !projectDetails) return;

            // Update active state in sidebar
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-project="${projectId}"]`).classList.add('active');

            const tasksCount = this.getProjectTasksCount(projectId);
            const risksCount = this.getProjectRisksCount(projectId);
            const requirementsCount = this.getProjectRequirementsCount(projectId);

            // Get tasks and risks for this project
            const projectTasks = this.tasks.filter(task => task.projectId === projectId);
            const projectRisks = this.risks.filter(risk => risk.projectId === projectId);

            projectDetails.innerHTML = `
                <h4>${project.name}</h4>
                <p><strong>Description:</strong> ${project.description || 'No description provided'}</p>
                
                <div class="project-detail-meta">
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Status</div>
                        <div class="project-detail-meta-value">
                            <span class="project-status ${project.status}">${this.getStatusText(project.status)}</span>
                        </div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Created</div>
                        <div class="project-detail-meta-value">${project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}</div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Tasks</div>
                        <div class="project-detail-meta-value">${tasksCount}</div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Risks</div>
                        <div class="project-detail-meta-value">${risksCount}</div>
                    </div>
                    <div class="project-detail-meta-item">
                        <div class="project-detail-meta-label">Requirements</div>
                        <div class="project-detail-meta-value">${requirementsCount}</div>
                    </div>
                </div>

                <div class="project-actions">
                    <button class="btn btn-primary" data-action="edit-project" data-project-id="${project.id}">Edit Project</button>
                    <button class="btn btn-secondary" data-action="add-task" data-project-id="${project.id}">Add Task</button>
                    <button class="btn btn-outline" data-action="add-risk" data-project-id="${project.id}">Add Risk</button>
                    <button class="btn btn-danger" data-action="delete-project" data-project-id="${project.id}">Delete Project</button>
                </div>

                ${projectTasks.length > 0 ? `
                    <div class="project-tasks-section">
                        <h5>📋 Tasks (${projectTasks.length})</h5>
                        <div class="tasks-list">
                            ${projectTasks.map(task => `
                                <div class="task-item">
                                    <div class="task-content">
                                        <h6>${task.title}</h6>
                                        <p>${task.description || 'No description'}</p>
                                        <div class="task-meta">
                                            <span class="task-status status-${task.status}">${this.getStatusText(task.status)}</span>
                                            ${task.dueDate ? `<span class="task-due">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="task-actions">
                                        <button class="btn btn-small btn-outline" data-action="edit-task" data-task-id="${task.id}">Edit</button>
                                        <button class="btn btn-small btn-danger" data-action="delete-task" data-task-id="${task.id}">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${projectRisks.length > 0 ? `
                    <div class="project-risks-section">
                        <h5>⚠️ Risks (${projectRisks.length})</h5>
                        <div class="risks-list">
                            ${projectRisks.map(risk => `
                                <div class="risk-item">
                                    <div class="risk-content">
                                        <h6>${risk.title}</h6>
                                        <p>${risk.description || 'No description'}</p>
                                        <div class="risk-meta">
                                            <span class="risk-severity severity-${risk.severity}">${risk.severity ? risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1) : 'Unknown'}</span>
                                            <span class="risk-probability">Probability: ${risk.probability || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div class="risk-actions">
                                        <button class="btn btn-small btn-outline" data-action="edit-risk" data-risk-id="${risk.id}">Edit</button>
                                        <button class="btn btn-small btn-danger" data-action="delete-risk" data-risk-id="${risk.id}">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        }

        clearProjectDetails() {
            const projectDetails = document.getElementById('projectDetails');
            if (projectDetails) {
                projectDetails.innerHTML = `
                    <div class="placeholder-content">
                        <h4>Select a Project</h4>
                        <p>Choose a project from the list to view its details and manage tasks.</p>
                    </div>
                `;
            }
        }

        getProjectTasksCount(projectId) {
            return this.tasks.filter(task => task.projectId === projectId).length;
        }

        getProjectRisksCount(projectId) {
            return this.risks.filter(risk => risk.projectId === projectId).length;
        }

        getProjectRequirementsCount(projectId) {
            const project = this.projects.find(p => p.id === projectId);
            return (project && project.requirements) ? project.requirements.length : 0;
        }

        addTask(projectId) {
            this.currentProjectId = projectId;
            this.showTaskModal();
        }

        addRisk(projectId) {
            this.currentProjectId = projectId;
            this.showRiskModal();
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
                // Also delete associated tasks
                this.tasks = this.tasks.filter(t => t.projectId !== projectId);
                this.saveData();
                this.renderProjects();
                this.clearProjectDetails();
                this.updateStats();
                this.updateDataStats();
            }
        }

        showProjectTasks(projectId) {
            const project = this.projects.find(p => p.id === projectId);
            if (!project) return;

            // Ensure requirements array exists (migration for legacy data)
            if (!Array.isArray(project.requirements)) {
                project.requirements = [];
                this.saveData();
            }

            this.currentProjectId = projectId;
            this.showView('project');
            this.updateNavButtons('projectBtn');

            // Toggle list/detail panes
            const listView = document.getElementById('projectListView');
            const detailView = document.getElementById('projectDetailView');
            if (listView) listView.classList.add('hidden');
            if (detailView) detailView.classList.remove('hidden');

            // Update project view header
            document.getElementById('projectTitle').textContent = project.name;
            document.getElementById('projectDescription').textContent = project.description;
            // Status chip
            const statusChip = document.getElementById('projectStatusChip');
            if (statusChip) {
                statusChip.textContent = project.status?.replace('-', ' ') || 'Unknown';
                statusChip.className = `status-badge ${project.status || ''}`;
            }
            // Due chip
            const dueChip = document.getElementById('projectDueChip');
            if (dueChip) {
                if (project.endDate) {
                    const end = new Date(project.endDate);
                    const now = new Date();
                    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                    let cls = 'ok';
                    let label = '';
                    if (days < 0) { cls = 'overdue'; label = `Overdue by ${Math.abs(days)}d`; }
                    else if (days <= 7) { cls = 'soon'; label = `Due in ${days}d`; }
                    else { label = `Due in ${days}d`; }
                    dueChip.textContent = label;
                    dueChip.className = `due-chip ${cls}`;
                } else {
                    dueChip.className = 'due-chip hidden';
                }
            }
            // Compact progress based on tasks in this project
            const projectTasks = this.tasks.filter(t => t.projectId === projectId);
            const completed = projectTasks.filter(t => t.status === 'completed').length;
            const percent = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
            const progressFill = document.getElementById('projectProgressFill');
            const progressText = document.getElementById('projectProgressText');
            if (progressFill) progressFill.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `${percent}% complete`;

            // Header quick actions
            const headerAddTaskBtn = document.getElementById('headerAddTaskBtn');
            if (headerAddTaskBtn) headerAddTaskBtn.onclick = () => this.showTaskModal(null, this.currentProjectId);
            const headerAddRiskBtn = document.getElementById('headerAddRiskBtn');
            if (headerAddRiskBtn) headerAddRiskBtn.onclick = () => this.showRiskModal(null, this.currentProjectId);
            const headerExportBtn = document.getElementById('headerExportBtn');
            if (headerExportBtn) headerExportBtn.onclick = () => this.exportData();

            // Set up breadcrumb
            this.updateBreadcrumb([
                { text: 'PSPF Domains', level: 'home' },
                { text: 'Projects', level: 'projects' },
                { text: project.name, level: 'project' }
            ]);

            // Show tasks tab by default and render tasks
            this.switchProjectTab('tasks');
            this.renderTasks(projectId);
            this.updateProjectTabCounts();
            this.renderProjectRequirements();
        }

        updateProjectTabCounts() {
            const tasksCountEl = document.getElementById('tasksCount');
            const risksCountEl = document.getElementById('risksCount');
            const incidentsCountEl = document.getElementById('incidentsCount');
            const reqCountEl = document.getElementById('requirementsCount');
            const pid = this.currentProjectId;
            if (tasksCountEl) tasksCountEl.textContent = this.tasks.filter(t => t.projectId === pid).length;
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
            this.editingTask = null;
            this.editingRisk = null;
            this.editingIncident = null;
        }

        // Task Management CRUD Operations
        showTaskModal(taskId = null, projectId = null) {
            this.editingTask = taskId;
            this.currentProjectId = projectId;
            const modal = document.getElementById('taskModal');
            const title = document.getElementById('taskModalTitle');
            const form = document.getElementById('taskForm');

            if (taskId) {
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    title.textContent = 'Edit Task';
                    document.getElementById('taskName').value = task.name;
                    document.getElementById('taskDesc').value = task.description;
                    document.getElementById('taskStatus').value = task.status;
                    document.getElementById('taskAssignee').value = task.assignee || '';
                    document.getElementById('taskDueDate').value = task.dueDate || '';
                }
            } else {
                title.textContent = 'Add Task';
                form.reset();
            }

            modal.style.display = 'block';
        }

        handleTaskForm(e) {
            e.preventDefault();
            this.saveTask();
        }

        saveTask() {
            const taskData = {
                name: document.getElementById('taskName').value,
                description: document.getElementById('taskDesc').value,
                status: document.getElementById('taskStatus').value,
                assignee: document.getElementById('taskAssignee').value,
                dueDate: document.getElementById('taskDueDate').value,
                projectId: this.currentProjectId,
                createdAt: new Date().toISOString()
            };

            if (this.editingTask) {
                const index = this.tasks.findIndex(t => t.id === this.editingTask);
                if (index !== -1) {
                    this.tasks[index] = { ...this.tasks[index], ...taskData };
                }
            } else {
                taskData.id = Date.now().toString();
                this.tasks.push(taskData);
            }

            this.saveData();
            this.hideModal('taskModal');
            this.renderTasks();
            this.updateStats();
            this.updateDataStats();
            this.updateProjectTabCounts();
        }

        editTask(taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                this.showTaskModal(taskId, task.projectId);
            }
        }

        deleteTask(taskId) {
            if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.saveData();
                this.renderTasks();
                this.updateStats();
                this.updateDataStats();
            }
        }

        renderTasks(projectId = null) {
            const tasksList = document.getElementById('tasksList');
            if (!tasksList) return;

            let tasksToShow = this.tasks;
            if (projectId) {
                tasksToShow = this.tasks.filter(t => t.projectId === projectId);
            }

            if (tasksToShow.length === 0) {
                tasksList.innerHTML = `
                    <div class="empty-state">
                        <h3>No tasks yet</h3>
                        <p>Create your first task to start tracking work.</p>
                    </div>
                `;
                return;
            }

            tasksList.innerHTML = tasksToShow.map(task => {
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
                const dueDateClass = isOverdue ? 'overdue' : '';

                return `
                    <div class="task-card ${task.status}">
                        <div class="task-header">
                            <h4>${task.name}</h4>
                            <span class="status-badge ${task.status}">${task.status.replace('-', ' ')}</span>
                        </div>
                        <p class="task-description">${task.description}</p>
                        <div class="task-meta">
                            ${task.assignee ? `<span class="assignee">👤 ${task.assignee}</span>` : ''}
                            ${task.dueDate ? `<span class="due-date ${dueDateClass}">📅 Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                            ${isOverdue ? '<span class="overdue-indicator">⚠️ Overdue</span>' : ''}
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-outline btn-small" data-action="edit-task" data-task-id="${task.id}">Edit</button>
                            <button class="btn btn-danger btn-small" data-action="delete-task" data-task-id="${task.id}">Delete</button>
                            ${task.status !== 'completed' ? 
                                `<button class="btn btn-success btn-small" data-action="complete-task" data-task-id="${task.id}">Complete</button>` : 
                                `<button class="btn btn-secondary btn-small" data-action="reopen-task" data-task-id="${task.id}">Reopen</button>`
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }

        markTaskComplete(taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'completed';
                task.completedAt = new Date().toISOString();
                this.saveData();
                this.renderTasks();
                this.updateStats();
                this.updateProjectTabCounts();
            }
        }

        markTaskIncomplete(taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'in-progress';
                delete task.completedAt;
                this.saveData();
                this.renderTasks();
                this.updateStats();
                this.updateProjectTabCounts();
            }
        }

        // Risk Management CRUD Operations
        showRiskModal(riskId = null, projectId = null) {
            this.editingRisk = riskId;
            this.currentProjectId = projectId;
            const modal = document.getElementById('riskModal');
            const title = document.getElementById('riskModalTitle');
            const form = document.getElementById('riskForm');

            if (riskId) {
                const risk = this.risks.find(r => r.id === riskId);
                if (risk) {
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

        // Placeholder methods for Incident CRUD operations
        handleIncidentForm(e) {
            e.preventDefault();
            this.hideModal('incidentModal');
        }

        switchProjectTab(tabName) {
            // Remove active class from all tab buttons and panes
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            // Add active class to selected tab button and pane
            const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
            const activePane = document.getElementById(`${tabName}Tab`);

            if (activeBtn) activeBtn.classList.add('active');
            if (activePane) activePane.classList.add('active');

            // Render content based on tab
            switch (tabName) {
                case 'tasks':
                    this.renderTasks(this.currentProjectId);
                    this.updateProjectTabCounts();
                    break;
                case 'risks':
                    this.renderRisks(this.currentProjectId);
                    this.updateProjectTabCounts();
                    break;
                case 'requirements':
                    this.renderProjectRequirements();
                    this.updateProjectTabCounts();
                    break;
                case 'incidents':
                    // TODO: Implement incident rendering
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
            const taskCount = this.tasks.length;
            const riskCount = this.risks.length;
            const incidentCount = this.incidents.length;
            const lastModified = localStorage.getItem('pspf_last_modified');

            document.getElementById('dataProjectCount').textContent = projectCount;
            document.getElementById('dataTaskCount').textContent = taskCount;
            document.getElementById('dataRiskCount').textContent = riskCount;
            document.getElementById('dataIncidentCount').textContent = incidentCount;
            document.getElementById('dataLastModified').textContent = 
                lastModified ? new Date(lastModified).toLocaleDateString() : 'Never';
        }

        // Requirements linking
        renderProjectRequirements() {
            const list = document.getElementById('requirementsList');
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
                const title = req ? req.title : reqId;
                const domainTitle = domain ? domain.title : 'Unknown domain';
                return `
                    <div class="requirement-item" style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight:600; color: var(--text-primary);">${title}</div>
                            <div style="font-size: 0.9rem; color: var(--text-secondary);">${reqId} • ${domainTitle}</div>
                        </div>
                        <div>
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
        }

        exportData() {
            try {
                const exportData = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    data: {
                        projects: this.projects,
                        tasks: this.tasks,
                        risks: this.risks,
                        incidents: this.incidents,
                        compliance: this.compliance
                    }
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json'
                });

                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = `pspf-explorer-backup-${new Date().toISOString().split('T')[0]}.json`;
                
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                this.showNotification('Data exported successfully!', 'success');
                
            } catch (error) {
                console.error('Export failed:', error);
                this.showNotification('Export failed. Please try again.', 'error');
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
                    this.tasks = sanitizedData.tasks;
                    this.risks = sanitizedData.risks;
                    this.incidents = sanitizedData.incidents;
                    this.compliance = sanitizedData.compliance;

                    this.saveData();
                    this.updateDataStats();
                    this.renderHome();

                    const summary = `Imported: ${this.projects.length} projects, ${this.tasks.length} tasks, ${this.risks.length} risks, ${this.incidents.length} events, ${Object.keys(this.compliance).length} compliance records`;
                    
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

            // Validate tasks array
            if (data.tasks !== undefined) {
                if (!Array.isArray(data.tasks)) {
                    errors.push('Tasks must be an array');
                } else {
                    const taskValidation = this.validateTasksArray(data.tasks);
                    errors.push(...taskValidation.errors);
                    warnings.push(...taskValidation.warnings);
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
            if (data.tasks?.length > maxItems) {
                errors.push(`Too many tasks (${data.tasks.length}). Maximum allowed: ${maxItems}`);
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

        validateTasksArray(tasks) {
            const errors = [];
            const warnings = [];
            const seenIds = new Set();

            tasks.forEach((task, index) => {
                const prefix = `Task ${index + 1}`;

                if (!task || typeof task !== 'object') {
                    errors.push(`${prefix}: Invalid task object`);
                    return;
                }

                if (!task.id || typeof task.id !== 'string') {
                    errors.push(`${prefix}: Missing or invalid id`);
                } else {
                    if (seenIds.has(task.id)) {
                        errors.push(`${prefix}: Duplicate task id "${task.id}"`);
                    }
                    seenIds.add(task.id);
                }

                if (!task.name || typeof task.name !== 'string') {
                    errors.push(`${prefix}: Missing or invalid name`);
                }

                if (task.status !== undefined) {
                    const validStatuses = ['not-started', 'in-progress', 'completed', 'blocked'];
                    if (!validStatuses.includes(task.status)) {
                        warnings.push(`${prefix}: Unknown status "${task.status}"`);
                    }
                }

                if (task.dueDate !== undefined && task.dueDate !== '') {
                    const date = new Date(task.dueDate);
                    if (isNaN(date.getTime())) {
                        warnings.push(`${prefix}: Invalid due date format`);
                    }
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

            // Sanitize tasks
            const tasks = (data.tasks || []).map(task => ({
                id: sanitizeId(task.id),
                name: sanitizeString(task.name, 500),
                description: sanitizeString(task.description, 5000),
                status: ['not-started', 'in-progress', 'completed', 'blocked'].includes(task.status) 
                    ? task.status : 'not-started',
                assignee: sanitizeString(task.assignee, 200),
                dueDate: task.dueDate || '',
                projectId: task.projectId ? sanitizeId(task.projectId) : null,
                createdAt: task.createdAt || new Date().toISOString()
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

            return { projects, tasks, risks, incidents, compliance };
        }

        clearAllData() {
            if (!confirm('This will permanently delete ALL your data. This action cannot be undone!\n\nAre you sure?')) {
                return;
            }

            try {
                this.projects = [];
                this.tasks = [];
                this.risks = [];
                this.incidents = [];
                this.compliance = {};

                if (this.storageAvailable) {
                    localStorage.removeItem('pspf_projects');
                    localStorage.removeItem('pspf_tasks');
                    localStorage.removeItem('pspf_risks');
                    localStorage.removeItem('pspf_incidents');
                    localStorage.removeItem('pspf_compliance');
                    localStorage.removeItem('pspf_last_modified');
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
            const container = document.getElementById(targetId);
            if (!container) return;
            
            // Populate tag filters first
            this.populateTagFilters();
            
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
            
            // Apply tag filters
            if (this.activeTagFilters && this.activeTagFilters.size > 0) {
                requirementsToShow = requirementsToShow.filter(req => {
                    const reqTags = this.getUserRequirementTags(req.id);
                    return Array.from(this.activeTagFilters).some(tagId => reqTags.includes(tagId));
                });
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
            localStorage.setItem('pspf_tasks', JSON.stringify(this.tasks));
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
