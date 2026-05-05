/**
 * PSPF Explorer - Technology Security Domain
 * Cybersecurity strategy with zero trust culture, AI/quantum technology policies, Essential Eight mitigation strategies, and cloud security requirements.
 */

export const technologyDomain = {
    id: 'technology',
    title: "Technology Security",
    description: "Cybersecurity strategy with zero trust culture, AI/quantum technology policies, Essential Eight mitigation strategies, and cloud security requirements.",
    requirements: [
        'TECH-084', 'TECH-085', 'TECH-086', 'TECH-087', 'TECH-088', 
        'TECH-089', 'TECH-090', 'TECH-091', 'TECH-092', 'TECH-093', 
        'TECH-094', 'TECH-095', 'TECH-096', 'TECH-097', 'TECH-098', 
        'TECH-099', 'TECH-100', 'TECH-101', 'TECH-102', 'TECH-103', 
        'TECH-104', 'TECH-105', 'TECH-106', 'TECH-107', 'TECH-108', 
        'TECH-109', 'TECH-110', 'TECH-111', 'TECH-112', 'TECH-113', 
        'TECH-114', 'TECH-115', 'TECH-212', 'TECH-213', 'TECH-214', 
        'TECH-215', 'TECH-216', 'TECH-217'
    ]
};

