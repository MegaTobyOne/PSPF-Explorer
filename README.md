# PSPF Explorer

PSPF Explorer is an offline-first web app for tracking your organisation's implementation of the Australian Government [Protective Security Policy Framework (PSPF) 2025](https://www.protectivesecurity.gov.au/pspf-annual-release).

It covers all 218 requirements across six domains: Governance, Information, Personnel, Physical, Risk, and Technology.

## What you can do

- Browse requirements by domain and open full requirement detail.
- Search across requirements, compliance notes, evidence, Directions, risks, and actions.
- Record implementation status with evidence and notes.
- Track risks, actions, Directions, and cross-entity relationships.
- Use the relationship map to see how compliance gaps connect to logged work, risks, actions, and
  Directions. The map uses recognisable shapes (hexagon for requirements, triangle for risks,
  rounded rectangle for actions, tag for Directions), supports filtering by compliance state,
  risk band, action status and Direction response, switchable layouts (force-directed, hierarchy,
  concentric, grid), node search, hover tooltips, full-chain highlighting, and `?focus=node-id`
  deep links. Switch to **Board** mode for a column view (Compliance gaps · Risks · Actions ·
  Directions) when a force-directed graph is more network than you need.
- Save filtered views for repeat reporting.
- Use coverage and analytics views to monitor progress. The Coverage matrix's _Fully
  implemented %_ column excludes Not&nbsp;applicable requirements from the calculation so they
  don't drag the rating down.
- Copy human-readable summaries and export/restore local data with JSON files.

## Status labels

- Fully implemented
- Not yet implemented
- Risk-managed
- Not applicable
- Not set

## Data and privacy

- Your data stays in your browser (IndexedDB on your device).
- No telemetry.
- No runtime dependence on external services after the app is loaded.

## Access

- Live site: [https://megatobyone.github.io/PSPF-Explorer/](https://megatobyone.github.io/PSPF-Explorer/)

## Security marking

- Default handling context: OFFICIAL: Sensitive
- Traffic Light Protocol: TLP:AMBER+STRICT

See [SECURITY.md](SECURITY.md) for security notes.

## Release validation

Before publishing, run the checklist in [docs/release-checklist.md](docs/release-checklist.md).
