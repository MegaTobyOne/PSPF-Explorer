# PSPF Explorer v2.0 Delivery Gates

This checklist operationalises the v2.0 staged plan so each stage is only considered complete when it is deployed, available, and covered by automated checks.

## Global Gate Rules

1. Must be deployed to production and accessible to users.
2. Must keep all prior-stage automated tests passing.
3. Must include new tests for the changed workflow paths.
4. Must preserve offline persistence and restore behavior.
5. Must include explicit mobile capability labeling:
- Mobile-supported workflows are completeable on 360px width.
- Desktop-only workflows show clear handoff messaging on mobile.

## Stage 1 Gate: Foundation and Explorer

1. App shell, domain browsing, and search are stable.
2. Local persistence and full backup/restore work offline.
3. Smoke tests pass for navigation and basic data load.

## Stage 2 Gate: Compliance and Evidence

1. Compliance state updates persist reliably.
2. Evidence capture fields validate before commit.
3. Reporting surfaces evidence readiness without exposing sensitive content.
4. Integration tests cover invalid-state prevention and persistence.

## Stage 3 Gate: Risks, Actions, and Linkage

1. Risk and action records support create/edit/update flows.
2. Requirement-risk-action links are explicit and traceable.
3. Relationship integrity checks prevent orphans, duplicate links, and invalid loops.
4. Tests cover linked-record update behavior and regression paths.

## Stage 4 Gate: Relationship Map and Impact Visibility

1. Map rendering is stable for modest-scale datasets.
2. Requirement selection highlights linked nodes and dims non-linked nodes.
3. Drill-through opens source records correctly.
4. Mobile provides condensed impact summary and clear desktop handoff.

## Stage 5 Gate: Offline Sharing and Targeted Exchange

1. Targeted export packages are dependency-safe.
2. Import staging validates before commit.
3. Merge outcomes are idempotent and reviewable.
4. Advanced merge tooling remains desktop/tablet-only unless explicitly promoted.

## Stage 6 Gate: Integration and External Capture

1. External ingest path is bounded and read-safe.
2. Source lineage is preserved on all imported records.
3. Locked-field rules for external records are enforced.
4. Regression tests verify mixed local and external record safety.

## Stage 7 Gate: Hardening and Release Maturity

1. Critical accessibility checks pass on supported workflows.
2. Privacy-preserving analytics controls are user-visible and optional.
3. CI gates are reliable for unit tests and end-to-end tests.
4. Rollback procedure is documented and verified.

## Quality Commands

- Unit tests: `npm test`
- End-to-end tests: `npm run test:e2e`
- Local serve: `npm run serve`