export const technologyRequirements = {
    'TECH-084': { 
        id: 'TECH-084', 
        domainId: 'technology', 
        title: "Cyber security throughout technology lifecycle", 
        description: "Apply comprehensive cyber security principles throughout the entire technology asset lifecycle from procurement to disposal." 
    },
    'TECH-085': { 
        id: 'TECH-085', 
        domainId: 'technology', 
        title: "ASD ISM controls and guidelines", 
        description: "Apply Australian Signals Directorate Information Security Manual (ISM) controls and guidelines on a risk-based approach to ensure appropriate security." 
    },
    'TECH-086': { 
        id: 'TECH-086', 
        domainId: 'technology', 
        title: "Authorise systems to operate based on residual risk acceptance", 
        description: "The Authorising Officer authorises each technology system to operate based on the acceptance of the residual security risks associated with its operation before that system processes, stores or communicates government information or data." 
    },
    'TECH-087': { 
        id: 'TECH-087', 
        domainId: 'technology', 
        title: "Authorisation decisions follow ISM risk-based approach", 
        description: "Decisions to authorise (or reauthorise) a new technology system or make changes to an existing technology system are based on the Information Security Manual s risk-based approach to cyber security." 
    },
    'TECH-088': { 
        id: 'TECH-088', 
        domainId: 'technology', 
        title: "Authorise systems to highest data classification", 
        description: "The technology system is authorised to the highest security classification of the information and data it will process, store or communicate." 
    },
    'TECH-089': { 
        id: 'TECH-089', 
        domainId: 'technology', 
        title: "Maintain register of authorised technology systems", 
        description: "A register of the entity's authorised technology systems is developed, implemented and maintained, and includes the name and position of the Authorising Officer, system owner, date of authorisation, and any decisions to accept residual security risks."
    },
    'TECH-090': { 
        id: 'TECH-090', 
        domainId: 'technology', 
        title: "Reassess authorisation after significant changes", 
        description: "Each technology system s suitability to be authorised to operate is reassessed when it undergoes significant functionality or architectural change, or where the system s security environment has changed considerably." 
    },
    'TECH-091': { 
        id: 'TECH-091', 
        domainId: 'technology', 
        title: "Block TikTok on government devices", 
        description: "The TikTok application is prevented from being installed, and existing instances are removed, on government devices, unless a legitimate business reason exists which necessitates the installation or ongoing presence of the application." 
    },
    'TECH-092': { 
        id: 'TECH-092', 
        domainId: 'technology', 
        title: "The CSO or CISO approves any legitimate business reason for the use of the TikTok", 
        description: "The Chief Security Officer or Chief Information Security Officer approves any legitimate business reason for the use of the TikTok " 
    },
    'TECH-093': { 
        id: 'TECH-093', 
        domainId: 'technology', 
        title: "Apply temporary mitigations for legacy IT", 
        description: "The Australian Signals Directorate's temporary mitigations for legacy IT are applied to manage legacy information technology that cannot yet be replaced."
    },
    'TECH-094': { 
        id: 'TECH-094', 
        domainId: 'technology', 
        title: "Store SECRET and below in appropriate security zones", 
        description: "Technology assets and their components, classified as SECRET or below are stored in the appropriate Security Zone based on their aggregated security classification or business impact level." 
    },
    'TECH-095': { 
        id: 'TECH-095', 
        domainId: 'technology', 
        title: "Store TOP SECRET in SCEC-endorsed racks in accredited Zone Five", 
        description: "Technology assets and their components classified as TOP SECRET are stored in suitable SCEC-endorsed racks or compartments within an accredited Security Zone Five area meeting ASIO Technical Note 5/12 – Compartments within Zone Five areas requirements." 
    },
    'TECH-096': { 
        id: 'TECH-096', 
        domainId: 'technology', 
        title: "Use certified and accredited outsourced facilities for catastrophic impact", 
        description: "Outsourced facilities that house technology assets and their components with a catastrophic business impact level are certified by ASIO-T4 physical security and accredited by ASD before they are used operationally." 
    },
    'TECH-097': { 
        id: 'TECH-097', 
        domainId: 'technology', 
        title: "Dispose technology assets securely per ISM", 
        description: "Technology assets are disposed of securely in accordance with the Information Security Manual." 
    },
    'TECH-098': { 
        id: 'TECH-098', 
        domainId: 'technology', 
        title: "Develop and maintain cyber security strategy and uplift plan", 
        description: "A cyber security strategy and uplift plan is developed, implemented and maintained to manage the entity s cyber security risks in accordance with the Information Security Manual and the Guiding Principles to Embed a Zero Trust Culture." 
    },
    'TECH-099': { 
        id: 'TECH-099', 
        domainId: 'technology', 
        title: "Implement patch applications to E8 Maturity Level Two", 
        description: "Patch applications mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-100': { 
        id: 'TECH-100', 
        domainId: 'technology', 
        title: "Implement patch operating systems to E8 Level Two", 
        description: "Patch operating systems mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-101': { 
        id: 'TECH-101', 
        domainId: 'technology', 
        title: "Implement multi-factor authentication to E8 Level Two", 
        description: "Multi-factor authentication mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-102': { 
        id: 'TECH-102', 
        domainId: 'technology', 
        title: "Restrict administrative privileges to E8 Level Two", 
        description: "Restrict administrative privileges mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-103': { 
        id: 'TECH-103', 
        domainId: 'technology', 
        title: "Implement application control to E8 Level Two", 
        description: "Application control mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-104': { 
        id: 'TECH-104', 
        domainId: 'technology', 
        title: "Restrict Microsoft Office macros to E8 Level Two", 
        description: "Restrict Microsoft Office macros mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-105': { 
        id: 'TECH-105', 
        domainId: 'technology', 
        title: "Implement user application hardening to E8 Level Two", 
        description: "User application hardening mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-106': { 
        id: 'TECH-106', 
        domainId: 'technology', 
        title: "Implement regular back-ups to E8 Level Two", 
        description: "Regular back-ups mitigation strategy is implemented to Maturity Level Two under ASD's Essential Eight Maturity Model."
    },
    'TECH-107': { 
        id: 'TECH-107', 
        domainId: 'technology', 
        title: "Consider remaining ASD mitigation strategies as required", 
        description: "The remaining mitigation strategies from the Strategies to Mitigate Cyber Security Incidents are considered and, where required, implemented to achieve an acceptable level of residual risk for their entity." 
    },
    'TECH-108': { 
        id: 'TECH-108', 
        domainId: 'technology', 
        title: "Use PDNS or other mechanisms to block malicious endpoints", 
        description: "A Protective Domain Name System service or other security mechanisms is used to prevent connections to and from known malicious endpoints." 
    },
    'TECH-109': { 
        id: 'TECH-109', 
        domainId: 'technology', 
        title: "Use IRAP-assessed CSPs within last 24 months", 
        description: "Cloud Service Providers that have completed an IRAP assessment against the latest version of ASD's Information Security Manual within the previous 24 months are used."
    },
    'TECH-110': { 
        id: 'TECH-110', 
        domainId: 'technology', 
        title: "Act on IRAP recommendations using a risk-based approach", 
        description: "Entities consider IRAP assessment recommendations and findings, and implement on a risk-based approach." 
    },
    'TECH-111': { 
        id: 'TECH-111', 
        domainId: 'technology', 
        title: "Host classified/SoGS in certified CSP and Data Centre", 
        description: "Security classified or systems of government significance information and data is securely hosted using a Cloud Service Provider and Data Centre Provider that has been certified against the Australian Government Hosting Certification Framework." 
    },
    'TECH-112': { 
        id: 'TECH-112', 
        domainId: 'technology', 
        title: "Use Data Centre Facilities Supplies Panel for certified services", 
        description: "The Data Centre Facilities Supplies Panel is used when procuring certified data centre space and services." 
    },
    'TECH-113': { 
        id: 'TECH-113', 
        domainId: 'technology', 
        title: "Protect inter-connected systems by a gateway (ISM & Gateways Policy)", 
        description: "Internet-connected technology systems, and the data they process, store or communicate, are protected by a gateway in accordance with the Information Security Manual and the Gateways Policy." 
    },
    'TECH-114': { 
        id: 'TECH-114', 
        domainId: 'technology', 
        title: "Gateways or Edges that have completed an IRAP assessment within 24 months", 
        description: "Gateways or Secure Service Edges that have completed an IRAP assessment (or ASD assessment for TOP SECRET gateways) against the latest version of ASD\'s Information Security Manual within the previous 24 months are used." 
    },
    'TECH-115': { 
        id: 'TECH-115', 
        domainId: 'technology', 
        title: "A vulnerability disclosure program and supporting processes and procedures are established", 
        description: "A vulnerability disclosure program and supporting processes and procedures are established to receive, verify, resolve and report on vulnerabilities disclosed by both internal and external sources." 
    },
    'TECH-212': { 
        id: 'TECH-212', 
        domainId: 'technology', 
        title: "Use approved post‑quantum crypto per ISM cryptography guidance", 
        description: "Approved post-quantum cryptographic encryption algorithms are used for newly procured cryptographic equipment and software in accordance with the Information Security Manual's guidelines for cryptography." 
    },
    'TECH-213': { 
        id: 'TECH-213', 
        domainId: 'technology', 
        title: "CISO reports risk every Audit Committee; biannual strategy progress", 
        description: "The Chief Information Security Officer reports on the entity's cyber security risk at each meeting of the Audit Committee and biannually on the progress of the cyber security strategy and uplift plan." 
    },
    'TECH-214': { 
        id: 'TECH-214', 
        domainId: 'technology', 
        title: "Protect classified digital infrastructure via Gateway or SSE (AGGSS)", 
        description: "Digital Infrastructure that processes, stores or communicates Australian Government security classified information is protected by a Gateway or Security Service Edge in accordance with the Australian Government Gateway Security Standard." 
    },
    'TECH-215': { 
        id: 'TECH-215', 
        domainId: 'technology', 
        title: "Participate in ASD Cyber Security Partnership; notify on risk profile change", 
        description: "Participate in the Australian Signals Directorate's Cyber Security Partnership Program and notify ASD in the event of a change in the entity s risk profile." 
    },
    'TECH-216': { 
        id: 'TECH-216', 
        domainId: 'technology', 
        title: "Connect to ASD's Cyber Threat Intelligence Sharing platform", 
        description: "Connect to the Australian Signals Directorate's Cyber Threat Intelligence Sharing platform." 
    },
    'TECH-217': { 
        id: 'TECH-217', 
        domainId: 'technology', 
        title: "Protect SoGS in accordance with the SoGS Standard", 
        description: "Declared Systems of Government Significance are protected in accordance with the Australian Government Systems of Government Significance Standard." 
    }
};

// Essential Eight Controls mapping to Technology requirements
export const essentialEightControls = [
    { id: 'TECH-103', label: 'Application control' },
    { id: 'TECH-099', label: 'Patch applications' },
    { id: 'TECH-104', label: 'Configure macros' },
    { id: 'TECH-105', label: 'User application hardening' },
    { id: 'TECH-102', label: 'Restrict admin privileges' },
    { id: 'TECH-100', label: 'Patch operating systems' },
    { id: 'TECH-101', label: 'Multi-factor authentication' },
    { id: 'TECH-106', label: 'Regular backups' }
];
