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

            this.domains = [
                {
                    id: 'governance',
                    title: 'Governance',
                    description: 'Security governance, accountability, and leadership roles including Chief Security Officer (CSO) and Chief Information Security Officer (CISO) appointments.',
                    requirements: ['GOV-001', 'GOV-002', 'GOV-003', 'GOV-004', 'GOV-005', 'GOV-006', 'GOV-007', 'GOV-008', 'GOV-009', 'GOV-010', 'GOV-011', 'GOV-012', 'GOV-013', 'GOV-014', 'GOV-015', 'GOV-016', 'GOV-017', 'GOV-018', 'GOV-019', 'GOV-020', 'GOV-021', 'GOV-022', 'GOV-023', 'GOV-024', 'GOV-025', 'GOV-026', 'GOV-027', 'GOV-028', 'GOV-029', 'GOV-030', 'GOV-031', 'GOV-032', 'GOV-033', 'GOV-034', 'GOV-035']
                },
                {
                    id: 'risk',
                    title: 'Risk Management',
                    description: 'Security risk management aligned with enterprise risk, including third-party, supply chain, and foreign interference risk management.',
                    requirements: ['RISK-036', 'RISK-037', 'RISK-038', 'RISK-039', 'RISK-040', 'RISK-041', 'RISK-042', 'RISK-043', 'RISK-044', 'RISK-045', 'RISK-046', 'RISK-047', 'RISK-048', 'RISK-049', 'RISK-050', 'RISK-051', 'RISK-052', 'RISK-053', 'RISK-054', 'RISK-055', 'RISK-056', 'RISK-057']
                },
                {
                    id: 'information',
                    title: 'Information Security',
                    description: 'Protective markings, classifications (OFFICIAL, PROTECTED, SECRET, TOP SECRET), need-to-know principle and secure handling requirements.',
                    requirements: ['INFO-058', 'INFO-059', 'INFO-060', 'INFO-061', 'INFO-062', 'INFO-063', 'INFO-064', 'INFO-065', 'INFO-066', 'INFO-067', 'INFO-068', 'INFO-069', 'INFO-070', 'INFO-071', 'INFO-072', 'INFO-073', 'INFO-074', 'INFO-075', 'INFO-076', 'INFO-077', 'INFO-078', 'INFO-079', 'INFO-080', 'INFO-081', 'INFO-082', 'INFO-083', 'INFO-211']
                },
                {
                    id: 'technology',
                    title: 'Technology Security',
                    description: 'Cybersecurity strategy with zero trust culture, AI/quantum technology policies, Essential Eight mitigation strategies, and cloud security requirements.',
                    requirements: ['TECH-084', 'TECH-085', 'TECH-086', 'TECH-087', 'TECH-088', 'TECH-089', 'TECH-090', 'TECH-091', 'TECH-092', 'TECH-093', 'TECH-094', 'TECH-095', 'TECH-096', 'TECH-097', 'TECH-098', 'TECH-099', 'TECH-100', 'TECH-101', 'TECH-102', 'TECH-103', 'TECH-104', 'TECH-105', 'TECH-106', 'TECH-107', 'TECH-108', 'TECH-109', 'TECH-110', 'TECH-111', 'TECH-112', 'TECH-113', 'TECH-114', 'TECH-115', 'TECH-212', 'TECH-213', 'TECH-214', 'TECH-215', 'TECH-216', 'TECH-217']
                },
                {
                    id: 'personnel',
                    title: 'Personnel Security',
                    description: 'Pre-employment screening, security clearance processes, conditional clearance management, and eligibility waiver protocols.',
                    requirements: ['PERS-116', 'PERS-117', 'PERS-118', 'PERS-119', 'PERS-120', 'PERS-121', 'PERS-122', 'PERS-123', 'PERS-124', 'PERS-125', 'PERS-126', 'PERS-127', 'PERS-128', 'PERS-129', 'PERS-130', 'PERS-131', 'PERS-132', 'PERS-133', 'PERS-134', 'PERS-135', 'PERS-136', 'PERS-137', 'PERS-138', 'PERS-139', 'PERS-140', 'PERS-141', 'PERS-142', 'PERS-143', 'PERS-144', 'PERS-145', 'PERS-146', 'PERS-147', 'PERS-148', 'PERS-149', 'PERS-150', 'PERS-151', 'PERS-152', 'PERS-153', 'PERS-154', 'PERS-155', 'PERS-156', 'PERS-157', 'PERS-158', 'PERS-159', 'PERS-160', 'PERS-161', 'PERS-162', 'PERS-163', 'PERS-164', 'PERS-165', 'PERS-166', 'PERS-167', 'PERS-168', 'PERS-169', 'PERS-170', 'PERS-171', 'PERS-172', 'PERS-173', 'PERS-174', 'PERS-175', 'PERS-176', 'PERS-177', 'PERS-178', 'PERS-179', 'PERS-180', 'PERS-181', 'PERS-182', 'PERS-183', 'PERS-184', 'PERS-185', 'PERS-186', 'PERS-187', 'PERS-188', 'PERS-218']
                },
                {
                    id: 'physical',
                    title: 'Physical Security',
                    description: 'Security planning for facilities, certification and accreditation of physical assets, access controls, and technical surveillance measures.',
                    requirements: ['PHYS-189', 'PHYS-190', 'PHYS-191', 'PHYS-192', 'PHYS-193', 'PHYS-194', 'PHYS-195', 'PHYS-196', 'PHYS-197', 'PHYS-198', 'PHYS-199', 'PHYS-200', 'PHYS-201', 'PHYS-202', 'PHYS-203', 'PHYS-204', 'PHYS-205', 'PHYS-206', 'PHYS-207', 'PHYS-208', 'PHYS-209', 'PHYS-210']
                }
            ];

            this.requirements = {
                'GOV-001': { id: 'GOV-001', domainId: 'governance', title: 'The Department of State supports portfolio entities to achieve and maintain a...', description: 'The Department of State supports portfolio entities to achieve and maintain an acceptable level of protective security through advice and guidance on government security. (01. WoAG Protective Security Roles)', tags: [] },
                'GOV-002': { id: 'GOV-002', domainId: 'governance', title: 'The Accountable Authority complies with all Protective Security Directions.', description: 'The Accountable Authority complies with all Protective Security Directions. (01. WoAG Protective Security Roles)', tags: [] },
                'GOV-003': { id: 'GOV-003', domainId: 'governance', title: 'The Technical Authority Entity provides technical advice and guidance to supp...', description: 'The Technical Authority Entity provides technical advice and guidance to support entities to achieve and maintain an acceptable level of protective security. (01. WoAG Protective Security Roles)', tags: [] },
                'GOV-004': { id: 'GOV-004', domainId: 'governance', title: 'The Shared Service Provider Entity supplies security services that help relev...', description: 'The Shared Service Provider Entity supplies security services that help relevant entities achieve and maintain an acceptable level of security. (01. WoAG Protective Security Roles)' },
                'GOV-005': { id: 'GOV-005', domainId: 'governance', title: 'The Shared Service Provider Entity develops, implements and maintains documen...', description: 'The Shared Service Provider Entity develops, implements and maintains documented responsibilities and accountabilities for partnerships or security service arrangements with other entities. (01. WoAG Protective Security Roles)' },
                'GOV-006': { id: 'GOV-006', domainId: 'governance', title: 'The Accountable Authority is answerable to their minister for the entity\'s pr...', description: 'The Accountable Authority is answerable to their minister for the entity\'s protective security. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-007': { id: 'GOV-007', domainId: 'governance', title: 'The Accountable Authority is responsible for managing the security risks of t...', description: 'The Accountable Authority is responsible for managing the security risks of their entity. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-008': { id: 'GOV-008', domainId: 'governance', title: 'A Chief Security Officer is appointed and empowered to oversee the entity...', description: 'A Chief Security Officer is appointed and empowered to oversee the entity protective security arrangements. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-009': { id: 'GOV-009', domainId: 'governance', title: 'The Chief Security Officer has appropriate capability and experience...', description: 'The Chief Security Officer has appropriate capability and experience commensurate with the entity s risk environment and holds a minimum security clearance of Baseline. (02. Entity Protective Security Roles and Responsibilities)', tags: [] },
                'GOV-010': { id: 'GOV-010', domainId: 'governance', title: 'The Chief Security Officer is accountable to the Accountable Authority for pr...', description: 'The Chief Security Officer is accountable to the Accountable Authority for protective security matters. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-011': { id: 'GOV-011', domainId: 'governance', title: 'A Chief Information Security Officer is appointed to oversee the entity...', description: 'A Chief Information Security Officer is appointed to oversee the entity cyber security program and the cyber security for the entity most critical technology resources. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-012': { id: 'GOV-012', domainId: 'governance', title: 'The Chief Information Security Officer has the appropriate capability and exp...', description: 'The Chief Information Security Officer has the appropriate capability and experience and holds a minimum security clearance of Negative Vetting 1. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-013': { id: 'GOV-013', domainId: 'governance', title: 'The Chief Information Security Officer is accountable to the Accountable Authority...', description: 'The Chief Information Security Officer is accountable to the Accountable Authority for cyber security risks and how the entity cyber security program is managing these risks. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-014': { id: 'GOV-014', domainId: 'governance', title: 'Where appointed, security practitioners are appropriately skilled, empowered ...', description: 'Where appointed, security practitioners are appropriately skilled, empowered and resourced to perform their designated functions. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-015': { id: 'GOV-015', domainId: 'governance', title: 'Where appointed, security practitioners have access to training across govern...', description: 'Where appointed, security practitioners have access to training across government to maintain and upskill on new and emerging security issues. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-016': { id: 'GOV-016', domainId: 'governance', title: 'The Accountable Authority approves security governance arrangements that are ...', description: 'The Accountable Authority approves security governance arrangements that are tailored to the entitys size, complexity and risk environment. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-017': { id: 'GOV-017', domainId: 'governance', title: 'A dedicated security email address is established and monitored as the centra...', description: 'A dedicated security email address is established and monitored as the central conduit for distribution of protective security-related information across the entity. (02. Entity Protective Security Roles and Responsibilities)' },
                'GOV-018': { id: 'GOV-018', domainId: 'governance', title: 'A security plan is developed, implemented and maintained to address the manda...', description: 'A security plan is developed, implemented and maintained to address the mandatory elements of the plan. (03. Security Planning, Incidents and Training)' },
                'GOV-019': { id: 'GOV-019', domainId: 'governance', title: 'The Accountable Authority approves the entity\'s security plan.', description: 'The Accountable Authority approves the entity\'s security plan. (03. Security Planning, Incidents and Training)' },
                'GOV-020': { id: 'GOV-020', domainId: 'governance', title: 'The security plan is considered annually and reviewed at least every two year...', description: 'The security plan is considered annually and reviewed at least every two years to confirm its adequacy and ability to adapt to shifts in the entity\'s risk, threat or operating environment. (03. Security Planning, Incidents and Training)' },
                'GOV-021': { id: 'GOV-021', domainId: 'governance', title: 'Procedures are developed, implemented and maintained to ensure all elements o...', description: 'Procedures are developed, implemented and maintained to ensure all elements of the entity\'s security plan are achieved. (03. Security Planning, Incidents and Training)' },
                'GOV-022': { id: 'GOV-022', domainId: 'governance', title: 'Develop, establish and implement security monitoring arrangements to identify...', description: 'Develop, establish and implement security monitoring arrangements to identify the effectiveness of the entity\'s security plan and establish a continuous cycle of improvement. (03. Security Planning, Incidents and Training)' },
                'GOV-023': { id: 'GOV-023', domainId: 'governance', title: 'The Accountable Authority and Chief Security Officer develop, implement and m...', description: 'The Accountable Authority and Chief Security Officer develop, implement and maintain a program to foster a positive security culture in the entity and support the secure delivery of government business. (03. Security Planning, Incidents and Training)' },
                'GOV-024': { id: 'GOV-024', domainId: 'governance', title: 'Security awareness training is provided to personnel, including contractors, ...', description: 'Security awareness training is provided to personnel, including contractors, at engagement and annually thereafter. (03. Security Planning, Incidents and Training)' },
                'GOV-025': { id: 'GOV-025', domainId: 'governance', title: 'Targeted security training is provided to personnel, including contractors, i...', description: 'Targeted security training is provided to personnel, including contractors, in specialist or high-risk positions. (03. Security Planning, Incidents and Training)' },
                'GOV-026': { id: 'GOV-026', domainId: 'governance', title: 'Procedures are developed, implemented and maintained to ensure security incid...', description: 'Procedures are developed, implemented and maintained to ensure security incidents are responded to and managed. (03. Security Planning, Incidents and Training)' },
                'GOV-027': { id: 'GOV-027', domainId: 'governance', title: 'Security incident management and response plans are incorporated into the ent...', description: 'Security incident management and response plans are incorporated into the entity\'s business continuity arrangements. (03. Security Planning, Incidents and Training)' },
                'GOV-028': { id: 'GOV-028', domainId: 'governance', title: 'Significant or externally reportable security incidents and referral obligati...', description: 'Significant or externally reportable security incidents and referral obligations are reported to the relevant authority (or authorities) within the applicable timeframe. (03. Security Planning, Incidents and Training)' },
                'GOV-029': { id: 'GOV-029', domainId: 'governance', title: 'Procedures are developed, implemented and maintained to investigate security ...', description: 'Procedures are developed, implemented and maintained to investigate security incidents in accordance with the principles of the Australian Government Investigations Standards. (03. Security Planning, Incidents and Training)' },
                'GOV-030': { id: 'GOV-030', domainId: 'governance', title: 'The principles of procedural fairness are applied to all security investigati...', description: 'The principles of procedural fairness are applied to all security investigations, with due regard to national security considerations (03. Security Planning, Incidents and Training)' },
                'GOV-031': { id: 'GOV-031', domainId: 'governance', title: 'The annual protective security report is provided to the entity\'s Minister.', description: 'The annual protective security report is provided to the entity\'s Minister. (04. Protective Security Reporting)' },
                'GOV-032': { id: 'GOV-032', domainId: 'governance', title: 'The annual protective security report is submitted to the Department of Home ...', description: 'The annual protective security report is submitted to the Department of Home Affairs. (04. Protective Security Reporting)' },
                'GOV-033': { id: 'GOV-033', domainId: 'governance', title: 'The Accountable Authority approves the entity\'s annual protective security re...', description: 'The Accountable Authority approves the entity\'s annual protective security report and confirms that they have verified the report\'s content. (04. Protective Security Reporting)' },
                'GOV-034': { id: 'GOV-034', domainId: 'governance', title: 'Entities cooperate with the Department of Home Affairs assurance activities ...', description: 'Entities cooperate with the Department of Home Affairs assurance activities to review annual protective security reports. (04. Protective Security Reporting)' },
                'GOV-035': { id: 'GOV-035', domainId: 'governance', title: 'The annual Cyber Security Survey is submitted to the Australian Signals Direc...', description: 'The annual Cyber Security Survey is submitted to the Australian Signals Directorate. (04. Protective Security Reporting)' },
                'RISK-036': { id: 'RISK-036', domainId: 'risk', title: 'The Accountable Authority determines their entity\'s tolerance for security ri...', description: 'The Accountable Authority determines their entity\'s tolerance for security risks and documents in the security plan. (05. Security Risk Management)' },
                'RISK-037': { id: 'RISK-037', domainId: 'risk', title: 'A risk steward (or manager) is identified for each security risk or category ...', description: 'A risk steward (or manager) is identified for each security risk or category of security risk, including shared risks. (05. Security Risk Management)' },
                'RISK-038': { id: 'RISK-038', domainId: 'risk', title: 'The Accountable Authority considers the impact that their security risk manag...', description: 'The Accountable Authority considers the impact that their security risk management decisions could potentially have on other entities, and shares information on risks where appropriate. (05. Security Risk Management)' },
                'RISK-039': { id: 'RISK-039', domainId: 'risk', title: 'The entity is accountable for the management of security risks arising from p...', description: 'The entity is accountable for the management of security risks arising from procuring goods and services and ensures procurement and contract decisions do not expose the entity or the Australian Government to an unacceptable level of risk. (06. Third Party Risk Management)' },
                'RISK-040': { id: 'RISK-040', domainId: 'risk', title: 'Procurement, contracts and third-party outsourced arrangements contain propor...', description: 'Procurement, contracts and third-party outsourced arrangements contain proportionate security terms and conditions to ensure service providers, contractors and subcontractors comply with relevant PSPF Requirements and avoid exposing the entity or the Australian Government to an unacceptable level of risk. (06. Third Party Risk Management)' },
                'RISK-041': { id: 'RISK-041', domainId: 'risk', title: 'Entity ensures service providers, contractors and subcontractors comply with ...', description: 'Entity ensures service providers, contractors and subcontractors comply with relevant PSPF Requirements as detailed by the entity. (06. Third Party Risk Management)' },
                'RISK-042': { id: 'RISK-042', domainId: 'risk', title: 'Contractual security terms and conditions require service providers to report...', description: 'Contractual security terms and conditions require service providers to report any actual or suspected security incidents to the entity, and follow reasonable direction from the entity arising from incident investigations. (06. Third Party Risk Management)' },
                'RISK-043': { id: 'RISK-043', domainId: 'risk', title: 'Government entities providing outsourced services provide IRAP assessment rep...', description: 'Government entities providing outsourced services provide IRAP assessment reports to the government entities consuming, or looking to consume, their services. (06. Third Party Risk Management)' },
                'RISK-044': { id: 'RISK-044', domainId: 'risk', title: 'Contract security terms and conditions are monitored and reviewed to ensure t...', description: 'Contract security terms and conditions are monitored and reviewed to ensure the specified security controls, terms and conditions are implemented, operated and maintained by the contracted provider, including any subcontractors, over the life of a contract. (06. Third Party Risk Management)' },
                'RISK-045': { id: 'RISK-045', domainId: 'risk', title: 'Contractual terms and conditions include appropriate security arrangements fo...', description: 'Contractual terms and conditions include appropriate security arrangements for the completion or termination of the contract. (06. Third Party Risk Management)' },
                'RISK-046': { id: 'RISK-046', domainId: 'risk', title: 'Procurement and contract decisions consider the security risks before engagin...', description: 'Procurement and contract decisions consider the security risks before engaging providers operating under foreign ownership, control or influence, and in response to any developments during the contract period that may give rise to foreign ownership, control or influence risks. (06. Third Party Risk Management)' },
                'RISK-047': { id: 'RISK-047', domainId: 'risk', title: 'Security risks arising from contractual arrangements for the provision of goo...', description: 'Security risks arising from contractual arrangements for the provision of goods and services are managed, reassessed and adjusted over the life of a contract. (06. Third Party Risk Management)' },
                'RISK-048': { id: 'RISK-048', domainId: 'risk', title: 'Secure and verifiable third-party vendors, providers, partners and associated...', description: 'Secure and verifiable third-party vendors, providers, partners and associated services are used unless business operations require use, and the residual risks are managed and approved by the Chief Information Security Officer (06. Third Party Risk Management)' },
                'RISK-049': { id: 'RISK-049', domainId: 'risk', title: 'Entities manage the security risks associated with engaging with foreign part...', description: 'Entities manage the security risks associated with engaging with foreign partners. (07. Countering Foreign Interference and Espionage)' },
                'RISK-050': { id: 'RISK-050', domainId: 'risk', title: 'Personnel do not publicise their security clearance level on social media pla...', description: 'Personnel do not publicise their security clearance level on social media platforms, including employment-focused platforms such as LinkedIn. (07. Countering Foreign Interference and Espionage)' },
                'RISK-051': { id: 'RISK-051', domainId: 'risk', title: 'Insider Threat program...', description: 'An insider threat program is implemented by entities that manage Baseline to Positive Vetting security clearance subjects, to manage the risk of insider threat in the entity.' },
                'RISK-052': { id: 'RISK-052', domainId: 'risk', title: 'Exceptional circumstances and risk tolerance...', description: 'Where exceptional circumstances prevent or affect an entity\’s capability to implement a PSPF requirement or standard, the Accountable Authority may vary application, for a limited period of time, consistent with the entity\’s risk tolerance.' },
                'RISK-053': { id: 'RISK-053', domainId: 'risk', title: 'Exceptional circumstance decisions are recorded in the plan...', description: 'Decisions to vary implementation of a PSPF requirement or standard due to exceptional circumstances are documented in the entity s security plan.' },
                'RISK-054': { id: 'RISK-054', domainId: 'risk', title: 'Alternative mitigations are reviewed annually', description: 'Decisions to implement an alternative mitigation measure that meets or exceeds a PSPF requirement or standard are reviewed and reported annually.' },
                'RISK-055': { id: 'RISK-055', domainId: 'risk', title: 'Business Continuity Plan is developed...', description: 'A business continuity plan is developed, implemented and maintained to respond effectively and minimise the impacts of significant business disruptions to the entity’s critical services and assets, and other services and assets when warranted by a threat and security risk assessment.' },
                'RISK-056': { id: 'RISK-056', domainId: 'risk', title: 'Emergency planning is in BCP...', description: 'Plans for managing a broad range of emergencies are integrated within the business continuity plan.' },
                'RISK-057': { id: 'RISK-057', domainId: 'risk', title: 'Emergency notifications...', description: 'Personnel who are likely to be impacted are notified if there is a heightened risk of an emergency.' },


                // Information Domain - Requirements 58-83
                'INFO-058': { id: 'INFO-058', domainId: 'information', title: 'Originator approval for sanitisation, reclassification and declassification', description: 'The originator remains responsible for controlling the sanitisation, reclassification or declassification of official and security classified information, and approves any changes to the information’s security classification.' },
                'INFO-059': { id: 'INFO-059', domainId: 'information', title: 'Originator assessment of information value, importance and sensitivity', description: 'The value, importance or sensitivity of official information (intended for use as an official record) is assessed by the originator by considering the potential damage to the government, the national interest, organisations or individuals that would arise if the information’s confidentiality were compromised.' },
                'INFO-060': { id: 'INFO-060', domainId: 'information', title: 'Classify at the lowest reasonable level', description: 'The security classification is set at the lowest reasonable level.' },
                'INFO-061': { id: 'INFO-061', domainId: 'information', title: 'Apply text-based classification and caveat markings', description: 'Security classified information is clearly marked with the applicable security classification, and when relevant, security caveat, by using text-based markings, unless impractical for operational reasons.' },
                'INFO-062': { id: 'INFO-062', domainId: 'information', title: 'Apply minimum protections and handling for OFFICIAL and classified info', description: 'The minimum protections and handling requirements are applied to protect OFFICIAL and security classified information.' },
                'INFO-063': { id: 'INFO-063', domainId: 'information', title: 'Apply Security Caveat Standard and controlling authority handling', description: 'The Australian Government Security Caveat Standard and special handling requirements imposed by the controlling authority are applied to protect security caveated information.' },
                'INFO-064': { id: 'INFO-064', domainId: 'information', title: 'Mark security caveats as text with a classification', description: 'Security caveats are clearly marked as text and only appear in conjunction with a security classification.' },
                'INFO-065': { id: 'INFO-065', domainId: 'information', title: 'Number pages and references for accountable material', description: 'Accountable material has page and reference numbering.' },
                'INFO-066': { id: 'INFO-066', domainId: 'information', title: 'Handle accountable material per Caveat Standard and originator rules', description: 'Accountable material is handled in accordance with any special handling requirements imposed by the originator and security caveat owner detailed in the Australian Government Security Caveat Standard.' },
                'INFO-067': { id: 'INFO-067', domainId: 'information', title: 'Apply Email Protective Marking Standard for OFFICIAL/classified email', description: 'The Australian Government Email Protective Marking Standard is applied to protect OFFICIAL and security classified information exchanged by email in and between Australian Government entities, including other authorised parties.' },
                'INFO-068': { id: 'INFO-068', domainId: 'information', title: 'Use Recordkeeping Metadata Security Classification/Caveat in systems', description: 'The Australian Government Recordkeeping Metadata Standard’s Security Classification property (and where relevant, the Security Caveat property) is applied to protectively mark information on technology systems that store, process or communicate security classified information.' },
                'INFO-069': { id: 'INFO-069', domainId: 'information', title: 'Use Recordkeeping Metadata “Rights” for access restrictions', description: 'Apply the Australian Government Recordkeeping Metadata Standard’s ‘Rights’ property where the entity wishes to categorise information content by the type of restrictions on access.' },
                'INFO-070': { id: 'INFO-070', domainId: 'information', title: 'Conduct classified discussions only in approved locations', description: 'Security classified discussions and dissemination of security classified information are only conducted in approved locations.' },
                'INFO-071': { id: 'INFO-071', domainId: 'information', title: 'Implement proportional operational controls for information holdings', description: 'Entity implements operational controls for its information holdings that are proportional to their value, importance and sensitivity.' },
                'INFO-072': { id: 'INFO-072', domainId: 'information', title: 'Maintain auditable register for TOP SECRET and accountable material', description: 'An auditable register is maintained for TOP SECRET information and accountable material.' },
                'INFO-073': { id: 'INFO-073', domainId: 'information', title: 'Secure disposal per ISM, Records Authorities, NAP and Archives Act', description: 'OFFICIAL and security classified information is disposed of securely in accordance with the Minimum Protections and Handling Requirements, Information Security Manual, the Records Authorities, a Normal Administrative Practice and the Archives Act 1983.' },
                'INFO-074': { id: 'INFO-074', domainId: 'information', title: 'Destroy classified information when retention periods expire', description: 'Security classified information is appropriately destroyed in accordance with the Minimum Protections and Handling Requirements when it has passed the minimum retention requirements or reaches authorised destruction dates.' },
                'INFO-075': { id: 'INFO-075', domainId: 'information', title: 'Share externally only with clearance, need‑to‑know and transfer controls', description: 'Access to security classified information or resources is only provided to people outside the entity with the appropriate security clearance (where required) and a need-to-know, and is transferred in accordance with the Minimum Protections and Handling Requirements' },
                'INFO-076': { id: 'INFO-076', domainId: 'information', title: 'Apply Commonwealth–State–Territory MoU when sharing with jurisdictions', description: 'The Memorandum of Understanding between the Commonwealth, States and Territories is applied when sharing information with state and territory government agencies.' },
                'INFO-077': { id: 'INFO-077', domainId: 'information', title: 'Agree handling terms before sharing outside government (OFFICIAL: Sensitive exception)', description: 'An agreement or arrangement, such as a contract or deed, that establishes handling requirements and protections, is in place before security classified information or resources are disclosed or shared with a person or organisation outside of government, unless the entity is returning or responding to information provided by a person or organisation outside of government, or their authorised representative, which the government entity subsequently classified as OFFICIAL: Sensitive.' },
                'INFO-078': { id: 'INFO-078', domainId: 'information', title: 'Meet security provisions in applicable international instruments', description: 'Provisions are met concerning the security of people, information and resources contained in international agreements and arrangements to which Australia is a party.' },
                'INFO-079': { id: 'INFO-079', domainId: 'information', title: 'Share with foreign entities only under law or international agreement', description: 'Australian Government security classified information or resources shared with a foreign entity is protected by an explicit legislative provision, international agreement or international arrangement.' },
                'INFO-080': { id: 'INFO-080', domainId: 'information', title: 'Do not share AUSTEO with non‑citizens unless exempted', description: 'Australian Government security classified information or resources bearing the Australian Eyes Only (AUSTEO) caveat is never shared with a person who is not an Australian citizen, even when an international agreement or international arrangement is in place, unless an exemption is granted.' },
                'INFO-081': { id: 'INFO-081', domainId: 'information', title: 'Limit AGAO sharing to citizens or specified agency personnel', description: 'Australian Government security classified information or resources bearing the Australian Government Access Only (AGAO) caveat is not shared with a person who is not an Australia citizen, even when an international agreement or international arrangement is in place, unless they are working for, or seconded to, an entity that is a member of National Intelligence Community, the Department of Defence or the Australian Submarine Agency.' },
                'INFO-082': { id: 'INFO-082', domainId: 'information', title: 'Safeguard foreign classified info per international agreement', description: 'Where an international agreement or international arrangement is in place, security classified foreign entity information or resources are safeguarded in accordance with the provisions set out in the agreement or arrangement.' },
                'INFO-083': { id: 'INFO-083', domainId: 'information', title: 'Share with foreign non‑government only under law or agreement', description: 'Australian Government security classified information or resources shared with a foreign non-government stakeholder is protected by an explicit legislative provision, international agreement or international arrangement.' },

                // Information Domain - New Requirement 211
                'INFO-211': { id: 'INFO-211', domainId: 'information', title: 'Maintain technology asset stocktake and security risk management plan', description: 'A Technology Asset Stocktake and Technology Security Risk Management Plan is created to identify and manage the entity s internet-facing systems or services is maintained to ensure continuous visibility and monitoring of the entity’s resource and technology estate.' },

                // Technology Domain - Requirements 84-108
                'TECH-084': { id: 'TECH-084', domainId: 'technology', title: 'Cyber security throughout technology lifecycle', description: 'Apply comprehensive cyber security principles throughout the entire technology asset lifecycle from procurement to disposal.' },
                'TECH-085': { id: 'TECH-085', domainId: 'technology', title: 'ASD ISM controls and guidelines', description: 'Apply Australian Signals Directorate Information Security Manual (ISM) controls and guidelines on a risk-based approach to ensure appropriate security.' },
                'TECH-086': { id: 'TECH-086', domainId: 'technology', title: 'Authorise systems to operate based on residual risk acceptance', description: 'The Authorising Officer authorises each technology system to operate based on the acceptance of the residual security risks associated with its operation before that system processes, stores or communicates government information or data.' },
                'TECH-087': { id: 'TECH-087', domainId: 'technology', title: 'Authorisation decisions follow ISM risk-based approach', description: 'Decisions to authorise (or reauthorise) a new technology system or make changes to an existing technology system are based on the Information Security Manual s risk-based approach to cyber security.' },
                'TECH-088': { id: 'TECH-088', domainId: 'technology', title: 'Authorise systems to highest data classification', description: 'The technology system is authorised to the highest security classification of the information and data it will process, store or communicate.' },
                'TECH-089': { id: 'TECH-089', domainId: 'technology', title: 'Maintain register of authorised technology systems', description: 'A register of the entity’s authorised technology systems is developed, implemented and maintained, and includes the name and position of the Authorising Officer, system owner, date of authorisation, and any decisions to accept residual security risks.' },
                'TECH-090': { id: 'TECH-090', domainId: 'technology', title: 'Reassess authorisation after significant changes', description: 'Each technology system s suitability to be authorised to operate is reassessed when it undergoes significant functionality or architectural change, or where the system s security environment has changed considerably.' },
                'TECH-091': { id: 'TECH-091', domainId: 'technology', title: 'Block TikTok on government devices', description: 'The TikTok application is prevented from being installed, and existing instances are removed, on government devices, unless a legitimate business reason exists which necessitates the installation or ongoing presence of the application.' },
                'TECH-092': { id: 'TECH-092', domainId: 'technology', title: 'The CSO or CISO approves any legitimate business reason for the use of the TikTok', description: 'The Chief Security Officer or Chief Information Security Officer approves any legitimate business reason for the use of the TikTok ' },
                'TECH-093': { id: 'TECH-093', domainId: 'technology', title: 'Apply temporary mitigations for legacy IT', description: 'The Australian Signals Directorate’s temporary mitigations for legacy IT are applied to manage legacy information technology that cannot yet be replaced.' },
                'TECH-094': { id: 'TECH-094', domainId: 'technology', title: 'Store SECRET and below in appropriate security zones', description: 'Technology assets and their components, classified as SECRET or below are stored in the appropriate Security Zone based on their aggregated security classification or business impact level.' },
                'TECH-095': { id: 'TECH-095', domainId: 'technology', title: 'Store TOP SECRET in SCEC-endorsed racks in accredited Zone Five', description: 'Technology assets and their components classified as TOP SECRET are stored in suitable SCEC-endorsed racks or compartments within an accredited Security Zone Five area meeting ASIO Technical Note 5/12 – Compartments within Zone Five areas requirements.' },
                'TECH-096': { id: 'TECH-096', domainId: 'technology', title: 'Use certified and accredited outsourced facilities for catastrophic impact', description: 'Outsourced facilities that house technology assets and their components with a catastrophic business impact level are certified by ASIO-T4 physical security and accredited by ASD before they are used operationally.' },
                'TECH-097': { id: 'TECH-097', domainId: 'technology', title: 'Dispose technology assets securely per ISM', description: 'Technology assets are disposed of securely in accordance with the Information Security Manual.' },
                'TECH-098': { id: 'TECH-098', domainId: 'technology', title: 'Develop and maintain cyber security strategy and uplift plan', description: 'A cyber security strategy and uplift plan is developed, implemented and maintained to manage the entity s cyber security risks in accordance with the Information Security Manual and the Guiding Principles to Embed a Zero Trust Culture.' },
                'TECH-099': { id: 'TECH-099', domainId: 'technology', title: 'Implement patch applications to E8 Maturity Level Two', description: 'Patch applications mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-100': { id: 'TECH-100', domainId: 'technology', title: 'Implement patch operating systems to E8 Level Two', description: 'Patch operating systems mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-101': { id: 'TECH-101', domainId: 'technology', title: 'Implement multi-factor authentication to E8 Level Two', description: 'Multi-factor authentication mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-102': { id: 'TECH-102', domainId: 'technology', title: 'Restrict administrative privileges to E8 Level Two', description: 'Restrict administrative privileges mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-103': { id: 'TECH-103', domainId: 'technology', title: 'Implement application control to E8 Level Two', description: 'Application control mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-104': { id: 'TECH-104', domainId: 'technology', title: 'Restrict Microsoft Office macros to E8 Level Two', description: 'Restrict Microsoft Office macros mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-105': { id: 'TECH-105', domainId: 'technology', title: 'Implement user application hardening to E8 Level Two', description: 'User application hardening mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-106': { id: 'TECH-106', domainId: 'technology', title: 'Implement regular back-ups to E8 Level Two', description: 'Regular back-ups mitigation strategy is implemented to Maturity Level Two under ASD’s Essential Eight Maturity Model.' },
                'TECH-107': { id: 'TECH-107', domainId: 'technology', title: 'Consider remaining ASD mitigation strategies as required', description: 'The remaining mitigation strategies from the Strategies to Mitigate Cyber Security Incidents are considered and, where required, implemented to achieve an acceptable level of residual risk for their entity.' },
                'TECH-108': { id: 'TECH-108', domainId: 'technology', title: 'Use PDNS or other mechanisms to block malicious endpoints', description: 'A Protective Domain Name System service or other security mechanisms is used to prevent connections to and from known malicious endpoints.' },

                // Technology Domain - New/Updated 109–115
                'TECH-109': { id: 'TECH-109', domainId: 'technology', title: 'Use IRAP-assessed CSPs within last 24 months', description: 'Cloud Service Providers that have completed an IRAP assessment against the latest version of ASD’s Information Security Manual within the previous 24 months are used.' },
                'TECH-110': { id: 'TECH-110', domainId: 'technology', title: 'Act on IRAP recommendations using a risk-based approach', description: 'Entities consider IRAP assessment recommendations and findings, and implement on a risk-based approach.' },
                'TECH-111': { id: 'TECH-111', domainId: 'technology', title: 'Host classified/SoGS in certified CSP and Data Centre', description: 'Security classified or systems of government significance information and data is securely hosted using a Cloud Service Provider and Data Centre Provider that has been certified against the Australian Government Hosting Certification Framework.' },
                'TECH-112': { id: 'TECH-112', domainId: 'technology', title: 'Use Data Centre Facilities Supplies Panel for certified services', description: 'The Data Centre Facilities Supplies Panel is used when procuring certified data centre space and services.' },
                'TECH-113': { id: 'TECH-113', domainId: 'technology', title: 'Protect inter-connected systems by a gateway (ISM & Gateways Policy)', description: 'Internet-connected technology systems, and the data they process, store or communicate, are protected by a gateway in accordance with the Information Security Manual and the Gateways Policy.' },
                'TECH-114': { id: 'TECH-114', domainId: 'technology', title: 'Gateways or Edges that have completed an IRAP assessment within 24 months', description: 'Gateways or Secure Service Edges that have completed an IRAP assessment (or ASD assessment for TOP SECRET gateways) against the latest version of ASD\’s Information Security Manual within the previous 24 months are used.' },
                'TECH-115': { id: 'TECH-115', domainId: 'technology', title: 'A vulnerability disclosure program and supporting processes and procedures are established', description: 'A vulnerability disclosure program and supporting processes and procedures are established to receive, verify, resolve and report on vulnerabilities disclosed by both internal and external sources.' },

                // Technology Domain - New 212–217
                'TECH-212': { id: 'TECH-212', domainId: 'technology', title: 'Use approved post‑quantum crypto per ISM cryptography guidance', description: 'Approved post-quantum cryptographic encryption algorithms are used for newly procured cryptographic equipment and software in accordance with the Information Security Manual’s guidelines for cryptography.' },
                'TECH-213': { id: 'TECH-213', domainId: 'technology', title: 'CISO reports risk every Audit Committee; biannual strategy progress', description: 'The Chief Information Security Officer reports on the entity’s cyber security risk at each meeting of the Audit Committee and biannually on the progress of the cyber security strategy and uplift plan.' },
                'TECH-214': { id: 'TECH-214', domainId: 'technology', title: 'Protect classified digital infrastructure via Gateway or SSE (AGGSS)', description: 'Digital Infrastructure that processes, stores or communicates Australian Government security classified information is protected by a Gateway or Security Service Edge in accordance with the Australian Government Gateway Security Standard.' },
                'TECH-215': { id: 'TECH-215', domainId: 'technology', title: 'Participate in ASD Cyber Security Partnership; notify on risk profile change', description: 'Participate in the Australian Signals Directorate’s Cyber Security Partnership Program and notify ASD in the event of a change in the entity s risk profile.' },
                'TECH-216': { id: 'TECH-216', domainId: 'technology', title: 'Connect to ASD’s Cyber Threat Intelligence Sharing platform', description: 'Connect to the Australian Signals Directorate’s Cyber Threat Intelligence Sharing platform.' },
                'TECH-217': { id: 'TECH-217', domainId: 'technology', title: 'Protect SoGS in accordance with the SoGS Standard', description: 'Declared Systems of Government Significance are protected in accordance with the Australian Government Systems of Government Significance Standard.' },

                // Personnel Domain - Requirements 116-188 and 218 (PSPF 2025)
                'PERS-116': { id: 'PERS-116', domainId: 'personnel', title: 'The eligibility and suitability of personnel who have access to Au...', description: 'The eligibility and suitability of personnel who have access to Australian Government people and resources is ensured.' },
                'PERS-117': { id: 'PERS-117', domainId: 'personnel', title: 'The pre-employment screening identity check is conducted for all p...', description: 'The pre-employment screening identity check is conducted for all personnel, to verify identity to at least Level 3 (High) of Assurance of the National Identity Proofing Guidelines.' },
                'PERS-118': { id: 'PERS-118', domainId: 'personnel', title: 'Biographic information in identity documents is verified to ensure...', description: 'Biographic information in identity documents is verified to ensure the information matches the original record.' },
                'PERS-119': { id: 'PERS-119', domainId: 'personnel', title: 'The pre-employment screening eligibility check is conducted for al...', description: 'The pre-employment screening eligibility check is conducted for all personnel, to confirm their eligibility to work in Australia and for the Australian Government.' },
                'PERS-120': { id: 'PERS-120', domainId: 'personnel', title: 'The entity obtains assurance of each person\'s suitability to acces...', description: 'The entity obtains assurance of each person\'s suitability to access Australian Government resources, including their agreement to comply with the government\'s policies, standards, protocols and guidelines that safeguard resources from harm, during pre-employment screening.' },
                'PERS-121': { id: 'PERS-121', domainId: 'personnel', title: 'Prior to granting temporary access to security classified informat...', description: 'Prior to granting temporary access to security classified information or resources, pre-employment checks are completed, and an existing Negative Vetting 1 security clearance is confirmed prior to granting temporary access to TOP SECRET information data or resources.' },
                'PERS-122': { id: 'PERS-122', domainId: 'personnel', title: 'A risk assessment determines whether a person is granted temporary...', description: 'A risk assessment determines whether a person is granted temporary access to security classified information or resources.' },
                'PERS-123': { id: 'PERS-123', domainId: 'personnel', title: 'Temporary access to security classified information, resources and...', description: 'Temporary access to security classified information, resources and activities is supervised.' },
                'PERS-124': { id: 'PERS-124', domainId: 'personnel', title: 'Short-term temporary access to security classified information, re...', description: 'Short-term temporary access to security classified information, resources and activities is limited to the period in which an application for a security clearance is being processed for the particular person, or up to a total combined maximum of three months in a 12-month period for all entities.' },
                'PERS-125': { id: 'PERS-125', domainId: 'personnel', title: 'The Authorised Vetting Agency confirms that the completed security...', description: 'The Authorised Vetting Agency confirms that the completed security clearance pack has been received, and that no initial concerns have been identified for the clearance subject, before short-term temporary access is changed to provisional temporary access.' },
                'PERS-126': { id: 'PERS-126', domainId: 'personnel', title: 'Temporary access to classified caveated information, resources or ...', description: 'Temporary access to classified caveated information, resources or activities is not granted, other than in exceptional circumstances, and only with the approval of the caveat controlling authority.' },
                'PERS-127': { id: 'PERS-127', domainId: 'personnel', title: 'Prior to granting temporary access, the entity obtains an undertak...', description: 'Prior to granting temporary access, the entity obtains an undertaking from the person to protect the security classified information, resources and activities they will access.' },
                'PERS-128': { id: 'PERS-128', domainId: 'personnel', title: 'Prior to granting temporary access, the entity obtains agreement f...', description: 'Prior to granting temporary access, the entity obtains agreement from any other entity (or third party) whose security classified information, resources and activities will be accessed by the person during the temporary access period.' },
                'PERS-129': { id: 'PERS-129', domainId: 'personnel', title: 'Access to official information is facilitated for entity personnel...', description: 'Access to official information is facilitated for entity personnel and other relevant stakeholders.' },
                'PERS-130': { id: 'PERS-130', domainId: 'personnel', title: 'Appropriate access to official information is enabled, including c...', description: 'Appropriate access to official information is enabled, including controlling access (including remote access) to supporting technology systems, networks, infrastructure, devices and applications.' },
                'PERS-131': { id: 'PERS-131', domainId: 'personnel', title: 'Access to security classified information or resources is only giv...', description: 'Access to security classified information or resources is only given to entity personnel with a need-to-know that information.' },
                'PERS-132': { id: 'PERS-132', domainId: 'personnel', title: 'Personnel requiring ongoing access to security classified informat...', description: 'Personnel requiring ongoing access to security classified information or resources are security cleared to the appropriate level.' },
                'PERS-133': { id: 'PERS-133', domainId: 'personnel', title: 'Personnel requiring access to caveated information meet any cleara...', description: 'Personnel requiring access to caveated information meet any clearance and suitability requirements imposed by the originator and caveat controlling authority.' },
                'PERS-134': { id: 'PERS-134', domainId: 'personnel', title: 'A unique user identification, authentication and authorisation pra...', description: 'A unique user identification, authentication and authorisation practice is implemented on each occasion where system access is granted, to manage access to systems holding security classified information.' },
                'PERS-135': { id: 'PERS-135', domainId: 'personnel', title: 'A security risk assessment of the proposed location and work envir...', description: 'A security risk assessment of the proposed location and work environment informs decisions by the Chief Security Officer to allow personnel to work in another government entity\'s facilities in Australia.' },
                'PERS-136': { id: 'PERS-136', domainId: 'personnel', title: 'An agreement is in place to manage the security risks associated w...', description: 'An agreement is in place to manage the security risks associated with personnel working in another government entity\'s facilities in Australia.' },
                'PERS-137': { id: 'PERS-137', domainId: 'personnel', title: 'Approval for remote access to TOP SECRET information, data or syst...', description: 'Approval for remote access to TOP SECRET information, data or systems in international locations outside of facilities meeting PSPF requirements is only granted if approved by the Australian Signals Directorate.' },
                'PERS-138': { id: 'PERS-138', domainId: 'personnel', title: 'A security risk assessment of the proposed location and work envir...', description: 'A security risk assessment of the proposed location and work environment informs decisions to allow personnel to work remotely in international locations.' },
                'PERS-139': { id: 'PERS-139', domainId: 'personnel', title: 'Personnel are not granted approval to work remotely in locations w...', description: 'Personnel are not granted approval to work remotely in locations where Australian Government information, or resources are exposed to extrajudicial directions from a foreign government that conflict with Australian law, unless operationally required, and the residual risks are managed and approved by the Chief Security Officer.' },
                'PERS-140': { id: 'PERS-140', domainId: 'personnel', title: 'The Australian Government Security Vetting Agency (AGSVA) or the T...', description: 'The Australian Government Security Vetting Agency (AGSVA) or the TOP SECRET-Privileged Access Vetting Authority is used to conduct security vetting, or where authorised, the entity conducts security vetting in a manner consistent with the Personnel Security Vetting Process and Australian Government Personnel Security Adjudicative Standard.' },
                'PERS-141': { id: 'PERS-141', domainId: 'personnel', title: 'All vetting personnel attain and maintain the required skills and ...', description: 'All vetting personnel attain and maintain the required skills and competencies for their role.' },
                'PERS-142': { id: 'PERS-142', domainId: 'personnel', title: 'The gaining sponsoring entity establishes new clearance conditions...', description: 'The gaining sponsoring entity establishes new clearance conditions before assuming sponsorship of an existing security clearance that is subject to clearance conditions.' },
                'PERS-143': { id: 'PERS-143', domainId: 'personnel', title: 'The gaining sponsoring entity undertakes the exceptional business ...', description: 'The gaining sponsoring entity undertakes the exceptional business requirement and risk assessment provisions prior to requesting transfer of sponsorship of an existing security clearance that is subject to an eligibility waiver.' },
                'PERS-144': { id: 'PERS-144', domainId: 'personnel', title: 'The Authorised Vetting Agency only issues a security clearance whe...', description: 'The Authorised Vetting Agency only issues a security clearance where the clearance is sponsored by an Australian Government entity or otherwise authorised by the Australian Government.' },
                'PERS-145': { id: 'PERS-145', domainId: 'personnel', title: 'Positions that require a security clearance are identified and the...', description: 'Positions that require a security clearance are identified and the level of clearance required is documented.' },
                'PERS-146': { id: 'PERS-146', domainId: 'personnel', title: 'Each person working in an identified position has a valid security...', description: 'Each person working in an identified position has a valid security clearance issued by the relevant Authorised Vetting Agency.' },
                'PERS-147': { id: 'PERS-147', domainId: 'personnel', title: 'Australian citizenship is confirmed and pre-employment screening i...', description: 'Australian citizenship is confirmed and pre-employment screening is completed before the entity seeks a security clearance for a person in a position identified as requiring a security clearance.' },
                'PERS-148': { id: 'PERS-148', domainId: 'personnel', title: 'The Sponsoring Entity establishes an exceptional business need and...', description: 'The Sponsoring Entity establishes an exceptional business need and conducts a risk assessment before a citizenship eligibility waiver is considered for a non-Australian citizen who has a valid visa and work rights to work in an identified position.' },
                'PERS-149': { id: 'PERS-149', domainId: 'personnel', title: 'The Accountable Authority (or the Chief Security Officer if delega...', description: 'The Accountable Authority (or the Chief Security Officer if delegated) approves a citizenship eligibility waiver (after accepting the residual risk of waiving the citizenship requirement for that person, confirming that a checkable background eligibility waiver is not in place), and maintains a record of all citizenship eligibility waivers approved.' },
                'PERS-150': { id: 'PERS-150', domainId: 'personnel', title: 'The Sponsoring Entity establishes an exceptional business need and...', description: 'The Sponsoring Entity establishes an exceptional business need and conducts a risk assessment (including seeking advice from the Authorised Vetting Agency), before a checkable background eligibility waiver is considered for a clearance subject assessed as having an uncheckable background.' },
                'PERS-151': { id: 'PERS-151', domainId: 'personnel', title: 'The Sponsoring Entity\'s Accountable Authority (or the Chief Securi...', description: 'The Sponsoring Entity\'s Accountable Authority (or the Chief Security Officer if delegated) approves checkable background eligibility waivers (after accepting the residual risk of waiving the checkable background requirement for each person and confirming that a citizenship eligibility waiver is not in place), and maintains a record of all checkable background eligibility waivers approved.' },
                'PERS-152': { id: 'PERS-152', domainId: 'personnel', title: 'The Authorised Vetting Agency provides the Sponsoring Entity with ...', description: 'The Authorised Vetting Agency provides the Sponsoring Entity with information to inform a risk assessment if a clearance subject has an uncheckable background and only issues a clearance if the Accountable Authority waives the checkable background requirement and provides the Authorised Vetting Agency with a copy of the waiver.' },
                'PERS-153': { id: 'PERS-153', domainId: 'personnel', title: 'The clearance subject\'s informed consent is given to collect, use ...', description: 'The clearance subject\'s informed consent is given to collect, use and disclose their personal information for the purposes of assessing and managing their eligibility and suitability to hold a security clearance.' },
                'PERS-154': { id: 'PERS-154', domainId: 'personnel', title: 'The clearance subject\'s eligibility and suitability to hold a Base...', description: 'The clearance subject\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance is assessed by considering their integrity (i.e. the character traits of maturity, trustworthiness, honesty, resilience, tolerance and loyalty) in accordance with the Australian Government Personnel Security Adjudicative Standard.' },
                'PERS-155': { id: 'PERS-155', domainId: 'personnel', title: 'The clearance subject\'s eligibility and suitability to hold a TOP ...', description: 'The clearance subject\'s eligibility and suitability to hold a TOP SECRET-Privileged Access security clearance is assessed in accordance with the TOP SECRET-Privileged Access Standard.' },
                'PERS-156': { id: 'PERS-156', domainId: 'personnel', title: 'The clearance subject\'s eligibility and suitability to hold a Base...', description: 'The clearance subject\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance is assessed by conducting the minimum personnel security checks for the commensurate security clearance level.' },
                'PERS-157': { id: 'PERS-157', domainId: 'personnel', title: 'The clearance subject\'s eligibility and suitability to hold a Base...', description: 'The clearance subject\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance is assessed by resolving any doubt in the national interest.' },
                'PERS-158': { id: 'PERS-158', domainId: 'personnel', title: 'Concerns that are identified during the vetting or security cleara...', description: 'Concerns that are identified during the vetting or security clearance suitability assessment process, that are not sufficient to deny a security clearance and where the related risks can be managed through conditions attached to the security clearance, the Authorised Vetting Agency must: identify the clearance conditions, provide the sponsoring entity with information about the concerns to inform a risk assessment, only issue a conditional security clearance if the Accountable Authority and the clearance subject accept the clearance conditions.' },
                'PERS-159': { id: 'PERS-159', domainId: 'personnel', title: 'The Authorised Vetting Agency provides the sponsoring entity any r...', description: 'The Authorised Vetting Agency provides the sponsoring entity any relevant information of concern, when advising them of the outcome of the security vetting process, to inform the sponsoring entity\'s risk assessment.' },
                'PERS-160': { id: 'PERS-160', domainId: 'personnel', title: 'The Authorised Vetting Agency applies the rules of procedural fair...', description: 'The Authorised Vetting Agency applies the rules of procedural fairness to security clearance decisions that are adverse to a clearance subject, including decisions to deny a security clearance (including grant lower level) or grant a conditional security clearance, without compromising the national interest.' },
                'PERS-161': { id: 'PERS-161', domainId: 'personnel', title: 'The Authorised Vetting Agency reviews the conditions of conditiona...', description: 'The Authorised Vetting Agency reviews the conditions of conditional security clearances annually.' },
                'PERS-162': { id: 'PERS-162', domainId: 'personnel', title: 'The Authorised Vetting Agency reviews the clearance holder\'s eligi...', description: 'The Authorised Vetting Agency reviews the clearance holder\'s eligibility and suitability to hold a security clearance, where concerns are identified (review for cause).' },
                'PERS-163': { id: 'PERS-163', domainId: 'personnel', title: 'The Authorised TOP SECRET-Privileged Access Vetting Agency impleme...', description: 'The Authorised TOP SECRET-Privileged Access Vetting Agency implements the TOP SECRET-Privileged Access Standard in relation to the ongoing assessment and management of personnel with TOP SECRET-Privileged Access security clearances.' },
                'PERS-164': { id: 'PERS-164', domainId: 'personnel', title: 'The Sponsoring Entity actively assesses, monitors and manages the ...', description: 'The Sponsoring Entity actively assesses, monitors and manages the ongoing suitability of personnel.' },
                'PERS-165': { id: 'PERS-165', domainId: 'personnel', title: 'The Sponsoring Entity monitors and manages compliance with any con...', description: 'The Sponsoring Entity monitors and manages compliance with any conditional security clearance requirements and reports any non-compliance to the Authorised Vetting Agency.' },
                'PERS-166': { id: 'PERS-166', domainId: 'personnel', title: 'The Sponsoring Entity monitors and manages compliance with securit...', description: 'The Sponsoring Entity monitors and manages compliance with security clearance maintenance obligations for the clearance holders they sponsor.' },
                'PERS-167': { id: 'PERS-167', domainId: 'personnel', title: 'The Sponsoring Entity shares relevant information of concern, wher...', description: 'The Sponsoring Entity shares relevant information of concern, where appropriate.' },
                'PERS-168': { id: 'PERS-168', domainId: 'personnel', title: 'The Sponsoring Entity conducts an annual security check with all s...', description: 'The Sponsoring Entity conducts an annual security check with all security cleared personnel.' },
                'PERS-169': { id: 'PERS-169', domainId: 'personnel', title: 'The Sponsoring Entity reviews eligibility waivers at least annuall...', description: 'The Sponsoring Entity reviews eligibility waivers at least annually, before revalidation of a security clearance, and prior to any proposed position transfer.' },
                'PERS-170': { id: 'PERS-170', domainId: 'personnel', title: 'The Sponsoring Entity monitors, assesses and manages personnel wit...', description: 'The Sponsoring Entity monitors, assesses and manages personnel with TOP SECRET-Privileged access security clearances in accordance with the TOP SECRET-Privileged Access Standard.' },
                'PERS-171': { id: 'PERS-171', domainId: 'personnel', title: 'The Authorised Vetting Agency reassesses a clearance holder\'s elig...', description: 'The Authorised Vetting Agency reassesses a clearance holder\'s eligibility and suitability to hold a security clearance by revalidating minimum personnel security checks for a security clearance.' },
                'PERS-172': { id: 'PERS-172', domainId: 'personnel', title: 'The Authorised Vetting Agency reassesses a clearance holder\'s elig...', description: 'The Authorised Vetting Agency reassesses a clearance holder\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance by considering their integrity in accordance with the Australian Government Personnel Security Adjudicative Standard.' },
                'PERS-173': { id: 'PERS-173', domainId: 'personnel', title: 'The TOP SECRET-Privileged Access Vetting Authority reassesses a cl...', description: 'The TOP SECRET-Privileged Access Vetting Authority reassesses a clearance holder\'s eligibility and suitability to hold a TOP SECRET-Privileged Access security clearance by assessing their trustworthiness in accordance with the TOP SECRET-Privileged Access Standard.' },
                'PERS-174': { id: 'PERS-174', domainId: 'personnel', title: 'The Authorised Vetting Agency reassesses a clearance holder\'s elig...', description: 'The Authorised Vetting Agency reassesses a clearance holder\'s eligibility and suitability to hold a security clearance by resolving any doubt in the national interest.' },
                'PERS-175': { id: 'PERS-175', domainId: 'personnel', title: 'The Authorised Vetting Agency commences the security clearance rev...', description: 'The Authorised Vetting Agency commences the security clearance revalidation process in sufficient time to complete the revalidation before the due date so that the security clearance does not lapse.' },
                'PERS-176': { id: 'PERS-176', domainId: 'personnel', title: 'The Authorised Vetting Agency shares information of concern about ...', description: 'The Authorised Vetting Agency shares information of concern about security clearance holders with the Sponsoring Entity so they can decide whether to suspend or limit the clearance holder\'s access to Australian Government classified information, resources or activities until the concerns are resolved.' },
                'PERS-177': { id: 'PERS-177', domainId: 'personnel', title: 'The Sponsoring Entity shares relevant information of security conc...', description: 'The Sponsoring Entity shares relevant information of security concern, where appropriate with the Authorised Vetting Agency.' },
                'PERS-178': { id: 'PERS-178', domainId: 'personnel', title: 'The Authorised Vetting Agency shares information of security conce...', description: 'The Authorised Vetting Agency shares information of security concern about security clearance holders with the Sponsoring Entity.' },
                'PERS-179': { id: 'PERS-179', domainId: 'personnel', title: 'The Authorised Vetting Agency assesses and responds to information...', description: 'The Authorised Vetting Agency assesses and responds to information of security concern about security clearance holders, including reports from Sponsoring Entities.' },
                'PERS-180': { id: 'PERS-180', domainId: 'personnel', title: 'Negative Vetting 2 and higher clearance holders receive appropriat...', description: 'Negative Vetting 2 and higher clearance holders receive appropriate departmental travel briefings when undertaking international personal and work travel.' },
                'PERS-181': { id: 'PERS-181', domainId: 'personnel', title: 'The Chief Security Officer, Chief Information Security Officer (or...', description: 'The Chief Security Officer, Chief Information Security Officer (or other relevant security practitioner) is advised prior to separation or transfer of any proposed cessation of employment resulting from misconduct or other adverse reasons.' },
                'PERS-182': { id: 'PERS-182', domainId: 'personnel', title: 'Separating personnel are informed of any ongoing security obligati...', description: 'Separating personnel are informed of any ongoing security obligations under the Commonwealth Criminal Code and other relevant legislation and those holding a security clearance or access security classified information are debriefed prior to separation from the entity.' },
                'PERS-183': { id: 'PERS-183', domainId: 'personnel', title: 'Separating personnel transferring to another Australian Government...', description: 'Separating personnel transferring to another Australian Government entity, the entity, when requested, provides the receiving entity with relevant security information, including the outcome of pre-employment screening checks and any periodic employment suitability checks.' },
                'PERS-184': { id: 'PERS-184', domainId: 'personnel', title: 'Separating personnel transferring to another Australian Government...', description: 'Separating personnel transferring to another Australian Government entity, the entity reports any security concerns (as defined in the Australian Security Intelligence Organisation Act 1979) to the Australian Security Intelligence Organisation.' },
                'PERS-185': { id: 'PERS-185', domainId: 'personnel', title: 'A risk assessment is completed to identify any security implicatio...', description: 'A risk assessment is completed to identify any security implications in situations where it is not possible to undertake the required separation procedures.' },
                'PERS-186': { id: 'PERS-186', domainId: 'personnel', title: 'Separating personnel have their access to Australian Government re...', description: 'Separating personnel have their access to Australian Government resources withdrawn upon separation or transfer from the entity, including information, technology systems, and resources.' },
                'PERS-187': { id: 'PERS-187', domainId: 'personnel', title: 'The Sponsoring Entity advises the relevant Authorised Vetting Agen...', description: 'The Sponsoring Entity advises the relevant Authorised Vetting Agency of the separation of a clearance holder, including any relevant circumstances (e.g. termination for cause) and any details, if known, of another entity or contracted service provider the clearance holder is transferring to, along with any identified risks or security concerns associated with the separation.' },
                'PERS-188': { id: 'PERS-188', domainId: 'personnel', title: 'The Authorised Vetting Agency manages and records changes in the s...', description: 'The Authorised Vetting Agency manages and records changes in the security clearance status of separating personnel, including a change of Sponsoring Entity, and transfer personal security files where a clearance subject transfers to an entity covered by a different Authorised Vetting Agency, to the extent that their enabling legislation allows.' },
                'PERS-218': { id: 'PERS-218', domainId: 'personnel', title: 'The Sponsoring Entity ensures clearance subjects with an eligibili...', description: 'The Sponsoring Entity ensures clearance subjects with an eligibility waiver or where a waiver is being considered, are not given temporary or provisional access to security classified information or resources until the security vetting process is complete.' },

                // Physical Domain - Requirements 189-210 (PSPF 2025)
                'PHYS-189': { id: 'PHYS-189', domainId: 'physical', title: 'Protective security is integrated in the process of planning, sel...', description: 'Protective security is integrated in the process of planning, selecting, designing and modifying entity facilities for the protection of people, information and resources.' },
                'PHYS-190': { id: 'PHYS-190', domainId: 'physical', title: 'A facility security plan is developed for new facilities, facilit...', description: 'A facility security plan is developed for new facilities, facilities under construction or major refurbishments of existing facilities.' },
                'PHYS-191': { id: 'PHYS-191', domainId: 'physical', title: 'Decisions on entity facility locations are informed by considerin...', description: 'Decisions on entity facility locations are informed by considering the site selection factors for Australian Government facilities.' },
                'PHYS-192': { id: 'PHYS-192', domainId: 'physical', title: 'When designing or modifying facilities, the entity secures and co...', description: 'When designing or modifying facilities, the entity secures and controls access to facilities to meet the highest risk level to entity resources in accordance with Security Zone restricted access definitions.' },
                'PHYS-193': { id: 'PHYS-193', domainId: 'physical', title: 'Facilities are constructed in accordance the applicable ASIO Tech...', description: 'Facilities are constructed in accordance the applicable ASIO Technical Notes to protect against the highest risk level in accordance with the entity security risk assessment in areas: accessed by the public and authorised personnel, and where physical resources and technical assets, other than security classified resources and technology, are stored.' },
                'PHYS-194': { id: 'PHYS-194', domainId: 'physical', title: 'Facilities for Security Zones Two to Five that process, store or ...', description: 'Facilities for Security Zones Two to Five that process, store or communicate security classified information and resources are constructed in accordance with the applicable sections of ASIO Technical Note 1/15 – Physical Security Zones, and ASIO Technical Note 5/12 – Physical Security Zones (TOP SECRET) areas.' },
                'PHYS-195': { id: 'PHYS-195', domainId: 'physical', title: 'Entity facilities are operated and maintained in accordance with ...', description: 'Entity facilities are operated and maintained in accordance with Security Zones and Physical Security Measures and Controls.' },
                'PHYS-196': { id: 'PHYS-196', domainId: 'physical', title: 'Security Zones One to Four are certified by the Certification Aut...', description: 'Security Zones One to Four are certified by the Certification Authority in accordance with the PSPF and applicable ASIO Technical Notes before they are used operationally.' },
                'PHYS-197': { id: 'PHYS-197', domainId: 'physical', title: 'Security Zone Five areas that contain TOP SECRET security classif...', description: 'Security Zone Five areas that contain TOP SECRET security classified information or aggregated information where the compromise of confidentiality, loss of integrity or unavailability of that information may have a catastrophic business impact level, are certified by ASIO-T4 before they are used operationally.' },
                'PHYS-198': { id: 'PHYS-198', domainId: 'physical', title: 'Security Zones One to Five are accredited by the Accreditation Au...', description: 'Security Zones One to Five are accredited by the Accreditation Authority before they are used operationally, on the basis that the required security controls are certified and the entity determines and accepts the residual risks.' },
                'PHYS-199': { id: 'PHYS-199', domainId: 'physical', title: 'Sensitive Compartmented Information Facility areas used to secure...', description: 'Sensitive Compartmented Information Facility areas used to secure and access TOP SECRET systems and security classified compartmented information are accredited by the Australian Signals Directorate before they are used operationally.' },
                'PHYS-200': { id: 'PHYS-200', domainId: 'physical', title: 'Physical security measures are implemented to minimise or remove ...', description: 'Physical security measures are implemented to minimise or remove the risk of information and physical asset resources being made inoperable or inaccessible, or being accessed, used or removed without appropriate authorisation.' },
                'PHYS-201': { id: 'PHYS-201', domainId: 'physical', title: 'Physical security measures are implemented to protect entity reso...', description: 'Physical security measures are implemented to protect entity resources, commensurate with the assessed business impact level of their compromise, loss or damage.' },
                'PHYS-202': { id: 'PHYS-202', domainId: 'physical', title: 'Physical security measures are implemented to minimise or remove ...', description: 'Physical security measures are implemented to minimise or remove the risk of harm to people.' },
                'PHYS-203': { id: 'PHYS-203', domainId: 'physical', title: 'The appropriate container, safe, vault, cabinet, secure room or s...', description: 'The appropriate container, safe, vault, cabinet, secure room or strong rooms is used to protect entity information and resources based on the applicable Security Zone and business impact level of the compromise, loss or damage to information or physical resources.' },
                'PHYS-204': { id: 'PHYS-204', domainId: 'physical', title: 'Perimeter doors and hardware in areas that process, store or comm...', description: 'Perimeter doors and hardware in areas that process, store or communicate security classified information or resources are constructed and secured in accordance with the physical security measures and controls for perimeter doors and hardware.' },
                'PHYS-205': { id: 'PHYS-205', domainId: 'physical', title: 'Access by authorised personnel, vehicles and equipment to Securit...', description: 'Access by authorised personnel, vehicles and equipment to Security Zones One to Five is controlled in accordance with the physical security measures and controls for access control for authorised personnel.' },
                'PHYS-206': { id: 'PHYS-206', domainId: 'physical', title: 'Access by visitors to Security Zones One to Five is controlled in...', description: 'Access by visitors to Security Zones One to Five is controlled in accordance with the physical security measures and controls for access control for visitors.' },
                'PHYS-207': { id: 'PHYS-207', domainId: 'physical', title: 'The Accountable Authority or Chief Security Officer approves ongo...', description: 'The Accountable Authority or Chief Security Officer approves ongoing (or regular) access to entity facilities for people who are not directly engaged by the entity or covered by the terms of a contract or agreement, on the basis that the person: has the required security clearance level for the Security Zone/s, and a business need supported by a business case and security risk assessment, which is reassessed at least every two years.' },
                'PHYS-208': { id: 'PHYS-208', domainId: 'physical', title: 'Unauthorised access to Security Zones One to Five is controlled i...', description: 'Unauthorised access to Security Zones One to Five is controlled in accordance with the physical security measures and controls for security alarm systems.' },
                'PHYS-209': { id: 'PHYS-209', domainId: 'physical', title: 'Security guard arrangements in Security Zones One to Five are est...', description: 'Security guard arrangements in Security Zones One to Five are established in accordance with the physical security measures and controls for security guards.' },
                'PHYS-210': { id: 'PHYS-210', domainId: 'physical', title: 'Technical surveillance countermeasures for Security Zones One to ...', description: 'Technical surveillance countermeasures for Security Zones One to Five are established in accordance with the physical security measures and controls for technical surveillance countermeasures.' }
            };

            this.essentialEightControls = [
                { id: 'TECH-103', label: 'Application control' },
                { id: 'TECH-099', label: 'Patch applications' },
                { id: 'TECH-104', label: 'Configure macros' },
                { id: 'TECH-105', label: 'User application hardening' },
                { id: 'TECH-102', label: 'Restrict admin privileges' },
                { id: 'TECH-100', label: 'Patch operating systems' },
                { id: 'TECH-101', label: 'Multi-factor authentication' },
                { id: 'TECH-106', label: 'Regular backups' }
            ];
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
                    if (domainId) this.showDomainRequirements(domainId);
                    break;

                // Requirement actions
                case 'view-requirement':
                    const reqId = target.dataset.requirementId;
                    if (reqId) this.showRequirementDetails(reqId);
                    break;

                // Project actions
                case 'view-project':
                    const projectId = target.dataset.projectId;
                    if (projectId) this.showProjectDetails(projectId);
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
                
                return `
                    <div class="domain-card ${healthClass}" data-domain="${domain.id}">
                        <div class="domain-header">
                            <h3>${domain.title}</h3>
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

        updateDashboardStats() {
            const totalRequirements = this.domains.reduce((sum, domain) => sum + domain.requirements.length, 0);
            const totalProjects = this.projects.length;
            const completedRequirements = this.getCompletedRequirementsCount();
            const complianceRate = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;

            const totalReqEl = document.getElementById('totalRequirements');
            const totalDomainsEl = document.getElementById('totalDomains');
            const totalProjectsEl = document.getElementById('totalProjects');
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
            const requirement = this.requirements[requirementId];
            if (!requirement) return;
            
            // Ensure tags array exists
            if (!requirement.tags) {
                requirement.tags = [];
            }
            
            const tagIndex = requirement.tags.indexOf(tagId);
            if (tagIndex > -1) {
                requirement.tags.splice(tagIndex, 1);
            } else {
                requirement.tags.push(tagId);
            }
            
            this.saveRequirements();
            this.renderRequirementsList();
            this.showRequirementDetails(requirementId); // Refresh details view
        }

        saveRequirements() {
            if (!this.storageAvailable) {
                return;
            }
            // Save requirements to localStorage
            localStorage.setItem('pspf_requirements', JSON.stringify(this.requirements));
        }

        loadSavedRequirements() {
            // Ensure all requirements have tags array
            Object.keys(this.requirements).forEach(reqId => {
                if (!this.requirements[reqId].tags) {
                    this.requirements[reqId].tags = [];
                }
            });

            // Load saved requirements from localStorage
            if (this.storageAvailable) {
                const saved = localStorage.getItem('pspf_requirements');
                if (saved) {
                const savedRequirements = JSON.parse(saved);
                // Merge saved data with default requirements, preserving tags
                Object.keys(this.requirements).forEach(reqId => {
                    if (savedRequirements[reqId] && savedRequirements[reqId].tags) {
                        this.requirements[reqId].tags = savedRequirements[reqId].tags;
                    }
                });
                }
            }
            
            // Add some example tags for demo
            if (!this.storageAvailable || !localStorage.getItem('pspf_requirements')) {
                // Add sample tags to a few requirements for demonstration
                if (this.requirements['GOV-001']) {
                    this.requirements['GOV-001'].tags = ['high'];
                }
                if (this.requirements['GOV-002']) {
                    this.requirements['GOV-002'].tags = ['critical'];
                }
                if (this.requirements['TECH-099']) {
                    this.requirements['TECH-099'].tags = ['medium'];
                }
                if (this.requirements['INFO-058']) {
                    this.requirements['INFO-058'].tags = ['low', 'medium'];
                }
                if (this.storageAvailable) {
                    this.saveRequirements();
                }
            }
        }

        renderTagsInDetails(requirementId) {
            const requirement = this.requirements[requirementId];
            if (!requirement) return '';
            
            const tags = requirement.tags || [];
            
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
            const tags = requirement.tags || [];
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
                
                ${this.renderTagsInDetails(reqId)}
                
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
                    <h5>Compliance Status</h5>
                    <select class="compliance-select" data-req="${reqId}" onchange="window.pspfExplorer.updateCompliance('${reqId}', this.value)">
                        <option value="not-set" ${compliance.status === 'not-set' ? 'selected' : ''}>Not Set</option>
                        <option value="yes" ${compliance.status === 'yes' ? 'selected' : ''}>Yes</option>
                        <option value="no" ${compliance.status === 'no' ? 'selected' : ''}>No</option>
                        <option value="partial" ${compliance.status === 'partial' ? 'selected' : ''}>Risk Managed</option>
                        <option value="na" ${compliance.status === 'na' ? 'selected' : ''}>Not Applicable</option>
                    </select>
                    
                    <h5>Reference URL</h5>
                    <input type="url" class="compliance-url" data-req="${reqId}" 
                           placeholder="https://example.com/policy-document" 
                           value="${compliance.url || ''}" 
                           onblur="window.pspfExplorer.updateComplianceUrl('${reqId}', this.value)">
                    <small class="field-help">📎 Link to relevant documentation, policies, or evidence</small>
                    
                    <h5>Comments</h5>
                    <textarea class="compliance-comment" data-req="${reqId}" placeholder="Add implementation notes, evidence, or comments..." onblur="window.pspfExplorer.updateComplianceComment('${reqId}', this.value)">${compliance.comment}</textarea>
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
            if (!this.compliance[reqId]) {
                this.compliance[reqId] = {};
            }
            this.compliance[reqId].status = status;
            this.saveData();
            this.renderDomainsGrid();
            this.updateStats();
            
            // Update the sidebar item status
            const sidebarItem = document.querySelector(`[data-req="${reqId}"] .requirement-status`);
            if (sidebarItem) {
                sidebarItem.className = `requirement-status ${status}`;
                sidebarItem.textContent = this.getStatusText(status);
            }
        }

        updateComplianceComment(reqId, comment) {
            if (!this.compliance[reqId]) {
                this.compliance[reqId] = {};
            }
            this.compliance[reqId].comment = comment;
            this.saveData();
        }

        updateComplianceUrl(reqId, url) {
            if (!this.compliance[reqId]) {
                this.compliance[reqId] = {};
            }
            this.compliance[reqId].url = url.trim();
            this.saveData();
            
            // Refresh the requirement details to show/hide URL section
            this.showRequirementDetails(reqId);
        }

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

            const compliancePercentage = totalRequirements > 0 ? Math.round((metRequirements / totalRequirements) * 100) : 0;

            const totalProjects = this.projects.length;
            const totalTasks = this.tasks.length;
            const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
            const totalRisks = this.risks.length;
            const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Animate number updates
            this.animateNumber('totalProjects', totalProjects);
            this.animateNumber('totalTasks', totalTasks);
            this.animateNumber('completedTasks', completedTasks);
            this.animateNumber('totalRisks', totalRisks);
            
            // Update main compliance display
            document.getElementById('overallCompliance').textContent = compliancePercentage + '%';
            
            // Update progress rings
            this.updateProgressRing('taskCompletionRing', 'taskCompletionPercent', taskCompletionPercentage);
            this.updateProgressRing('complianceRing', 'compliancePercent', compliancePercentage);
            
            // Update mini charts
            this.updateMiniChart('projectsChart', Math.min(totalProjects * 10, 100));
            this.updateMiniChart('tasksChart', Math.min(totalTasks * 5, 100));
            this.updateMiniChart('risksChart', Math.min(totalRisks * 15, 100));
            
            // Update trend indicators
            this.updateTrendIndicators(totalProjects, totalTasks, completedTasks, compliancePercentage, totalRisks);

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

            searchResults.innerHTML = `
                <h3>Search Results (${results.length})</h3>
                <div class="search-results-list">
                    ${results.map(result => `
                        <div class="search-result-item">
                            <span class="result-type ${result.type.toLowerCase()}">${result.type}</span>
                            ${result.reqId ? `<span class="result-req-id">${result.reqId}</span>` : ''}
                            <h4>${result.title}</h4>
                            <p>${result.description}</p>
                            ${result.domain && result.domainId ? `<span class="result-domain result-domain-clickable" data-action="view-domain" data-domain-id="${result.domainId}" tabindex="0" role="button">Domain: ${result.domain}</span>` : result.domain ? `<span class="result-domain">Domain: ${result.domain}</span>` : ''}
                            ${result.severity ? `<span class="result-severity severity-${result.severity}">Risk Level: ${result.severity.toUpperCase()}</span>` : ''}
                        </div>
                    `).join('')}
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
                                <div class="tag-management-name">${tagKey}</div>
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
            Object.values(this.requirements).forEach(req => {
                if (req.tags && req.tags.includes(tagKey)) {
                    count++;
                }
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

            // If name changed, update all requirements that use this tag
            if (newTagKey !== tagKey) {
                if (this.tagDefinitions[newTagKey]) {
                    this.showNotification('A tag with this name already exists.', 'warning');
                    return;
                }

                Object.values(this.requirements).forEach(req => {
                    if (req.tags && req.tags.includes(tagKey)) {
                        req.tags = req.tags.map(t => t === tagKey ? newTagKey : t);
                    }
                });

                delete this.tagDefinitions[tagKey];
            }

            this.tagDefinitions[newTagKey] = {
                color: newColor,
                description: newDescription
            };

            this.saveTagDefinitions();
            this.saveRequirements();
            
            // Refresh UI
            this.renderTagManagement();
            this.populateTagFilters();

            this.showNotification('Tag updated successfully!', 'success');
        }

        deleteTag(tagKey) {
            const tagCount = this.countTagUsage(tagKey);
            
            const confirmMessage = tagCount > 0 
                ? `This tag is used on ${tagCount} requirement${tagCount !== 1 ? 's' : ''}. Deleting it will remove it from all requirements.\n\nAre you sure?`
                : 'Are you sure you want to delete this tag?';

            if (!confirm(confirmMessage)) return;

            // Remove tag from all requirements
            Object.values(this.requirements).forEach(req => {
                if (req.tags && req.tags.includes(tagKey)) {
                    req.tags = req.tags.filter(t => t !== tagKey);
                }
            });

            delete this.tagDefinitions[tagKey];

            this.saveTagDefinitions();
            this.saveRequirements();
            
            // Refresh UI
            this.renderTagManagement();
            this.populateTagFilters();

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
                    
                    <div id="requirementsList" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
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
            modal.addTrackedListener(modal.querySelector('#domainFilter'), 'change', () => this.filterRequirements());
            modal.addTrackedListener(modal.querySelector('#requirementSearch'), 'input', () => this.filterRequirements());
            
            this.renderRequirementsList();
        }

        renderRequirementsList() {
            const container = document.getElementById('requirementsList');
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
                    const reqTags = req.tags || [];
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

        filterRequirements() {
            this.renderRequirementsList();
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
        document.addEventListener('DOMContentLoaded', () => {
            bootstrapPSPFExplorer();
        });
    }
