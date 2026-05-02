# PSPF Explorer v2.0

## Purpose
Build on the original PSPF Explorer with a clearer, more trusted, and more useful experience that helps teams manage real PSPF work.
https://github.com/MegaTobyOne/PSPF-Explorer.git

## Prompt

You are an expert in product strategy, software architecture, and user experience for secure, high-trust web applications.

Design PSPF Explorer v2.0 as an offline-first tool that helps Australian Government teams understand, manage, and evidence their protective security posture under the PSPF.

### Context

- The authoritative PSPF source is protectivesecurity.gov.au.
- The product must stay aligned to annual PSPF releases and ad hoc instruments such as Directions.
- The product is designed for one user at a time, with a single user role.
- The user always comes first; workflows should optimise for clarity, confidence, and control.
- Compliance and risk should be treated as one connected workflow.
- The product should support practical execution, not just policy reference.

### Outcomes

- Make PSPF obligations easier to interpret and apply.
- Improve visibility of compliance status, risk exposure, and progress.
- Show how actions improve both compliance and risk posture.
- Strengthen evidence quality and audit readiness.
- Reduce friction in annual reporting and internal collaboration.
- Deliver a shipped product that is deployed, available, and ready for real use.

### Capability Pillars

- Policy exploration, search, and discovery across PSPF content.
- Compliance tracking with evidence capture.
- Risk management, including user-managed risk records and optional risk capture from a GRC platform via the integration module.
- Explicit linkage between requirements, Directions, risks, and actions.
- Action tracking for remediation and uplift work across different action types.
- Relationship visualisation that makes many-to-many linkages clear and useful.
- Data portability through full backup/restore and targeted sharing.
- Offline collaboration through portable data exchange with controlled merge and review.
- Tagging and saved views for flexible organisation, triage, and reporting.

### Relationship Map Intent

Provide a visually engaging relationship map that helps users understand linkage and impact quickly.

- Show requirements, Directions, risks, and actions as connected cards with clear visual pathways.
- Selecting one or more requirement cards should highlight linked risks and actions.
- This view is read-only for relationship editing; it is for understanding, triage, and fast navigation.
- Double-clicking a card should open the source record for immediate update.
- Allow curated visual exports for briefings and wider communication.

### Principles

- Keep it simple, clear, and useful.
- Optimise for responsiveness so the user never feels like they are waiting and always feels in control.
- Keep relationships explicit: requirement -> risk -> action -> outcome.
- Prefer practical, evidence-based indicators over abstract complexity.
- Keep users in control of merge and conflict decisions.
- Design for accessibility, inclusiveness, security, and privacy by default.
- Maintain flexibility so the solution can evolve with policy and organisational practice.

### Data Integrity and Safety

- Treat integrity, auditability, and traceability as first-class concerns.
- Validate before commit and fail safely with clear guidance.
- Prevent invalid, orphaned, duplicate, or circular relationships where they do not make business sense.
- Make imports and merges idempotent and reviewable.
- Preserve source lineage for externally captured records.
- Retain user data locally for the long term unless the user explicitly removes it.
- Surface anomalies clearly rather than silently accepting them.

### Delivery, Quality, and Measurement

- Use lightweight automated quality gates for pull requests and releases.
- Prioritise automated tests for high-risk workflows: linkage integrity, import/merge, offline persistence, and critical navigation paths.
- Use controlled, traceable deployment via GitHub workflows with straightforward rollback.
- Assume a simple delivery flow: local development -> merge/automation -> production deployment, with no lower environments.
- Use simple, privacy-preserving analytics to understand feature adoption and drop-off.
- Measure product behaviour, not sensitive content, with explicit user controls.

### Operating Assumptions

- Assume modest scale: no more than about 300 requirements and no more than about 20 linked items per record.
- Do not over-optimise for high-volume or enterprise-scale complexity.
- Support modern evergreen browsers only; no legacy browser support is required.
- The modest scale should allow consistently high responsiveness across core workflows and visualisations.

### Execution Constraints

- Prioritise core integrity, usability, and shipped value before advanced embellishment.
- Any PSPF structural or policy assumption should be checked against protectivesecurity.gov.au and flagged if uncertain.
- Treat "done" as deployed and available to users in production, not merely coded or locally complete.
- Prefer direct, maintainable solutions over speculative architecture.

### Delivery Stages

Deliver in small, production-ready stages, with each stage providing usable value and expanding test coverage.

1. **Foundation and Explorer**
	Establish the app shell, PSPF content model, browsing, search, local persistence, and full backup/restore.
	Testing focus: baseline unit tests, smoke tests for core navigation, and regression checks on persistence and basic data loading.

2. **Compliance and Evidence**
	Add compliance tracking, evidence capture, review workflows, and early reporting views.
	Testing focus: expand integration tests around record updates, validation rules, and evidence persistence; keep earlier tests running on every change.

3. **Risks, Actions, and Linkage**
	Add user-managed risks, actions, and explicit requirement-risk-action relationships.
	Testing focus: strengthen coverage for relationship integrity, loop prevention, update behaviour, and regression protection across linked records.

4. **Relationship Map and Impact Visibility**
	Add the visual relationship map, interaction highlighting, and drill-through behaviour.
	Testing focus: add targeted UI and end-to-end checks for navigation, highlighting, and stable rendering of linked data.

5. **Offline Sharing and Targeted Exchange**
	Add targeted import/export, merge review, and controlled offline collaboration.
	Testing focus: deepen integration and end-to-end coverage for import/export, conflict handling, idempotency, and rollback-safe behaviour.

6. **Integration and External Capture**
	Add the optional integration module for read-only capture from external systems such as a GRC platform.
	Testing focus: validate ingestion boundaries, lineage preservation, error handling, and regression safety when external records are introduced.

7. **Hardening and Release Maturity**
	Finalise accessibility, analytics, deployment confidence, UX polish, and production hardening.
	Testing focus: consolidate the regression suite, improve reliability of critical-path end-to-end tests, and ensure tests run frequently enough to catch issues early in local development, pull requests, and release automation.

Across all stages, update and improve the automated test suite continuously. Tests should run often and early so regressions, integrity issues, and usability breakages are identified and fixed before release.

### Output Expectations

When proposing solutions, prioritise:

- strong conceptual model,
- clear rationale and trade-offs,
- maintainable implementation direction,
- practical phased delivery,
- and a clear path to production release.

Avoid unnecessary over-specification unless needed to manage risk.
