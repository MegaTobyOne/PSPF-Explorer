/**
 * PSPF Explorer - Personnel Security Domain
 * Pre-employment screening, security clearance processes, conditional clearance management, and eligibility waiver protocols.
 */

export const personnelDomain = {
    id: 'personnel',
    title: 'Personnel Security',
    description: 'Pre-employment screening, security clearance processes, conditional clearance management, and eligibility waiver protocols.',
    requirements: [
        'PERS-116', 'PERS-117', 'PERS-118', 'PERS-119', 'PERS-120', 
        'PERS-121', 'PERS-122', 'PERS-123', 'PERS-124', 'PERS-125', 
        'PERS-126', 'PERS-127', 'PERS-128', 'PERS-129', 'PERS-130', 
        'PERS-131', 'PERS-132', 'PERS-133', 'PERS-134', 'PERS-135', 
        'PERS-136', 'PERS-137', 'PERS-138', 'PERS-139', 'PERS-140', 
        'PERS-141', 'PERS-142', 'PERS-143', 'PERS-144', 'PERS-145', 
        'PERS-146', 'PERS-147', 'PERS-148', 'PERS-149', 'PERS-150', 
        'PERS-151', 'PERS-152', 'PERS-153', 'PERS-154', 'PERS-155', 
        'PERS-156', 'PERS-157', 'PERS-158', 'PERS-159', 'PERS-160', 
        'PERS-161', 'PERS-162', 'PERS-163', 'PERS-164', 'PERS-165', 
        'PERS-166', 'PERS-167', 'PERS-168', 'PERS-169', 'PERS-170', 
        'PERS-171', 'PERS-172', 'PERS-173', 'PERS-174', 'PERS-175', 
        'PERS-176', 'PERS-177', 'PERS-178', 'PERS-179', 'PERS-180', 
        'PERS-181', 'PERS-182', 'PERS-183', 'PERS-184', 'PERS-185', 
        'PERS-186', 'PERS-187', 'PERS-188', 'PERS-218'
    ]
};

