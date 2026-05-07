# PSPF Explorer

PSPF Explorer is an offline-first web app for tracking your organisation's implementation of the Australian Government [Protective Security Policy Framework (PSPF) 2025](https://www.protectivesecurity.gov.au/pspf-annual-release).

It covers all 218 requirements across six domains: Governance, Information, Personnel, Physical, Risk, and Technology.

## What you can do

- Browse requirements by domain and open full requirement detail.
- Search across requirements, compliance notes, evidence, Directions, risks, and actions.
- Record implementation status with evidence and notes.
- Track risks, actions, Directions, and cross-entity relationships.
- Search, filter, sort, paginate, and bulk-manage long risk and action lists, with list settings
  remembered between visits and selections kept for the current browser session.
- Use the relationship map to see how compliance gaps connect to logged work, risks, actions, and
  Directions. The map uses recognisable shapes (hexagon for requirements, triangle for risks,
  rounded rectangle for actions, tag for Directions), supports filtering by compliance state,
  risk band, action status and Direction response, switchable layouts (force-directed, hierarchy,
  concentric, grid), node search, hover tooltips, full-chain highlighting, and `?focus=node-id`
  deep links. Switch to **Board** mode for a column view (Compliance gaps · Risks · Actions ·
  Directions) when a force-directed graph is more network than you need. The board draws
  curved connection lines between linked items across columns; click a card to focus its
  related items (everything else fades), and Ctrl/Cmd-click to extend the focus to multiple
  cards at once.
- Save filtered views for repeat reporting.
- Use coverage and analytics views to monitor progress. The Coverage matrix's _Fully
  implemented %_ column excludes Not&nbsp;applicable requirements from the calculation so they
  don't drag the rating down. Analytics, Coverage, and Home now also surface an Essential Eight
  indicator focused on TECH-099 to TECH-106, with TECH-107 shown as the catchall status, plus
  Directions response coverage so open Directions are visible outside the register.
- Import risk and action JSON with review-before-apply planning, status alias mapping, optional
  forced statuses, link clean-up/rebuild, inline pre-apply editing, and bidirectional link
  rebuild controls.
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
