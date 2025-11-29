export class PSPFExplorer {
        constructor(options = {}) {
            const defaultOptions = { autoInit: true };
            this.options = { ...defaultOptions, ...options };

            this.storageAvailable = typeof localStorage !== 'undefined';

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

        init() {
            this.loadDomainData();
            this.loadTagDefinitions(); // Load custom tag definitions
            this.loadSavedRequirements(); // Load saved tags
            this.initializeRequirementUUIDs();

            if (typeof document !== 'undefined') {
                this.setupEventListeners();
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
                    requirements: ['RISK-036', 'RISK-037', 'RISK-038', 'RISK-039', 'RISK-040', 'RISK-041', 'RISK-042', 'RISK-043', 'RISK-044', 'RISK-045', 'RISK-046', 'RISK-047', 'RISK-048', 'RISK-049', 'RISK-050', 'RISK-051', 'RISK-052', 'RISK-053', 'RISK-054', 'RISK-055', 'RISK-056', 'RISK-057', 'RISK-058']
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
                    requirements: ['PERS-109', 'PERS-110', 'PERS-111', 'PERS-112', 'PERS-113', 'PERS-114', 'PERS-115', 'PERS-116', 'PERS-117', 'PERS-118', 'PERS-119', 'PERS-120']
                },
                {
                    id: 'physical',
                    title: 'Physical Security',
                    description: 'Security planning for facilities, certification and accreditation of physical assets, access controls, and technical surveillance measures.',
                    requirements: ['PHYS-121', 'PHYS-122', 'PHYS-123', 'PHYS-124', 'PHYS-125', 'PHYS-126', 'PHYS-127', 'PHYS-128', 'PHYS-129', 'PHYS-130', 'PHYS-131', 'PHYS-132']
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

                // Personnel Domain - Requirements 108-120
                'PERS-108': { id: 'PERS-108', domainId: 'personnel', title: 'Personnel security assessments establish comprehensive evaluation f...', description: 'Personnel security assessments establish comprehensive evaluation frameworks for determining individual suitability and eligibility to access government resources and classified information based on background investigations, character references, and ongoing monitoring requirements.' },
                'PERS-109': { id: 'PERS-109', domainId: 'personnel', title: 'Identity verification processes implement rigorous authentication p...', description: 'Identity verification processes implement rigorous authentication procedures to confirm the true identity of personnel through multiple independent sources and documentation, including biometric data collection and validation against authoritative databases.' },
                'PERS-110': { id: 'PERS-110', domainId: 'personnel', title: 'Background investigation requirements mandate thorough examination ...', description: 'Background investigation requirements mandate thorough examination of personnel history, associations, financial status, and potential security risks or vulnerabilities that could compromise government operations or information security.' },
                'PERS-111': { id: 'PERS-111', domainId: 'personnel', title: 'Security clearance management maintains systematic processes for gr...', description: 'Security clearance management maintains systematic processes for granting, reviewing, suspending, and revoking personnel access authorizations based on ongoing risk assessment and compliance with security requirements throughout employment lifecycle.' },
                'PERS-112': { id: 'PERS-112', domainId: 'personnel', title: 'Ongoing personnel monitoring establishes continuous assessment fram...', description: 'Ongoing personnel monitoring establishes continuous assessment frameworks to detect changes in circumstances that may affect security suitability or clearance eligibility, including financial difficulties, personal conduct issues, or foreign contacts.' },
                'PERS-113': { id: 'PERS-113', domainId: 'personnel', title: 'Security awareness training programs ensure all personnel understan...', description: 'Security awareness training programs ensure all personnel understand their responsibilities for protecting classified information and government assets through regular education initiatives covering threat recognition, incident reporting, and protective security measures.' },
                'PERS-114': { id: 'PERS-114', domainId: 'personnel', title: 'Insider threat mitigation strategies implement comprehensive progra...', description: 'Insider threat mitigation strategies implement comprehensive programs to identify, assess, and respond to potential risks posed by personnel with authorized access to classified systems and sensitive information through behavioral monitoring and reporting mechanisms.' },
                'PERS-115': { id: 'PERS-115', domainId: 'personnel', title: 'Personnel security incident reporting establishes mandatory procedu...', description: 'Personnel security incident reporting establishes mandatory procedures for documenting and investigating security violations, policy breaches, and suspicious activities involving government personnel and contractors with security clearances.' },
                'PERS-116': { id: 'PERS-116', domainId: 'personnel', title: 'Contractor personnel security ensures non-government personnel work...', description: 'Contractor personnel security ensures non-government personnel working on government projects meet identical security standards and clearance requirements as government employees, including background investigations and ongoing monitoring obligations.' },
                'PERS-117': { id: 'PERS-117', domainId: 'personnel', title: 'Foreign national personnel security implements enhanced assessment ...', description: 'Foreign national personnel security implements enhanced assessment and monitoring procedures for non-Australian citizens requiring access to government facilities or information, including additional background checks and access restrictions.' },
                'PERS-118': { id: 'PERS-118', domainId: 'personnel', title: 'Personnel security record management maintains comprehensive docume...', description: 'Personnel security record management maintains comprehensive documentation of all security assessments, clearances, incidents, and monitoring activities throughout employment tenure with appropriate retention and access controls for sensitive information.' },
                'PERS-119': { id: 'PERS-119', domainId: 'personnel', title: 'Exit procedures for cleared personnel ensure systematic termination...', description: 'Exit procedures for cleared personnel ensure systematic termination processes that protect government interests when personnel with security clearances leave employment, including access revocation, debriefing, and ongoing obligations.' },
                'PERS-120': { id: 'PERS-120', domainId: 'personnel', title: 'Personnel security governance establishes organizational frameworks...', description: 'Personnel security governance establishes organizational frameworks for overseeing all aspects of personnel security programs with clear accountability and reporting structures, including policy development, risk management, and performance monitoring.' },

                // Physical Domain - Requirements 121-132
                'PHYS-121': { id: 'PHYS-121', domainId: 'physical', title: 'Integrate protective security in facility planning', description: 'Integrate comprehensive protective security planning and design considerations into all facility development and modification projects.' },
                'PHYS-122': { id: 'PHYS-122', domainId: 'physical', title: 'Facility security plans for buildings', description: 'Develop detailed facility security plans for all new and significantly modified buildings to ensure appropriate protective measures.' },
                'PHYS-123': { id: 'PHYS-123', domainId: 'physical', title: 'Site location security risk factors', description: 'Consider comprehensive security risk factors in site location decisions including threats, vulnerabilities, and operational requirements.' },
                'PHYS-124': { id: 'PHYS-124', domainId: 'physical', title: 'Risk-commensurate facility access', description: 'Implement secure facility access controls that are commensurate with the assessed security risk and operational requirements.' },
                'PHYS-125': { id: 'PHYS-125', domainId: 'physical', title: 'Construction meets technical standards', description: 'Ensure construction meets established technical notes and standards for public areas, authorized areas, and technology asset protection.' },
                'PHYS-126': { id: 'PHYS-126', domainId: 'physical', title: 'Security Zones 2-5 ASIO compliance', description: 'Security Zones 2-5 must be built according to ASIO Technical Notes specifically designed for protection of classified assets.' },
                'PHYS-127': { id: 'PHYS-127', domainId: 'physical', title: 'Operate facilities per Security Zone requirements', description: 'Operate and maintain all facilities in accordance with their designated Security Zone classification and associated control requirements.' },
                'PHYS-128': { id: 'PHYS-128', domainId: 'physical', title: 'Zones 1-4 certification before use', description: 'Security Zones 1-4 must receive appropriate certification before operational use to ensure compliance with security standards.' },
                'PHYS-129': { id: 'PHYS-129', domainId: 'physical', title: 'Zone 5 ASIO-T4 certification', description: 'Zone 5 facilities for TOP SECRET information must be certified by ASIO-T4 before operational use with enhanced security measures.' },
                'PHYS-130': { id: 'PHYS-130', domainId: 'physical', title: 'Zones 1-5 accreditation requirements', description: 'All Security Zones 1-5 must be formally accredited before use, ensuring correct security controls are implemented and risks accepted.' },
                'PHYS-131': { id: 'PHYS-131', domainId: 'physical', title: 'SCIF areas ASD accreditation', description: 'Sensitive Compartmented Information Facility (SCIF) areas for TOP SECRET information must be accredited by ASD before operational use.' },
                'PHYS-132': { id: 'PHYS-132', domainId: 'physical', title: 'Physical security measures for assets', description: 'Implement comprehensive physical security measures to prevent unauthorized access, use, or removal of all classified and sensitive assets.' }
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

            // Search functionality
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

                searchSubmit.addEventListener('click', performSearch);
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
            });
            
            const activeBtn = document.getElementById(activeId);
            if (activeBtn) {
                activeBtn.classList.add('active');
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
                        <button class="btn btn-outline domain-btn" onclick="window.pspfExplorer.showDomainRequirements('${domain.id}')">
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
                    <div class="domain-summary-card" onclick="window.pspfExplorer.showDomainRequirements('${domain.id}')">
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
                    const compliance = this.compliance[reqId] || { status: 'not-set', comment: '', url: '' };
                    
                    return `
                        <div class="requirement-item" data-req="${reqId}" onclick="window.pspfExplorer.showRequirementDetails('${reqId}')">
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
                                     onclick="pspfExplorer.toggleRequirementTag('${requirementId}', '${tagId}')"
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
                                    <button class="btn-link btn-small" onclick="window.pspfExplorer.unlinkProjectFromRequirement('${project.id}', '${reqId}')">
                                        ✕ Unlink
                                    </button>
                                </div>
                            `).join('') : 
                            '<p class="no-projects">No projects linked to this requirement.</p>'
                        }
                    </div>
                    <button class="btn btn-primary btn-small" onclick="window.pspfExplorer.showLinkProjectModal('${reqId}')">
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
                alert('No available projects to link. Create a project first.');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Link Project to Requirement</h3>
                    <div class="form-group">
                        <label for="projectSelect">Select Project:</label>
                        <select id="projectSelect" class="form-control">
                            <option value="">Choose a project...</option>
                            ${availableProjects.map(project => `
                                <option value="${project.id}">${project.name} (${this.getStatusText(project.status)})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="modal-buttons">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.pspfExplorer.linkProjectToRequirement(document.getElementById('projectSelect').value, '${reqId}'); this.closest('.modal').remove();">Link Project</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.style.display = 'block';
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
                    <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.showDomainRequirements('technology'); window.pspfExplorer.showView('home'); window.pspfExplorer.updateNavButtons('homeBtn');">Review Technology Controls</button>
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
                        <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.showDomainRequirements('${domain.id}'); window.pspfExplorer.showView('home'); window.pspfExplorer.updateNavButtons('homeBtn');">
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
                            ${result.domain && result.domainId ? `<span class="result-domain result-domain-clickable" onclick="window.pspfExplorer.showDomainRequirements('${result.domainId}'); window.pspfExplorer.showView('home'); window.pspfExplorer.updateNavButtons('homeBtn');">Domain: ${result.domain}</span>` : result.domain ? `<span class="result-domain">Domain: ${result.domain}</span>` : ''}
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
                <div class="project-item" data-project="${project.id}" onclick="window.pspfExplorer.showProjectDetails('${project.id}')">
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
                    <button class="btn btn-primary" onclick="window.pspfExplorer.showProjectModal('${project.id}')">Edit Project</button>
                    <button class="btn btn-secondary" onclick="window.pspfExplorer.addTask('${project.id}')">Add Task</button>
                    <button class="btn btn-outline" onclick="window.pspfExplorer.addRisk('${project.id}')">Add Risk</button>
                    <button class="btn btn-danger" onclick="window.pspfExplorer.deleteProject('${project.id}')">Delete Project</button>
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
                                        <button class="btn btn-small btn-outline" onclick="window.pspfExplorer.showTaskModal('${task.id}', '${project.id}')">Edit</button>
                                        <button class="btn btn-small btn-danger" onclick="window.pspfExplorer.deleteTask('${task.id}')">Delete</button>
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
                                        <button class="btn btn-small btn-outline" onclick="window.pspfExplorer.showRiskModal('${risk.id}', '${project.id}')">Edit</button>
                                        <button class="btn btn-small btn-danger" onclick="window.pspfExplorer.deleteRisk('${risk.id}')">Delete</button>
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
                            <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.editTask('${task.id}')">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="window.pspfExplorer.deleteTask('${task.id}')">Delete</button>
                            ${task.status !== 'completed' ? 
                                `<button class="btn btn-success btn-small" onclick="window.pspfExplorer.markTaskComplete('${task.id}')">Complete</button>` : 
                                `<button class="btn btn-secondary btn-small" onclick="window.pspfExplorer.markTaskIncomplete('${task.id}')">Reopen</button>`
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
                            <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.editRisk('${risk.id}')">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="window.pspfExplorer.deleteRisk('${risk.id}')">Delete</button>
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
                            <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.unlinkRequirementFromProject('${reqId}')">Unlink</button>
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
                
                alert('Data exported successfully!');
                
            } catch (error) {
                console.error('Export failed:', error);
                alert('Export failed. Please try again.');
            }
        }

        importData(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (!importData.data || !importData.version) {
                        throw new Error('Invalid backup file format');
                    }

                    if (!confirm('This will replace all current data with imported data. Continue?')) {
                        return;
                    }

                    this.projects = importData.data.projects || [];
                    this.tasks = importData.data.tasks || [];
                    this.risks = importData.data.risks || [];
                    this.incidents = importData.data.incidents || [];
                    this.compliance = importData.data.compliance || {};

                    this.saveData();
                    this.updateDataStats();
                    this.renderHome();

                    alert('Data imported successfully!');
                    
                } catch (error) {
                    console.error('Import failed:', error);
                    alert('Import failed. Please check the file format and try again.');
                }
            };

            reader.readAsText(file);
            event.target.value = '';
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

                alert('All data has been cleared successfully.');
                
            } catch (error) {
                console.error('Clear data failed:', error);
                alert('Failed to clear data. Please try again.');
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
                            <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.editTag('${tagKey}')">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="window.pspfExplorer.deleteTag('${tagKey}')">Delete</button>
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
                alert('Please enter a tag name.');
                return;
            }

            // Normalize tag name (lowercase, no spaces)
            const tagKey = name.toLowerCase().replace(/\s+/g, '-');

            if (this.tagDefinitions[tagKey]) {
                alert('A tag with this name already exists.');
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

            alert(`Tag "${name}" added successfully!`);
        }

        editTag(tagKey) {
            const tag = this.tagDefinitions[tagKey];
            if (!tag) return;

            const newName = prompt('Enter new tag name:', tagKey);
            if (!newName || newName.trim() === '') return;

            const newColor = prompt('Enter new color (hex code):', tag.color);
            if (!newColor || !newColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                alert('Invalid color format. Please use hex format like #3b82f6');
                return;
            }

            const newDescription = prompt('Enter new description:', tag.description);
            if (!newDescription || newDescription.trim() === '') return;

            const newTagKey = newName.toLowerCase().replace(/\s+/g, '-');

            // If name changed, update all requirements that use this tag
            if (newTagKey !== tagKey) {
                if (this.tagDefinitions[newTagKey]) {
                    alert('A tag with this name already exists.');
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

            alert('Tag updated successfully!');
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

            alert('Tag deleted successfully!');
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
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'requirementManagerModal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
                    <h3>📋 Requirement Management</h3>
                    <div style="margin-bottom: 1rem;">
                        <button class="btn btn-primary" onclick="window.pspfExplorer.showAddRequirementModal()">+ Add New Requirement</button>
                        <button class="btn btn-secondary" onclick="window.pspfExplorer.exportRequirements()">Export Requirements</button>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <select id="domainFilter" onchange="window.pspfExplorer.filterRequirements()" style="min-width: 150px;">
                            <option value="">All Domains</option>
                            ${this.domains.map(d => `<option value="${d.id}">${d.title}</option>`).join('')}
                        </select>
                        <input type="text" id="requirementSearch" placeholder="Search requirements..." 
                               oninput="window.pspfExplorer.filterRequirements()" style="flex: 1;">
                    </div>
                    
                    <div id="requirementsList" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
                        <!-- Requirements list will be populated here -->
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.style.display = 'block';
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
                            <button class="btn btn-outline btn-small" onclick="window.pspfExplorer.editRequirement('${req.uuid}')">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="window.pspfExplorer.deleteRequirement('${req.uuid}')" 
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
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${isEdit ? 'Edit Requirement' : 'Add New Requirement'}</h3>
                    <form id="requirementEditForm">
                        <div class="form-group">
                            <label for="reqId">Requirement ID</label>
                            <input type="text" id="reqId" required placeholder="e.g., GOV-036" 
                                   value="${requirement ? requirement.id : ''}"
                                   pattern="[A-Z]+-[0-9]+" title="Format: DOMAIN-NUMBER (e.g., GOV-036)">
                            <small style="color: var(--text-secondary);">Format: DOMAIN-NUMBER (e.g., GOV-036, TECH-108)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="reqDomain">Domain</label>
                            <select id="reqDomain" required>
                                <option value="">Select Domain</option>
                                ${this.domains.map(domain => `
                                    <option value="${domain.id}" ${requirement && requirement.domainId === domain.id ? 'selected' : ''}>
                                        ${domain.title}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="reqTitle">Title</label>
                            <input type="text" id="reqTitle" required placeholder="Requirement title"
                                   value="${requirement ? requirement.title : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="reqDescription">Description</label>
                            <textarea id="reqDescription" required placeholder="Detailed requirement description" rows="4">${requirement ? requirement.description : ''}</textarea>
                        </div>
                        
                        ${isEdit ? `
                            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                                <strong>⚠️ Important:</strong> Changing the Requirement ID will preserve all existing compliance data 
                                and project links through the internal UUID system.
                            </div>
                        ` : ''}
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Requirement</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            document.getElementById('requirementEditForm').addEventListener('submit', (e) => {
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
                alert('Invalid ID format. Use format: DOMAIN-NUMBER (e.g., GOV-036)');
                return;
            }
            
            // Check for duplicate IDs (unless editing existing)
            if (!existingRequirement && this.requirements[reqId]) {
                alert('A requirement with this ID already exists.');
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
            alert(`Requirement ${reqId} ${existingRequirement ? 'updated' : 'created'} successfully!`);
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
            alert(`Requirement ${requirement.id} deleted successfully.`);
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
            
            alert('Requirements exported successfully!');
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
