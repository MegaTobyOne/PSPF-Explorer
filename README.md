# PSPF Explorer

**v2.10** — An offline-first compliance management tool for Australian Government entities tracking obligations under the [Protective Security Policy Framework (PSPF) 2026](https://www.protectivesecurity.gov.au/pspf-annual-release).

This whole thing is an experiment using generative AI, so always verify.  All data is stored locally in your browser. Nothing is sent to any server.

## Features

- **Policy exploration** — browse and search all 218+ PSPF requirements across six domains
- **Compliance tracking** — mark requirements as met, risk-managed, or not applicable with evidence capture and progress history
- **Risk management** — create and track risks with likelihood/impact ratings, linked to requirements and actions
- **Action tracking** — manage remediation and uplift actions with types, statuses, and due dates
- **PSPF Directions** — record instruments and link them to relevant requirements
- **Relationship map** — visualise many-to-many linkages between requirements, risks, actions, and directions
- **Share packages** — export targeted per-domain packages for offline collaboration with merge review on import
- **External capture** — ingest records from GRC platforms via a structured JSON schema with locked-field enforcement
- **Local analytics** — optional, device-only usage tracking with opt-in control in the Help view

## Getting started

1. Open `pspf-explorer.html` in a modern browser (Chrome, Edge, Firefox, Safari)
2. Explore the six PSPF domain cards on the Home page
3. Click into any domain to see its requirements and start tracking compliance
4. Use the Data tab to export a backup regularly


## Data and privacy

- All data lives in `localStorage` under `pspf_state_v2`
- Use **Export All Data** in the Data tab to back up your work as a JSON file
- Use **Import** to restore from a backup or review a share package before merging

## Browser support

Modern evergreen browsers. JavaScript must be enabled.
