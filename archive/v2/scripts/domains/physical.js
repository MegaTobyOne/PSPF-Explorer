/**
 * PSPF Explorer - Physical Security Domain
 * Security planning for facilities, certification and accreditation of physical assets, access controls, and technical surveillance measures.
 */

export const physicalDomain = {
    id: 'physical',
    title: 'Physical Security',
    description: 'Security planning for facilities, certification and accreditation of physical assets, access controls, and technical surveillance measures.',
    requirements: [
        'PHYS-189', 'PHYS-190', 'PHYS-191', 'PHYS-192', 'PHYS-193', 
        'PHYS-194', 'PHYS-195', 'PHYS-196', 'PHYS-197', 'PHYS-198', 
        'PHYS-199', 'PHYS-200', 'PHYS-201', 'PHYS-202', 'PHYS-203', 
        'PHYS-204', 'PHYS-205', 'PHYS-206', 'PHYS-207', 'PHYS-208', 
        'PHYS-209', 'PHYS-210'
    ]
};

export const physicalRequirements = {
    'PHYS-189': { 
        id: 'PHYS-189', 
        domainId: 'physical', 
        title: 'Protective security is integrated in the process of planning, sel...', 
        description: 'Protective security is integrated in the process of planning, selecting, designing and modifying entity facilities for the protection of people, information and resources.' 
    },
    'PHYS-190': { 
        id: 'PHYS-190', 
        domainId: 'physical', 
        title: 'A facility security plan is developed for new facilities, facilit...', 
        description: 'A facility security plan is developed for new facilities, facilities under construction or major refurbishments of existing facilities.' 
    },
    'PHYS-191': { 
        id: 'PHYS-191', 
        domainId: 'physical', 
        title: 'Decisions on entity facility locations are informed by considerin...', 
        description: 'Decisions on entity facility locations are informed by considering the site selection factors for Australian Government facilities.' 
    },
    'PHYS-192': { 
        id: 'PHYS-192', 
        domainId: 'physical', 
        title: 'When designing or modifying facilities, the entity secures and co...', 
        description: 'When designing or modifying facilities, the entity secures and controls access to facilities to meet the highest risk level to entity resources in accordance with Security Zone restricted access definitions.' 
    },
    'PHYS-193': { 
        id: 'PHYS-193', 
        domainId: 'physical', 
        title: 'Facilities are constructed in accordance the applicable ASIO Tech...', 
        description: 'Facilities are constructed in accordance the applicable ASIO Technical Notes to protect against the highest risk level in accordance with the entity security risk assessment in areas: accessed by the public and authorised personnel, and where physical resources and technical assets, other than security classified resources and technology, are stored.' 
    },
    'PHYS-194': { 
        id: 'PHYS-194', 
        domainId: 'physical', 
        title: 'Facilities for Security Zones Two to Five that process, store or ...', 
        description: 'Facilities for Security Zones Two to Five that process, store or communicate security classified information and resources are constructed in accordance with the applicable sections of ASIO Technical Note 1/15 – Physical Security Zones, and ASIO Technical Note 5/12 – Physical Security Zones (TOP SECRET) areas.' 
    },
    'PHYS-195': { 
        id: 'PHYS-195', 
        domainId: 'physical', 
        title: 'Entity facilities are operated and maintained in accordance with ...', 
        description: 'Entity facilities are operated and maintained in accordance with Security Zones and Physical Security Measures and Controls.' 
    },
    'PHYS-196': { 
        id: 'PHYS-196', 
        domainId: 'physical', 
        title: 'Security Zones One to Four are certified by the Certification Aut...', 
        description: 'Security Zones One to Four are certified by the Certification Authority in accordance with the PSPF and applicable ASIO Technical Notes before they are used operationally.' 
    },
    'PHYS-197': { 
        id: 'PHYS-197', 
        domainId: 'physical', 
        title: 'Security Zone Five areas that contain TOP SECRET security classif...', 
        description: 'Security Zone Five areas that contain TOP SECRET security classified information or aggregated information where the compromise of confidentiality, loss of integrity or unavailability of that information may have a catastrophic business impact level, are certified by ASIO-T4 before they are used operationally.' 
    },
    'PHYS-198': { 
        id: 'PHYS-198', 
        domainId: 'physical', 
        title: 'Security Zones One to Five are accredited by the Accreditation Au...', 
        description: 'Security Zones One to Five are accredited by the Accreditation Authority before they are used operationally, on the basis that the required security controls are certified and the entity determines and accepts the residual risks.' 
    },
    'PHYS-199': { 
        id: 'PHYS-199', 
        domainId: 'physical', 
        title: 'Sensitive Compartmented Information Facility areas used to secure...', 
        description: 'Sensitive Compartmented Information Facility areas used to secure and access TOP SECRET systems and security classified compartmented information are accredited by the Australian Signals Directorate before they are used operationally.' 
    },
    'PHYS-200': { 
        id: 'PHYS-200', 
        domainId: 'physical', 
        title: 'Physical security measures are implemented to minimise or remove ...', 
        description: 'Physical security measures are implemented to minimise or remove the risk of information and physical asset resources being made inoperable or inaccessible, or being accessed, used or removed without appropriate authorisation.' 
    },
    'PHYS-201': { 
        id: 'PHYS-201', 
        domainId: 'physical', 
        title: 'Physical security measures are implemented to protect entity reso...', 
        description: 'Physical security measures are implemented to protect entity resources, commensurate with the assessed business impact level of their compromise, loss or damage.' 
    },
    'PHYS-202': { 
        id: 'PHYS-202', 
        domainId: 'physical', 
        title: 'Physical security measures are implemented to minimise or remove ...', 
        description: 'Physical security measures are implemented to minimise or remove the risk of harm to people.' 
    },
    'PHYS-203': { 
        id: 'PHYS-203', 
        domainId: 'physical', 
        title: 'The appropriate container, safe, vault, cabinet, secure room or s...', 
        description: 'The appropriate container, safe, vault, cabinet, secure room or strong rooms is used to protect entity information and resources based on the applicable Security Zone and business impact level of the compromise, loss or damage to information or physical resources.' 
    },
    'PHYS-204': { 
        id: 'PHYS-204', 
        domainId: 'physical', 
        title: 'Perimeter doors and hardware in areas that process, store or comm...', 
        description: 'Perimeter doors and hardware in areas that process, store or communicate security classified information or resources are constructed and secured in accordance with the physical security measures and controls for perimeter doors and hardware.' 
    },
    'PHYS-205': { 
        id: 'PHYS-205', 
        domainId: 'physical', 
        title: 'Access by authorised personnel, vehicles and equipment to Securit...', 
        description: 'Access by authorised personnel, vehicles and equipment to Security Zones One to Five is controlled in accordance with the physical security measures and controls for access control for authorised personnel.' 
    },
    'PHYS-206': { 
        id: 'PHYS-206', 
        domainId: 'physical', 
        title: 'Access by visitors to Security Zones One to Five is controlled in...', 
        description: 'Access by visitors to Security Zones One to Five is controlled in accordance with the physical security measures and controls for access control for visitors.' 
    },
    'PHYS-207': { 
        id: 'PHYS-207', 
        domainId: 'physical', 
        title: 'The Accountable Authority or Chief Security Officer approves ongo...', 
        description: 'The Accountable Authority or Chief Security Officer approves ongoing (or regular) access to entity facilities for people who are not directly engaged by the entity or covered by the terms of a contract or agreement, on the basis that the person: has the required security clearance level for the Security Zone/s, and a business need supported by a business case and security risk assessment, which is reassessed at least every two years.' 
    },
    'PHYS-208': { 
        id: 'PHYS-208', 
        domainId: 'physical', 
        title: 'Unauthorised access to Security Zones One to Five is controlled i...', 
        description: 'Unauthorised access to Security Zones One to Five is controlled in accordance with the physical security measures and controls for security alarm systems.' 
    },
    'PHYS-209': { 
        id: 'PHYS-209', 
        domainId: 'physical', 
        title: 'Security guard arrangements in Security Zones One to Five are est...', 
        description: 'Security guard arrangements in Security Zones One to Five are established in accordance with the physical security measures and controls for security guards.' 
    },
    'PHYS-210': { 
        id: 'PHYS-210', 
        domainId: 'physical', 
        title: 'Technical surveillance countermeasures for Security Zones One to ...', 
        description: 'Technical surveillance countermeasures for Security Zones One to Five are established in accordance with the physical security measures and controls for technical surveillance countermeasures.' 
    }
};
