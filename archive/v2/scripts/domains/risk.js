/**
 * PSPF Explorer - Risk Management Domain
 * Security risk management aligned with enterprise risk, including third-party, supply chain, and foreign interference risk management.
 */

export const riskDomain = {
    id: 'risk',
    title: 'Risk Management',
    description: 'Security risk management aligned with enterprise risk, including third-party, supply chain, and foreign interference risk management.',
    requirements: [
        'RISK-036', 'RISK-037', 'RISK-038', 'RISK-039', 'RISK-040', 
        'RISK-041', 'RISK-042', 'RISK-043', 'RISK-044', 'RISK-045', 
        'RISK-046', 'RISK-047', 'RISK-048', 'RISK-049', 'RISK-050', 
        'RISK-051', 'RISK-052', 'RISK-053', 'RISK-054', 'RISK-055', 
        'RISK-056', 'RISK-057'
    ]
};

export const riskRequirements = {
    'RISK-036': { 
        id: 'RISK-036', 
        domainId: 'risk', 
        title: 'The Accountable Authority determines their entity\'s tolerance for security ri...', 
        description: 'The Accountable Authority determines their entity\'s tolerance for security risks and documents in the security plan. (05. Security Risk Management)' 
    },
    'RISK-037': { 
        id: 'RISK-037', 
        domainId: 'risk', 
        title: 'A risk steward (or manager) is identified for each security risk or category ...', 
        description: 'A risk steward (or manager) is identified for each security risk or category of security risk, including shared risks. (05. Security Risk Management)' 
    },
    'RISK-038': { 
        id: 'RISK-038', 
        domainId: 'risk', 
        title: 'The Accountable Authority considers the impact that their security risk manag...', 
        description: 'The Accountable Authority considers the impact that their security risk management decisions could potentially have on other entities, and shares information on risks where appropriate. (05. Security Risk Management)' 
    },
    'RISK-039': { 
        id: 'RISK-039', 
        domainId: 'risk', 
        title: 'The entity is accountable for the management of security risks arising from p...', 
        description: 'The entity is accountable for the management of security risks arising from procuring goods and services and ensures procurement and contract decisions do not expose the entity or the Australian Government to an unacceptable level of risk. (06. Third Party Risk Management)' 
    },
    'RISK-040': { 
        id: 'RISK-040', 
        domainId: 'risk', 
        title: 'Procurement, contracts and third-party outsourced arrangements contain propor...', 
        description: 'Procurement, contracts and third-party outsourced arrangements contain proportionate security terms and conditions to ensure service providers, contractors and subcontractors comply with relevant PSPF Requirements and avoid exposing the entity or the Australian Government to an unacceptable level of risk. (06. Third Party Risk Management)' 
    },
    'RISK-041': { 
        id: 'RISK-041', 
        domainId: 'risk', 
        title: 'Entity ensures service providers, contractors and subcontractors comply with ...', 
        description: 'Entity ensures service providers, contractors and subcontractors comply with relevant PSPF Requirements as detailed by the entity. (06. Third Party Risk Management)' 
    },
    'RISK-042': { 
        id: 'RISK-042', 
        domainId: 'risk', 
        title: 'Contractual security terms and conditions require service providers to report...', 
        description: 'Contractual security terms and conditions require service providers to report any actual or suspected security incidents to the entity, and follow reasonable direction from the entity arising from incident investigations. (06. Third Party Risk Management)' 
    },
    'RISK-043': { 
        id: 'RISK-043', 
        domainId: 'risk', 
        title: 'Government entities providing outsourced services provide IRAP assessment rep...', 
        description: 'Government entities providing outsourced services provide IRAP assessment reports to the government entities consuming, or looking to consume, their services. (06. Third Party Risk Management)' 
    },
    'RISK-044': { 
        id: 'RISK-044', 
        domainId: 'risk', 
        title: 'Contract security terms and conditions are monitored and reviewed to ensure t...', 
        description: 'Contract security terms and conditions are monitored and reviewed to ensure the specified security controls, terms and conditions are implemented, operated and maintained by the contracted provider, including any subcontractors, over the life of a contract. (06. Third Party Risk Management)' 
    },
    'RISK-045': { 
        id: 'RISK-045', 
        domainId: 'risk', 
        title: 'Contractual terms and conditions include appropriate security arrangements fo...', 
        description: 'Contractual terms and conditions include appropriate security arrangements for the completion or termination of the contract. (06. Third Party Risk Management)' 
    },
    'RISK-046': { 
        id: 'RISK-046', 
        domainId: 'risk', 
        title: 'Procurement and contract decisions consider the security risks before engagin...', 
        description: 'Procurement and contract decisions consider the security risks before engaging providers operating under foreign ownership, control or influence, and in response to any developments during the contract period that may give rise to foreign ownership, control or influence risks. (06. Third Party Risk Management)' 
    },
    'RISK-047': { 
        id: 'RISK-047', 
        domainId: 'risk', 
        title: 'Security risks arising from contractual arrangements for the provision of goo...', 
        description: 'Security risks arising from contractual arrangements for the provision of goods and services are managed, reassessed and adjusted over the life of a contract. (06. Third Party Risk Management)' 
    },
    'RISK-048': { 
        id: 'RISK-048', 
        domainId: 'risk', 
        title: 'Secure and verifiable third-party vendors, providers, partners and associated...', 
        description: 'Secure and verifiable third-party vendors, providers, partners and associated services are used unless business operations require use, and the residual risks are managed and approved by the Chief Information Security Officer (06. Third Party Risk Management)' 
    },
    'RISK-049': { 
        id: 'RISK-049', 
        domainId: 'risk', 
        title: 'Entities manage the security risks associated with engaging with foreign part...', 
        description: 'Entities manage the security risks associated with engaging with foreign partners. (07. Countering Foreign Interference and Espionage)' 
    },
    'RISK-050': { 
        id: 'RISK-050', 
        domainId: 'risk', 
        title: 'Personnel do not publicise their security clearance level on social media pla...', 
        description: 'Personnel do not publicise their security clearance level on social media platforms, including employment-focused platforms such as LinkedIn. (07. Countering Foreign Interference and Espionage)' 
    },
    'RISK-051': { 
        id: 'RISK-051', 
        domainId: 'risk', 
        title: 'Insider Threat program...', 
        description: 'An insider threat program is implemented by entities that manage Baseline to Positive Vetting security clearance subjects, to manage the risk of insider threat in the entity.' 
    },
    'RISK-052': { 
        id: 'RISK-052', 
        domainId: 'risk', 
        title: 'Exceptional circumstances and risk tolerance...', 
        description: 'Where exceptional circumstances prevent or affect an entity\'s capability to implement a PSPF requirement or standard, the Accountable Authority may vary application, for a limited period of time, consistent with the entity\'s risk tolerance.' 
    },
    'RISK-053': { 
        id: 'RISK-053', 
        domainId: 'risk', 
        title: 'Exceptional circumstance decisions are recorded in the plan...', 
        description: "Decisions to vary implementation of a PSPF requirement or standard due to exceptional circumstances are documented in the entity's security plan." 
    },
    'RISK-054': { 
        id: 'RISK-054', 
        domainId: 'risk', 
        title: 'Alternative mitigations are reviewed annually', 
        description: 'Decisions to implement an alternative mitigation measure that meets or exceeds a PSPF requirement or standard are reviewed and reported annually.' 
    },
    'RISK-055': { 
        id: 'RISK-055', 
        domainId: 'risk', 
        title: 'Business Continuity Plan is developed...', 
        description: "A business continuity plan is developed, implemented and maintained to respond effectively and minimise the impacts of significant business disruptions to the entity's critical services and assets, and other services and assets when warranted by a threat and security risk assessment." 
    },
    'RISK-056': { 
        id: 'RISK-056', 
        domainId: 'risk', 
        title: 'Emergency planning is in BCP...', 
        description: 'Plans for managing a broad range of emergencies are integrated within the business continuity plan.' 
    },
    'RISK-057': { 
        id: 'RISK-057', 
        domainId: 'risk', 
        title: 'Emergency notifications...', 
        description: 'Personnel who are likely to be impacted are notified if there is a heightened risk of an emergency.' 
    }
};
