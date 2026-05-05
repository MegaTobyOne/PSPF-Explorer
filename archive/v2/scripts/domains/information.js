/**
 * PSPF Explorer - Information Security Domain
 * Protective markings, classifications (OFFICIAL, PROTECTED, SECRET, TOP SECRET), need-to-know principle and secure handling requirements.
 */

export const informationDomain = {
    id: 'information',
    title: 'Information Security',
    description: 'Protective markings, classifications (OFFICIAL, PROTECTED, SECRET, TOP SECRET), need-to-know principle and secure handling requirements.',
    requirements: [
        'INFO-058', 'INFO-059', 'INFO-060', 'INFO-061', 'INFO-062', 
        'INFO-063', 'INFO-064', 'INFO-065', 'INFO-066', 'INFO-067', 
        'INFO-068', 'INFO-069', 'INFO-070', 'INFO-071', 'INFO-072', 
        'INFO-073', 'INFO-074', 'INFO-075', 'INFO-076', 'INFO-077', 
        'INFO-078', 'INFO-079', 'INFO-080', 'INFO-081', 'INFO-082', 
        'INFO-083', 'INFO-211'
    ]
};

export const informationRequirements = {
    'INFO-058': { 
        id: 'INFO-058', 
        domainId: 'information', 
        title: 'Originator approval for sanitisation, reclassification and declassification', 
        description: 'The originator remains responsible for controlling the sanitisation, reclassification or declassification of official and security classified information, and approves any changes to the information\'s security classification.' 
    },
    'INFO-059': { 
        id: 'INFO-059', 
        domainId: 'information', 
        title: 'Originator assessment of information value, importance and sensitivity', 
        description: 'The value, importance or sensitivity of official information (intended for use as an official record) is assessed by the originator by considering the potential damage to the government, the national interest, organisations or individuals that would arise if the information\'s confidentiality were compromised.' 
    },
    'INFO-060': { 
        id: 'INFO-060', 
        domainId: 'information', 
        title: 'Classify at the lowest reasonable level', 
        description: 'The security classification is set at the lowest reasonable level.' 
    },
    'INFO-061': { 
        id: 'INFO-061', 
        domainId: 'information', 
        title: 'Apply text-based classification and caveat markings', 
        description: 'Security classified information is clearly marked with the applicable security classification, and when relevant, security caveat, by using text-based markings, unless impractical for operational reasons.' 
    },
    'INFO-062': { 
        id: 'INFO-062', 
        domainId: 'information', 
        title: 'Apply minimum protections and handling for OFFICIAL and classified info', 
        description: 'The minimum protections and handling requirements are applied to protect OFFICIAL and security classified information.' 
    },
    'INFO-063': { 
        id: 'INFO-063', 
        domainId: 'information', 
        title: 'Apply Security Caveat Standard and controlling authority handling', 
        description: 'The Australian Government Security Caveat Standard and special handling requirements imposed by the controlling authority are applied to protect security caveated information.' 
    },
    'INFO-064': { 
        id: 'INFO-064', 
        domainId: 'information', 
        title: 'Mark security caveats as text with a classification', 
        description: 'Security caveats are clearly marked as text and only appear in conjunction with a security classification.' 
    },
    'INFO-065': { 
        id: 'INFO-065', 
        domainId: 'information', 
        title: 'Number pages and references for accountable material', 
        description: 'Accountable material has page and reference numbering.' 
    },
    'INFO-066': { 
        id: 'INFO-066', 
        domainId: 'information', 
        title: 'Handle accountable material per Caveat Standard and originator rules', 
        description: 'Accountable material is handled in accordance with any special handling requirements imposed by the originator and security caveat owner detailed in the Australian Government Security Caveat Standard.' 
    },
    'INFO-067': { 
        id: 'INFO-067', 
        domainId: 'information', 
        title: 'Apply Email Protective Marking Standard for OFFICIAL/classified email', 
        description: 'The Australian Government Email Protective Marking Standard is applied to protect OFFICIAL and security classified information exchanged by email in and between Australian Government entities, including other authorised parties.' 
    },
    'INFO-068': { 
        id: 'INFO-068', 
        domainId: 'information', 
        title: 'Use Recordkeeping Metadata Security Classification/Caveat in systems', 
        description: "The Australian Government Recordkeeping Metadata Standard's Security Classification property (and where relevant, the Security Caveat property) is applied to protectively mark information on technology systems that store, process or communicate security classified information."
    },
    'INFO-069': { 
        id: 'INFO-069', 
        domainId: 'information', 
        title: 'Use Recordkeeping Metadata "Rights" for access restrictions', 
        description: "Apply the Australian Government Recordkeeping Metadata Standard's 'Rights' property where the entity wishes to categorise information content by the type of restrictions on access."
    },
    'INFO-070': { 
        id: 'INFO-070', 
        domainId: 'information', 
        title: 'Conduct classified discussions only in approved locations', 
        description: 'Security classified discussions and dissemination of security classified information are only conducted in approved locations.' 
    },
    'INFO-071': { 
        id: 'INFO-071', 
        domainId: 'information', 
        title: 'Implement proportional operational controls for information holdings', 
        description: 'Entity implements operational controls for its information holdings that are proportional to their value, importance and sensitivity.' 
    },
    'INFO-072': { 
        id: 'INFO-072', 
        domainId: 'information', 
        title: 'Maintain auditable register for TOP SECRET and accountable material', 
        description: 'An auditable register is maintained for TOP SECRET information and accountable material.' 
    },
    'INFO-073': { 
        id: 'INFO-073', 
        domainId: 'information', 
        title: 'Secure disposal per ISM, Records Authorities, NAP and Archives Act', 
        description: 'OFFICIAL and security classified information is disposed of securely in accordance with the Minimum Protections and Handling Requirements, Information Security Manual, the Records Authorities, a Normal Administrative Practice and the Archives Act 1983.' 
    },
    'INFO-074': { 
        id: 'INFO-074', 
        domainId: 'information', 
        title: 'Destroy classified information when retention periods expire', 
        description: 'Security classified information is appropriately destroyed in accordance with the Minimum Protections and Handling Requirements when it has passed the minimum retention requirements or reaches authorised destruction dates.' 
    },
    'INFO-075': { 
        id: 'INFO-075', 
        domainId: 'information', 
        title: 'Share externally only with clearance, need‑to‑know and transfer controls', 
        description: 'Access to security classified information or resources is only provided to people outside the entity with the appropriate security clearance (where required) and a need-to-know, and is transferred in accordance with the Minimum Protections and Handling Requirements' 
    },
    'INFO-076': { 
        id: 'INFO-076', 
        domainId: 'information', 
        title: 'Apply Commonwealth–State–Territory MoU when sharing with jurisdictions', 
        description: 'The Memorandum of Understanding between the Commonwealth, States and Territories is applied when sharing information with state and territory government agencies.' 
    },
    'INFO-077': { 
        id: 'INFO-077', 
        domainId: 'information', 
        title: 'Agree handling terms before sharing outside government (OFFICIAL: Sensitive exception)', 
        description: 'An agreement or arrangement, such as a contract or deed, that establishes handling requirements and protections, is in place before security classified information or resources are disclosed or shared with a person or organisation outside of government, unless the entity is returning or responding to information provided by a person or organisation outside of government, or their authorised representative, which the government entity subsequently classified as OFFICIAL: Sensitive.' 
    },
    'INFO-078': { 
        id: 'INFO-078', 
        domainId: 'information', 
        title: 'Meet security provisions in applicable international instruments', 
        description: 'Provisions are met concerning the security of people, information and resources contained in international agreements and arrangements to which Australia is a party.' 
    },
    'INFO-079': { 
        id: 'INFO-079', 
        domainId: 'information', 
        title: 'Share with foreign entities only under law or international agreement', 
        description: 'Australian Government security classified information or resources shared with a foreign entity is protected by an explicit legislative provision, international agreement or international arrangement.' 
    },
    'INFO-080': { 
        id: 'INFO-080', 
        domainId: 'information', 
        title: 'Do not share AUSTEO with non‑citizens unless exempted', 
        description: 'Australian Government security classified information or resources bearing the Australian Eyes Only (AUSTEO) caveat is never shared with a person who is not an Australian citizen, even when an international agreement or international arrangement is in place, unless an exemption is granted.' 
    },
    'INFO-081': { 
        id: 'INFO-081', 
        domainId: 'information', 
        title: 'Limit AGAO sharing to citizens or specified agency personnel', 
        description: 'Australian Government security classified information or resources bearing the Australian Government Access Only (AGAO) caveat is not shared with a person who is not an Australia citizen, even when an international agreement or international arrangement is in place, unless they are working for, or seconded to, an entity that is a member of National Intelligence Community, the Department of Defence or the Australian Submarine Agency.' 
    },
    'INFO-082': { 
        id: 'INFO-082', 
        domainId: 'information', 
        title: 'Safeguard foreign classified info per international agreement', 
        description: 'Where an international agreement or international arrangement is in place, security classified foreign entity information or resources are safeguarded in accordance with the provisions set out in the agreement or arrangement.' 
    },
    'INFO-083': { 
        id: 'INFO-083', 
        domainId: 'information', 
        title: 'Share with foreign non‑government only under law or agreement', 
        description: 'Australian Government security classified information or resources shared with a foreign non-government stakeholder is protected by an explicit legislative provision, international agreement or international arrangement.' 
    },
    'INFO-211': { 
        id: 'INFO-211', 
        domainId: 'information', 
        title: 'Maintain technology asset stocktake and security risk management plan', 
        description: "A Technology Asset Stocktake and Technology Security Risk Management Plan is created to identify and manage the entity's internet-facing systems or services and is maintained to ensure continuous visibility and monitoring of the entity's resource and technology estate."
    }
};