export const personnelRequirements = {
    'PERS-116': { 
        id: 'PERS-116', 
        domainId: 'personnel', 
        title: 'The eligibility and suitability of personnel who have access to Au...', 
        description: 'The eligibility and suitability of personnel who have access to Australian Government people and resources is ensured.' 
    },
    'PERS-117': { 
        id: 'PERS-117', 
        domainId: 'personnel', 
        title: 'The pre-employment screening identity check is conducted for all p...', 
        description: 'The pre-employment screening identity check is conducted for all personnel, to verify identity to at least Level 3 (High) of Assurance of the National Identity Proofing Guidelines.' 
    },
    'PERS-118': { 
        id: 'PERS-118', 
        domainId: 'personnel', 
        title: 'Biographic information in identity documents is verified to ensure...', 
        description: 'Biographic information in identity documents is verified to ensure the information matches the original record.' 
    },
    'PERS-119': { 
        id: 'PERS-119', 
        domainId: 'personnel', 
        title: 'The pre-employment screening eligibility check is conducted for al...', 
        description: 'The pre-employment screening eligibility check is conducted for all personnel, to confirm their eligibility to work in Australia and for the Australian Government.' 
    },
    'PERS-120': { 
        id: 'PERS-120', 
        domainId: 'personnel', 
        title: 'The entity obtains assurance of each person\'s suitability to acces...', 
        description: 'The entity obtains assurance of each person\'s suitability to access Australian Government resources, including their agreement to comply with the government\'s policies, standards, protocols and guidelines that safeguard resources from harm, during pre-employment screening.' 
    },
    'PERS-121': { 
        id: 'PERS-121', 
        domainId: 'personnel', 
        title: 'Prior to granting temporary access to security classified informat...', 
        description: 'Prior to granting temporary access to security classified information or resources, pre-employment checks are completed, and an existing Negative Vetting 1 security clearance is confirmed prior to granting temporary access to TOP SECRET information data or resources.' 
    },
    'PERS-122': { 
        id: 'PERS-122', 
        domainId: 'personnel', 
        title: 'A risk assessment determines whether a person is granted temporary...', 
        description: 'A risk assessment determines whether a person is granted temporary access to security classified information or resources.' 
    },
    'PERS-123': { 
        id: 'PERS-123', 
        domainId: 'personnel', 
        title: 'Temporary access to security classified information, resources and...', 
        description: 'Temporary access to security classified information, resources and activities is supervised.' 
    },
    'PERS-124': { 
        id: 'PERS-124', 
        domainId: 'personnel', 
        title: 'Short-term temporary access to security classified information, re...', 
        description: 'Short-term temporary access to security classified information, resources and activities is limited to the period in which an application for a security clearance is being processed for the particular person, or up to a total combined maximum of three months in a 12-month period for all entities.' 
    },
    'PERS-125': { 
        id: 'PERS-125', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency confirms that the completed security...', 
        description: 'The Authorised Vetting Agency confirms that the completed security clearance pack has been received, and that no initial concerns have been identified for the clearance subject, before short-term temporary access is changed to provisional temporary access.' 
    },
    'PERS-126': { 
        id: 'PERS-126', 
        domainId: 'personnel', 
        title: 'Temporary access to classified caveated information, resources or ...', 
        description: 'Temporary access to classified caveated information, resources or activities is not granted, other than in exceptional circumstances, and only with the approval of the caveat controlling authority.' 
    },
    'PERS-127': { 
        id: 'PERS-127', 
        domainId: 'personnel', 
        title: 'Prior to granting temporary access, the entity obtains an undertak...', 
        description: 'Prior to granting temporary access, the entity obtains an undertaking from the person to protect the security classified information, resources and activities they will access.' 
    },
    'PERS-128': { 
        id: 'PERS-128', 
        domainId: 'personnel', 
        title: 'Prior to granting temporary access, the entity obtains agreement f...', 
        description: 'Prior to granting temporary access, the entity obtains agreement from any other entity (or third party) whose security classified information, resources and activities will be accessed by the person during the temporary access period.' 
    },
    'PERS-129': { 
        id: 'PERS-129', 
        domainId: 'personnel', 
        title: 'Access to official information is facilitated for entity personnel...', 
        description: 'Access to official information is facilitated for entity personnel and other relevant stakeholders.' 
    },
    'PERS-130': { 
        id: 'PERS-130', 
        domainId: 'personnel', 
        title: 'Appropriate access to official information is enabled, including c...', 
        description: 'Appropriate access to official information is enabled, including controlling access (including remote access) to supporting technology systems, networks, infrastructure, devices and applications.' 
    },
    'PERS-131': { 
        id: 'PERS-131', 
        domainId: 'personnel', 
        title: 'Access to security classified information or resources is only giv...', 
        description: 'Access to security classified information or resources is only given to entity personnel with a need-to-know that information.' 
    },
    'PERS-132': { 
        id: 'PERS-132', 
        domainId: 'personnel', 
        title: 'Personnel requiring ongoing access to security classified informat...', 
        description: 'Personnel requiring ongoing access to security classified information or resources are security cleared to the appropriate level.' 
    },
    'PERS-133': { 
        id: 'PERS-133', 
        domainId: 'personnel', 
        title: 'Personnel requiring access to caveated information meet any cleara...', 
        description: 'Personnel requiring access to caveated information meet any clearance and suitability requirements imposed by the originator and caveat controlling authority.' 
    },
    'PERS-134': { 
        id: 'PERS-134', 
        domainId: 'personnel', 
        title: 'A unique user identification, authentication and authorisation pra...', 
        description: 'A unique user identification, authentication and authorisation practice is implemented on each occasion where system access is granted, to manage access to systems holding security classified information.' 
    },
    'PERS-135': { 
        id: 'PERS-135', 
        domainId: 'personnel', 
        title: 'A security risk assessment of the proposed location and work envir...', 
        description: 'A security risk assessment of the proposed location and work environment informs decisions by the Chief Security Officer to allow personnel to work in another government entity\'s facilities in Australia.' 
    },
    'PERS-136': { 
        id: 'PERS-136', 
        domainId: 'personnel', 
        title: 'An agreement is in place to manage the security risks associated w...', 
        description: 'An agreement is in place to manage the security risks associated with personnel working in another government entity\'s facilities in Australia.' 
    },
    'PERS-137': { 
        id: 'PERS-137', 
        domainId: 'personnel', 
        title: 'Approval for remote access to TOP SECRET information, data or syst...', 
        description: 'Approval for remote access to TOP SECRET information, data or systems in international locations outside of facilities meeting PSPF requirements is only granted if approved by the Australian Signals Directorate.' 
    },
    'PERS-138': { 
        id: 'PERS-138', 
        domainId: 'personnel', 
        title: 'A security risk assessment of the proposed location and work envir...', 
        description: 'A security risk assessment of the proposed location and work environment informs decisions to allow personnel to work remotely in international locations.' 
    },
    'PERS-139': { 
        id: 'PERS-139', 
        domainId: 'personnel', 
        title: 'Personnel are not granted approval to work remotely in locations w...', 
        description: 'Personnel are not granted approval to work remotely in locations where Australian Government information, or resources are exposed to extrajudicial directions from a foreign government that conflict with Australian law, unless operationally required, and the residual risks are managed and approved by the Chief Security Officer.' 
    },
    'PERS-140': { 
        id: 'PERS-140', 
        domainId: 'personnel', 
        title: 'The Australian Government Security Vetting Agency (AGSVA) or the T...', 
        description: 'The Australian Government Security Vetting Agency (AGSVA) or the TOP SECRET-Privileged Access Vetting Authority is used to conduct security vetting, or where authorised, the entity conducts security vetting in a manner consistent with the Personnel Security Vetting Process and Australian Government Personnel Security Adjudicative Standard.' 
    },
    'PERS-141': { 
        id: 'PERS-141', 
        domainId: 'personnel', 
        title: 'All vetting personnel attain and maintain the required skills and ...', 
        description: 'All vetting personnel attain and maintain the required skills and competencies for their role.' 
    },
    'PERS-142': { 
        id: 'PERS-142', 
        domainId: 'personnel', 
        title: 'The gaining sponsoring entity establishes new clearance conditions...', 
        description: 'The gaining sponsoring entity establishes new clearance conditions before assuming sponsorship of an existing security clearance that is subject to clearance conditions.' 
    },
    'PERS-143': { 
        id: 'PERS-143', 
        domainId: 'personnel', 
        title: 'The gaining sponsoring entity undertakes the exceptional business ...', 
        description: 'The gaining sponsoring entity undertakes the exceptional business requirement and risk assessment provisions prior to requesting transfer of sponsorship of an existing security clearance that is subject to an eligibility waiver.' 
    },
    'PERS-144': { 
        id: 'PERS-144', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency only issues a security clearance whe...', 
        description: 'The Authorised Vetting Agency only issues a security clearance where the clearance is sponsored by an Australian Government entity or otherwise authorised by the Australian Government.' 
    },
    'PERS-145': { 
        id: 'PERS-145', 
        domainId: 'personnel', 
        title: 'Positions that require a security clearance are identified and the...', 
        description: 'Positions that require a security clearance are identified and the level of clearance required is documented.' 
    },
    'PERS-146': { 
        id: 'PERS-146', 
        domainId: 'personnel', 
        title: 'Each person working in an identified position has a valid security...', 
        description: 'Each person working in an identified position has a valid security clearance issued by the relevant Authorised Vetting Agency.' 
    },
    'PERS-147': { 
        id: 'PERS-147', 
        domainId: 'personnel', 
        title: 'Australian citizenship is confirmed and pre-employment screening i...', 
        description: 'Australian citizenship is confirmed and pre-employment screening is completed before the entity seeks a security clearance for a person in a position identified as requiring a security clearance.' 
    },
    'PERS-148': { 
        id: 'PERS-148', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity establishes an exceptional business need and...', 
        description: 'The Sponsoring Entity establishes an exceptional business need and conducts a risk assessment before a citizenship eligibility waiver is considered for a non-Australian citizen who has a valid visa and work rights to work in an identified position.' 
    },
    'PERS-149': { 
        id: 'PERS-149', 
        domainId: 'personnel', 
        title: 'The Accountable Authority (or the Chief Security Officer if delega...', 
        description: 'The Accountable Authority (or the Chief Security Officer if delegated) approves a citizenship eligibility waiver (after accepting the residual risk of waiving the citizenship requirement for that person, confirming that a checkable background eligibility waiver is not in place), and maintains a record of all citizenship eligibility waivers approved.' 
    },
    'PERS-150': { 
        id: 'PERS-150', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity establishes an exceptional business need and...', 
        description: 'The Sponsoring Entity establishes an exceptional business need and conducts a risk assessment (including seeking advice from the Authorised Vetting Agency), before a checkable background eligibility waiver is considered for a clearance subject assessed as having an uncheckable background.' 
    },
    'PERS-151': { 
        id: 'PERS-151', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity\'s Accountable Authority (or the Chief Securi...', 
        description: 'The Sponsoring Entity\'s Accountable Authority (or the Chief Security Officer if delegated) approves checkable background eligibility waivers (after accepting the residual risk of waiving the checkable background requirement for each person and confirming that a citizenship eligibility waiver is not in place), and maintains a record of all checkable background eligibility waivers approved.' 
    },
    'PERS-152': { 
        id: 'PERS-152', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency provides the Sponsoring Entity with ...', 
        description: 'The Authorised Vetting Agency provides the Sponsoring Entity with information to inform a risk assessment if a clearance subject has an uncheckable background and only issues a clearance if the Accountable Authority waives the checkable background requirement and provides the Authorised Vetting Agency with a copy of the waiver.' 
    },
    'PERS-153': { 
        id: 'PERS-153', 
        domainId: 'personnel', 
        title: 'The clearance subject\'s informed consent is given to collect, use ...', 
        description: 'The clearance subject\'s informed consent is given to collect, use and disclose their personal information for the purposes of assessing and managing their eligibility and suitability to hold a security clearance.' 
    },
    'PERS-154': { 
        id: 'PERS-154', 
        domainId: 'personnel', 
        title: 'The clearance subject\'s eligibility and suitability to hold a Base...', 
        description: 'The clearance subject\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance is assessed by considering their integrity (i.e. the character traits of maturity, trustworthiness, honesty, resilience, tolerance and loyalty) in accordance with the Australian Government Personnel Security Adjudicative Standard.' 
    },
    'PERS-155': { 
        id: 'PERS-155', 
        domainId: 'personnel', 
        title: 'The clearance subject\'s eligibility and suitability to hold a TOP ...', 
        description: 'The clearance subject\'s eligibility and suitability to hold a TOP SECRET-Privileged Access security clearance is assessed in accordance with the TOP SECRET-Privileged Access Standard.' 
    },
    'PERS-156': { 
        id: 'PERS-156', 
        domainId: 'personnel', 
        title: 'The clearance subject\'s eligibility and suitability to hold a Base...', 
        description: 'The clearance subject\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance is assessed by conducting the minimum personnel security checks for the commensurate security clearance level.' 
    },
    'PERS-157': { 
        id: 'PERS-157', 
        domainId: 'personnel', 
        title: 'The clearance subject\'s eligibility and suitability to hold a Base...', 
        description: 'The clearance subject\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance is assessed by resolving any doubt in the national interest.' 
    },
    'PERS-158': { 
        id: 'PERS-158', 
        domainId: 'personnel', 
        title: 'Concerns that are identified during the vetting or security cleara...', 
        description: 'Concerns that are identified during the vetting or security clearance suitability assessment process, that are not sufficient to deny a security clearance and where the related risks can be managed through conditions attached to the security clearance, the Authorised Vetting Agency must: identify the clearance conditions, provide the sponsoring entity with information about the concerns to inform a risk assessment, only issue a conditional security clearance if the Accountable Authority and the clearance subject accept the clearance conditions.' 
    },
    'PERS-159': { 
        id: 'PERS-159', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency provides the sponsoring entity any r...', 
        description: 'The Authorised Vetting Agency provides the sponsoring entity any relevant information of concern, when advising them of the outcome of the security vetting process, to inform the sponsoring entity\'s risk assessment.' 
    },
    'PERS-160': { 
        id: 'PERS-160', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency applies the rules of procedural fair...', 
        description: 'The Authorised Vetting Agency applies the rules of procedural fairness to security clearance decisions that are adverse to a clearance subject, including decisions to deny a security clearance (including grant lower level) or grant a conditional security clearance, without compromising the national interest.' 
    },
    'PERS-161': { 
        id: 'PERS-161', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency reviews the conditions of conditiona...', 
        description: 'The Authorised Vetting Agency reviews the conditions of conditional security clearances annually.' 
    },
    'PERS-162': { 
        id: 'PERS-162', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency reviews the clearance holder\'s eligi...', 
        description: 'The Authorised Vetting Agency reviews the clearance holder\'s eligibility and suitability to hold a security clearance, where concerns are identified (review for cause).' 
    },
    'PERS-163': { 
        id: 'PERS-163', 
        domainId: 'personnel', 
        title: 'The Authorised TOP SECRET-Privileged Access Vetting Agency impleme...', 
        description: 'The Authorised TOP SECRET-Privileged Access Vetting Agency implements the TOP SECRET-Privileged Access Standard in relation to the ongoing assessment and management of personnel with TOP SECRET-Privileged Access security clearances.' 
    },
    'PERS-164': { 
        id: 'PERS-164', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity actively assesses, monitors and manages the ...', 
        description: 'The Sponsoring Entity actively assesses, monitors and manages the ongoing suitability of personnel.' 
    },
    'PERS-165': { 
        id: 'PERS-165', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity monitors and manages compliance with any con...', 
        description: 'The Sponsoring Entity monitors and manages compliance with any conditional security clearance requirements and reports any non-compliance to the Authorised Vetting Agency.' 
    },
    'PERS-166': { 
        id: 'PERS-166', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity monitors and manages compliance with securit...', 
        description: 'The Sponsoring Entity monitors and manages compliance with security clearance maintenance obligations for the clearance holders they sponsor.' 
    },
    'PERS-167': { 
        id: 'PERS-167', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity shares relevant information of concern, wher...', 
        description: 'The Sponsoring Entity shares relevant information of concern, where appropriate.' 
    },
    'PERS-168': { 
        id: 'PERS-168', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity conducts an annual security check with all s...', 
        description: 'The Sponsoring Entity conducts an annual security check with all security cleared personnel.' 
    },
    'PERS-169': { 
        id: 'PERS-169', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity reviews eligibility waivers at least annuall...', 
        description: 'The Sponsoring Entity reviews eligibility waivers at least annually, before revalidation of a security clearance, and prior to any proposed position transfer.' 
    },
    'PERS-170': { 
        id: 'PERS-170', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity monitors, assesses and manages personnel wit...', 
        description: 'The Sponsoring Entity monitors, assesses and manages personnel with TOP SECRET-Privileged access security clearances in accordance with the TOP SECRET-Privileged Access Standard.' 
    },
    'PERS-171': { 
        id: 'PERS-171', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency reassesses a clearance holder\'s elig...', 
        description: 'The Authorised Vetting Agency reassesses a clearance holder\'s eligibility and suitability to hold a security clearance by revalidating minimum personnel security checks for a security clearance.' 
    },
    'PERS-172': { 
        id: 'PERS-172', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency reassesses a clearance holder\'s elig...', 
        description: 'The Authorised Vetting Agency reassesses a clearance holder\'s eligibility and suitability to hold a Baseline, Negative Vetting 1, Negative Vetting 2 or Positive Vetting security clearance by considering their integrity in accordance with the Australian Government Personnel Security Adjudicative Standard.' 
    },
    'PERS-173': { 
        id: 'PERS-173', 
        domainId: 'personnel', 
        title: 'The TOP SECRET-Privileged Access Vetting Authority reassesses a cl...', 
        description: 'The TOP SECRET-Privileged Access Vetting Authority reassesses a clearance holder\'s eligibility and suitability to hold a TOP SECRET-Privileged Access security clearance by assessing their trustworthiness in accordance with the TOP SECRET-Privileged Access Standard.' 
    },
    'PERS-174': { 
        id: 'PERS-174', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency reassesses a clearance holder\'s elig...', 
        description: 'The Authorised Vetting Agency reassesses a clearance holder\'s eligibility and suitability to hold a security clearance by resolving any doubt in the national interest.' 
    },
    'PERS-175': { 
        id: 'PERS-175', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency commences the security clearance rev...', 
        description: 'The Authorised Vetting Agency commences the security clearance revalidation process in sufficient time to complete the revalidation before the due date so that the security clearance does not lapse.' 
    },
    'PERS-176': { 
        id: 'PERS-176', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency shares information of concern about ...', 
        description: 'The Authorised Vetting Agency shares information of concern about security clearance holders with the Sponsoring Entity so they can decide whether to suspend or limit the clearance holder\'s access to Australian Government classified information, resources or activities until the concerns are resolved.' 
    },
    'PERS-177': { 
        id: 'PERS-177', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity shares relevant information of security conc...', 
        description: 'The Sponsoring Entity shares relevant information of security concern, where appropriate with the Authorised Vetting Agency.' 
    },
    'PERS-178': { 
        id: 'PERS-178', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency shares information of security conce...', 
        description: 'The Authorised Vetting Agency shares information of security concern about security clearance holders with the Sponsoring Entity.' 
    },
    'PERS-179': { 
        id: 'PERS-179', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency assesses and responds to information...', 
        description: 'The Authorised Vetting Agency assesses and responds to information of security concern about security clearance holders, including reports from Sponsoring Entities.' 
    },
    'PERS-180': { 
        id: 'PERS-180', 
        domainId: 'personnel', 
        title: 'Negative Vetting 2 and higher clearance holders receive appropriat...', 
        description: 'Negative Vetting 2 and higher clearance holders receive appropriate departmental travel briefings when undertaking international personal and work travel.' 
    },
    'PERS-181': { 
        id: 'PERS-181', 
        domainId: 'personnel', 
        title: 'The Chief Security Officer, Chief Information Security Officer (or...', 
        description: 'The Chief Security Officer, Chief Information Security Officer (or other relevant security practitioner) is advised prior to separation or transfer of any proposed cessation of employment resulting from misconduct or other adverse reasons.' 
    },
    'PERS-182': { 
        id: 'PERS-182', 
        domainId: 'personnel', 
        title: 'Separating personnel are informed of any ongoing security obligati...', 
        description: 'Separating personnel are informed of any ongoing security obligations under the Commonwealth Criminal Code and other relevant legislation and those holding a security clearance or access security classified information are debriefed prior to separation from the entity.' 
    },
    'PERS-183': { 
        id: 'PERS-183', 
        domainId: 'personnel', 
        title: 'Separating personnel transferring to another Australian Government...', 
        description: 'Separating personnel transferring to another Australian Government entity, the entity, when requested, provides the receiving entity with relevant security information, including the outcome of pre-employment screening checks and any periodic employment suitability checks.' 
    },
    'PERS-184': { 
        id: 'PERS-184', 
        domainId: 'personnel', 
        title: 'Separating personnel transferring to another Australian Government...', 
        description: 'Separating personnel transferring to another Australian Government entity, the entity reports any security concerns (as defined in the Australian Security Intelligence Organisation Act 1979) to the Australian Security Intelligence Organisation.' 
    },
    'PERS-185': { 
        id: 'PERS-185', 
        domainId: 'personnel', 
        title: 'A risk assessment is completed to identify any security implicatio...', 
        description: 'A risk assessment is completed to identify any security implications in situations where it is not possible to undertake the required separation procedures.' 
    },
    'PERS-186': { 
        id: 'PERS-186', 
        domainId: 'personnel', 
        title: 'Separating personnel have their access to Australian Government re...', 
        description: 'Separating personnel have their access to Australian Government resources withdrawn upon separation or transfer from the entity, including information, technology systems, and resources.' 
    },
    'PERS-187': { 
        id: 'PERS-187', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity advises the relevant Authorised Vetting Agen...', 
        description: 'The Sponsoring Entity advises the relevant Authorised Vetting Agency of the separation of a clearance holder, including any relevant circumstances (e.g. termination for cause) and any details, if known, of another entity or contracted service provider the clearance holder is transferring to, along with any identified risks or security concerns associated with the separation.' 
    },
    'PERS-188': { 
        id: 'PERS-188', 
        domainId: 'personnel', 
        title: 'The Authorised Vetting Agency manages and records changes in the s...', 
        description: 'The Authorised Vetting Agency manages and records changes in the security clearance status of separating personnel, including a change of Sponsoring Entity, and transfer personal security files where a clearance subject transfers to an entity covered by a different Authorised Vetting Agency, to the extent that their enabling legislation allows.' 
    },
    'PERS-218': { 
        id: 'PERS-218', 
        domainId: 'personnel', 
        title: 'The Sponsoring Entity ensures clearance subjects with an eligibili...', 
        description: 'The Sponsoring Entity ensures clearance subjects with an eligibility waiver or where a waiver is being considered, are not given temporary or provisional access to security classified information or resources until the security vetting process is complete.' 
    }
};
