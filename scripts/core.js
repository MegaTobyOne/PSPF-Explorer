/**
 * PSPF Explorer - Core Module
 * Contains base class with core utilities, storage, UI helpers, and event handling
 */

export class PSPFExplorerCore {
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
        
        this.currentView = 'home';
        this.selectedDomain = null;
        this.editingProject = null;
        this.editingTask = null;
        this.editingRisk = null;
        this.editingIncident = null;

        // Initialize domains and requirements (to be populated by domain modules)
        this.domains = [];
        this.requirements = {};
        this.essentialEightControls = [];
        this.tagDefinitions = {};
        this.activeTagFilters = new Set();
    }

    // ==================== Notification System ====================

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

    // ==================== Modal Management ====================

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

    // ==================== Storage Management ====================

    saveData() {
        if (!this.storageAvailable) {
            return;
        }
        localStorage.setItem('pspf_projects', JSON.stringify(this.projects));
        localStorage.setItem('pspf_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('pspf_risks', JSON.stringify(this.risks));
        localStorage.setItem('pspf_incidents', JSON.stringify(this.incidents));
        localStorage.setItem('pspf_compliance', JSON.stringify(this.compliance));
        localStorage.setItem('pspf_last_modified', new Date().toISOString());
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

    cloneFallback(value) {
        if (Array.isArray(value)) {
            return [...value];
        }
        if (value && typeof value === 'object') {
            return { ...value };
        }
        return value;
    }

    saveRequirements() {
        if (!this.storageAvailable) {
            return;
        }
        localStorage.setItem('pspf_requirements', JSON.stringify(this.requirements));
    }

    saveTagDefinitions() {
        if (!this.storageAvailable) {
            return;
        }
        localStorage.setItem('pspf_tag_definitions', JSON.stringify(this.tagDefinitions));
    }

    // ==================== Utility Methods ====================

    getStatusText(status) {
        switch(status) {
            case 'yes': return 'Met';
            case 'no': return 'Not Met';
            case 'partial': return 'Risk Managed';
            case 'na': return 'N/A';
            default: return 'Not Set';
        }
    }

    generateUUID() {
        return 'req_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
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

    getRiskSeverityIcon(severity) {
        const icons = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        };
        return icons[severity] || '⚪';
    }

    // ==================== Domain Health Calculation ====================

    calculateDomainHealth(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return { status: 'critical', met: 0, total: 0, text: 'Unknown' };

        const requirements = domain.requirements;
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

    getCompletedRequirementsCount() {
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

    // ==================== Project Utilities ====================

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

    // ==================== Tag Utilities ====================

    countTagUsage(tagKey) {
        let count = 0;
        Object.values(this.requirements).forEach(req => {
            if (req.tags && req.tags.includes(tagKey)) {
                count++;
            }
        });
        return count;
    }

    // ==================== Animation Utilities ====================

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
        const offset = circumference - (percentage / 100) * circumference;
        
        circle.style.strokeDashoffset = offset;
        text.textContent = percentage + '%';
        
        // Color based on percentage
        if (percentage >= 80) {
            circle.style.stroke = 'var(--success-color)';
        } else if (percentage >= 60) {
            circle.style.stroke = 'var(--warning-color)';
        } else {
            circle.style.stroke = 'var(--danger-color)';
        }
    }

    updateMiniChart(chartId, percentage) {
        const chart = document.getElementById(chartId);
        if (!chart) return;
        
        setTimeout(() => {
            chart.style.width = percentage + '%';
        }, 300);
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
}
