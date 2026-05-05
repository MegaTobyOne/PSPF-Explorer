/**
 * PSPF Explorer - Domain Index
 * Exports all domain data and requirements for easy importing
 */

export { governanceDomain, governanceRequirements } from './governance.js';
export { riskDomain, riskRequirements } from './risk.js';
export { informationDomain, informationRequirements } from './information.js';
export { technologyDomain, technologyRequirements, essentialEightControls } from './technology.js';
export { personnelDomain, personnelRequirements } from './personnel.js';
export { physicalDomain, physicalRequirements } from './physical.js';

// Convenience function to get all domains as an array
export function getAllDomains() {
    return [
        governanceDomain,
        riskDomain,
        informationDomain,
        technologyDomain,
        personnelDomain,
        physicalDomain
    ];
}

// Convenience function to get all requirements as a single object
export function getAllRequirements() {
    return {
        ...governanceRequirements,
        ...riskRequirements,
        ...informationRequirements,
        ...technologyRequirements,
        ...personnelRequirements,
        ...physicalRequirements
    };
}

// Import all for use in single import statement
import { governanceDomain, governanceRequirements } from './governance.js';
import { riskDomain, riskRequirements } from './risk.js';
import { informationDomain, informationRequirements } from './information.js';
import { technologyDomain, technologyRequirements, essentialEightControls } from './technology.js';
import { personnelDomain, personnelRequirements } from './personnel.js';
import { physicalDomain, physicalRequirements } from './physical.js';

// Default export with all data
export default {
    domains: [
        governanceDomain,
        riskDomain,
        informationDomain,
        technologyDomain,
        personnelDomain,
        physicalDomain
    ],
    requirements: {
        ...governanceRequirements,
        ...riskRequirements,
        ...informationRequirements,
        ...technologyRequirements,
        ...personnelRequirements,
        ...physicalRequirements
    },
    essentialEightControls
};
