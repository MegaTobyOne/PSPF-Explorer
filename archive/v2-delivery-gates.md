# PSPF Explorer v2 Delivery Gates

This checklist operationalises the v2 staged delivery plan. All seven stages are complete as of **v2.10 (May 2026)**.

## Global Gate Rules

1. Must be deployed to production and accessible to users.
2. Must keep all prior-stage automated tests passing.
3. Must include new tests for the changed workflow paths.
4. Must preserve offline persistence and restore behaviour.
5. Must include explicit mobile capability labelling:
   - Mobile-supported workflows are completeable on 360 px width.
   - Desktop-only workflows show clear handoff messaging on mobile.

## Stage 1 Gate: Foundation and Explorer ✅ COMPLETE

1. ✅ App shell, domain browsing, and search are stable.
2. ✅ Local persistence and full backup/restore work offline (v2 envelope, export/import, migration layer).
3. ✅ Smoke tests pass for navigation and basic data load (Playwright e2e suite).
4. ✅ Mobile capability gating in place — desktop-only actions blocked and labelled on mobile.
5. ✅ Production deployment — available via GitHub Pages.

## Stage 2 Gate: Compliance and Evidence ✅ COMPLETE

1. ✅ Compliance state updates persist reliably (`updateCompliance` → `saveData` → `pspf_state_v2` envelope; history and domain snapshots recorded).
2. ✅ Evidence capture fields validate before commit (`save-evidence-record` requires note or URL; `importData` sanitises and validates `evidenceRecords`).
3. ✅ Reporting surfaces evidence readiness per-requirement via next-steps hints (flags when no evidence records exist; flags stale or missing review).
4. ✅ Integration tests cover invalid-state prevention and persistence (37 unit tests: compliance CRUD, evidence CRUD, review workflow, sanitisation, import validation, integrity diagnostics).

## Stage 3 Gate: Risks, Actions, and Linkage ✅ COMPLETE

1. ✅ Directions as first-class records (id, title, instrument number, issuedAt, description, linked requirements) with create/edit/delete flows.
2. ✅ Standalone Action records (id, title, type, status, dueDate, description) with create/edit/delete flows and six action types.
3. ✅ Risks promoted to standalone records with optional project association and full CRUD.
4. ✅ Requirement → Direction, Requirement → Risk, Risk → Action linkage CRUD using the `relationships` array.
5. ✅ Relationship integrity checks prevent orphans, duplicate links, and invalid loops (surfaced in Data view diagnostics).
6. ✅ Tests cover linked-record update behaviour and regression paths.

## Stage 4 Gate: Relationship Map and Impact Visibility ✅ COMPLETE

1. ✅ Map rendering is stable for real-scale datasets; canvas-based force-directed layout.
2. ✅ Requirement selection highlights linked nodes and dims non-linked nodes.
3. ✅ Drill-through opens source records (requirements, risks, actions, directions, projects) correctly.
4. ✅ Mobile provides a clear desktop-handoff notice; map is desktop/tablet-only.
5. ✅ Unit and e2e tests cover domain summary, heatmap, and navigation to map view.

## Stage 5 Gate: Offline Sharing and Targeted Exchange ✅ COMPLETE

1. ✅ Targeted export packages (per-domain share packages) include all dependent records and are dependency-safe.
2. ✅ Import staging validates schema, version, and integrity before any data is committed.
3. ✅ Merge review modal presents a diff table, conflict expander, and three strategy options (`merge-incoming`, `merge-keep-mine`, `replace-all`).
4. ✅ Merge outcomes are idempotent; import history is recorded and surfaced in the Data view.
5. ✅ Advanced merge tooling is desktop/tablet-only with a mobile handoff notice.
6. ✅ Tests cover `computeImportDiff`, all three `applyMerge` strategies, `recordImportBatch`, and `buildSharePackage`.

## Stage 6 Gate: Integration and External Capture ✅ COMPLETE

1. ✅ External ingest path is bounded and read-safe; accepts `pspf-explorer-external.v1` schema files only.
2. ✅ Source lineage (`_externalSource`) is stamped on all ingested records and preserved through sanitisation and import flows.
3. ✅ Locked-field rules for external records (`EXTERNAL_LOCKED_FIELDS`) are enforced in edit modals and save methods; locked inputs are visually and semantically disabled.
4. ✅ External badges (`🔗 External`) are shown in risk, action, and direction card views.
5. ✅ Tests verify `validateExternalCapture`, `applyExternalCapture` (new records + re-ingest update), `isExternalRecord`, `isFieldLocked`, and locked-field preservation in `saveRisk`.

## Stage 7 Gate: Hardening and Release Maturity ✅ COMPLETE

1. ✅ Critical accessibility checks pass on supported workflows: `aria-current="page"` set on active nav button at startup; all modals have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`; compliance status buttons have `aria-pressed`; dedicated `accessibility.spec.mjs` e2e suite.
2. ✅ Privacy-preserving analytics controls are user-visible and optional: opt-in toggle in the Help view; all counts stored in `pspf_analytics_data` (localStorage only, no external calls); `renderAnalyticsPanel` shows per-view visit counts and activity counters; reset available.
3. ✅ CI gates are reliable for both unit tests and e2e tests: `unit-tests.yml` workflow runs `npm test` on push/PR to main; `playwright.yml` runs e2e suite independently.
4. ✅ Additional e2e coverage added for: compliance persistence across reload, full data export download, analytics opt-in/opt-out/reset flows.
5. ✅ All 70 unit tests pass; no regressions introduced across stages.

## Release Summary — v2.10

| Stage | Delivered |
|---|---|
| 1 | Foundation, explorer, mobile gating, persistence |
| 2 | Compliance tracking, evidence capture, review workflow |
| 3 | Directions, actions, standalone risks, explicit linkage |
| 4 | Relationship map, impact drill-through |
| 5 | Share packages, staged import, merge review |
| 6 | External capture, source lineage, locked-field enforcement |
| 7 | Accessibility hardening, local analytics, CI unit-test gate |

**Test coverage**: 70 unit tests + Playwright e2e suite (navigation, layout, compliance, accessibility, work-tracking, smoke)

## Quality Commands

```
npm test          # unit tests (Node built-in runner + jsdom)
npm run test:e2e  # Playwright e2e tests (auto-starts dev server)
npm run serve     # dev server on port 4173
```
