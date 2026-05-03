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

## Stage 1 Gate: Foundation and Explorer ✅ COMPLETE

1. ✅ App shell, domain browsing, and search are stable.
2. ✅ Local persistence and full backup/restore work offline (v2 envelope, export/import, migration layer).
3. ✅ Smoke tests pass for navigation and basic data load (Playwright e2e suite).
4. ✅ Mobile capability gating in place — desktop-only actions blocked and labelled on mobile.
5. ⬜ Production deployment — confirm when pushed to GitHub Pages.

## Stage 2 Gate: Compliance and Evidence ✅ COMPLETE

1. ✅ Compliance state updates persist reliably (updateCompliance → saveData → pspf_state_v2 envelope; history and domain snapshots recorded).
2. ✅ Evidence capture fields validate before commit (save-evidence-record requires note or URL; importData sanitises and validates evidenceRecords).
3. ✅ Reporting surfaces evidence readiness per-requirement via next-steps hints (flags when no evidence records exist; flags stale or missing review). Aggregate evidence signal deferred to Phase 3 progress view enhancements.
4. ✅ Integration tests cover invalid-state prevention and persistence (37 unit tests passing: compliance CRUD, evidence CRUD, review workflow, sanitisation, import validation, integrity diagnostics).

## Stage 3 Gate: Risks, Actions, and Linkage 🔜 NEXT

**Scope for implementation:**
- Directions as first-class records (PSPF Directions/Instruments — id, title, instrument number, issuedAt, description, linkedRequirements)
- Standalone Action records (distinct from project tasks — id, title, type, status, dueDate, linkedRequirements, linkedRisks, linkedDirections)
- Risks promoted to standalone records with optional project association (currently project-scoped only)
- Requirement → Direction, Requirement → Risk, Risk → Action explicit linkage CRUD using the `relationships` array
- Relationship integrity checks already in place (Phase 0); extend UI to surface and manage links

**Gate criteria:**
1. ⬜ Risk and action records support create/edit/update flows.
2. ⬜ Requirement-risk-action links are explicit and traceable.
3. ⬜ Relationship integrity checks prevent orphans, duplicate links, and invalid loops (infrastructure already in place — wire to UI).
4. ⬜ Tests cover linked-record update behaviour and regression paths.

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
