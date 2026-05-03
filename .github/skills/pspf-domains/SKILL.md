---
name: pspf-domains
description: "Domain knowledge for PSPF Explorer's six security domain modules. Use when: adding or modifying PSPF requirements, editing domain data in scripts/domains/, understanding requirement ID ranges, working with domain structure, adding Essential Eight controls, or checking which requirements belong to which PSPF domain."
argument-hint: 'Optional: domain name (governance, risk, information, technology, personnel, physical) or requirement ID'
---

# PSPF Domains

Reference for the six PSPF security domain modules in `scripts/domains/`.

## Domain Overview

| Domain | File | `id` | Requirement prefix | ID range | Count |
|--------|------|------|--------------------|----------|-------|
| Governance | `governance.js` | `governance` | `GOV-` | GOV-001–GOV-035 | 35 |
| Risk Management | `risk.js` | `risk` | `RISK-` | RISK-036–RISK-057 | 22 |
| Information Security | `information.js` | `information` | `INFO-` | INFO-058–INFO-083, INFO-211 | 27 |
| Technology Security | `technology.js` | `technology` | `TECH-` | TECH-084–TECH-115, TECH-212–TECH-217 | 38 |
| Personnel Security | `personnel.js` | `personnel` | `PERS-` | PERS-116–PERS-188, PERS-218 | 74 |
| Physical Security | `physical.js` | `physical` | `PHYS-` | PHYS-189–PHYS-210 | 22 |

**Total: ~218 requirements.** ID numbering is non-contiguous because some IDs were reserved or added in later PSPF releases (suffixed 200+).

## Data Structures

### Domain object
```js
export const governanceDomain = {
    id: 'governance',           // matches domains/index.js aggregation key
    title: 'Governance',        // display name
    description: 'Security governance, accountability, and leadership...',
    requirements: ['GOV-001', 'GOV-002', ...]  // ordered array of requirement IDs
};
```

### Requirement object
```js
const requirements = {
    'GOV-001': {
        id: 'GOV-001',
        domainId: 'governance',   // must match parent domain's id
        title: 'Accountable authority must...',
        description: 'Full normative text from PSPF 2025...',
        tags: []                  // optional; governance.js uses this field; others omit it
    }
};
export const governanceRequirements = requirements;
```

### Special export: `essentialEightControls` (technology.js only)
```js
export const essentialEightControls = [
    { id: 'TECH-103', label: 'Application control' },
    { id: 'TECH-099', label: 'Patch applications' },
    // ... 8 entries total
];
```
This array maps the ASD Essential Eight to their corresponding TECH requirement IDs. Import via `scripts/domains/index.js` default export.

## Aggregation (index.js)

`scripts/domains/index.js` provides three access patterns:

```js
// Named exports (tree-shakeable)
import { governanceDomain, governanceRequirements } from './domains/index.js';

// Utility functions
import { getAllDomains, getAllRequirements } from './domains/index.js';

// Default export (all data in one object)
import PSPFDomainsData from './domains/index.js';
// PSPFDomainsData.domains     → array of 6 domain objects
// PSPFDomainsData.requirements → flat object of all ~218 requirements keyed by ID
// PSPFDomainsData.essentialEightControls → array of 8 E8 entries
```

In `main.js` the data is loaded via dynamic import and stored on the app instance as `this.PSPFDomainsData`.

## Test Environment

When `NODE_ENV=test`, domain data is **mocked with empty arrays/objects** to keep unit tests fast and isolated. Domain-specific tests in `scripts/tests/data.test.js` explicitly supply fixture data. Do not rely on live domain data in unit tests.

## How to Add a Requirement

1. Open the appropriate domain file (e.g. `scripts/domains/governance.js`).
2. Add an entry to the `requirements` object:
   ```js
   'GOV-036': {
       id: 'GOV-036',
       domainId: 'governance',
       title: 'Short normative title',
       description: 'Full text from PSPF 2025 policy document...'
   }
   ```
3. Append the ID string to the domain object's `requirements` array:
   ```js
   export const governanceDomain = {
       ...
       requirements: ['GOV-001', ..., 'GOV-035', 'GOV-036']
   };
   ```
4. Run `npm test` to confirm no regressions.
5. If the requirement maps to an Essential Eight control, also update `essentialEightControls` in `technology.js`.

## How to Add a Domain

Only needed if PSPF adds a new policy area. Steps:
1. Create `scripts/domains/<name>.js` following the existing module pattern.
2. Choose a new prefix (e.g. `NEW-`) and start IDs after the current highest (219+).
3. Export `<name>Domain` and `<name>Requirements` as named exports.
4. Add both to `scripts/domains/index.js` named exports, `getAllDomains()` array, `getAllRequirements()` spread, and default export.
5. Run `npm test`.

## Conventions

- **AU English** in all `title` and `description` text (e.g. "organisation", "authorise", "recognised").
- **Normative text** in `description` should reflect PSPF 2025 release language verbatim where possible.
- **`domainId`** must exactly match the parent domain's `id` string — this is used for filtering and grouping throughout `main.js`.
- **ID gaps are intentional** — do not renumber existing requirements; always append with a new sequential ID.
- **`tags` field** is optional. Governance uses it; other domains currently omit it. Add when tagging is needed for a domain.
