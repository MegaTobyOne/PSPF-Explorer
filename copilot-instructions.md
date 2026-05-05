# Copilot Instructions: PSPF Explorer v3

## What this project is

**PSPF Explorer v3** is an offline-first SPA for Australian Government entities tracking compliance with the Protective Security Policy Framework (PSPF) 2025. It runs entirely in the browser — no backend, no telemetry. See [purpose.md](purpose.md) for the authoritative brief and [v3-plan.md](v3-plan.md) for the implementation plan.

## Stack

Lit · Vite · TypeScript (strict) · IndexedDB (idb) · `@vaadin/router` · `@lit/context` + `@preact/signals-core` · Cytoscape.js (Phase 2, lazy). Tests: Vitest (unit, domain layer) + Playwright (E2E).

## Key commands

| Task                      | Command             |
| ------------------------- | ------------------- |
| Dev server (5173)         | `npm run dev`       |
| Production preview (4173) | `npm run preview`   |
| Unit tests (watch)        | `npm run test`      |
| Unit tests (CI)           | `npm run test:run`  |
| E2E tests                 | `npm run test:e2e`  |
| Lint + format check       | `npm run lint`      |
| Typecheck                 | `npm run typecheck` |
| Build                     | `npm run build`     |
| SBOM                      | `npm run sbom`      |

Playwright auto-starts `npm run preview`. CI runs lint → typecheck → unit → build → e2e.

## Architecture

Strict three-layer separation (no file > ~500 LOC in `domain/` or `views/`):

- `src/data/` — IndexedDB adapter (idb), schema, migrations, store CRUD, backup/restore.
- `src/domain/` — pure TypeScript over typed records. No DOM, no idb. **Vitest-tested**.
- `src/views/` and `src/components/` — Lit elements. Tested via Playwright E2E only.
- `src/pspf/` — static, read-only PSPF 2025 data (218 requirements, 6 domains).
- `src/state/` — `@lit/context` Contexts and `@preact/signals-core` signals.
- `src/workers/` — Web Workers (e.g. integrity diagnostics).

## Conventions

- **AU English** in all user-facing copy: "organisation", "-ise" spellings.
- **TypeScript strict**, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` in domain/data layers.
- **Branded ID types** (`RequirementId`, `RiskId`, etc.) in `src/data/types.ts`.
- **Hash routing** (`#/route`) via `@vaadin/router` for GitHub Pages compatibility.
- **No global CSS utility classes**; design tokens live in a shared `css` sheet adopted by every component.
- **Path aliases**: `@data/*`, `@domain/*`, `@views/*`, `@components/*`, `@pspf/*`, `@state/*`.
- **No runtime network calls.** No CDN, no fonts, no analytics.
- **Strict CSP** enforced via meta tag in `index.html`. Avoid patterns that would require relaxing it.
- **No `innerHTML` of user content.** Use Lit templates.

## Data model

- Database: `pspf-explorer.v3` (IndexedDB). Stores: `compliance`, `risks`, `actions`, `tags`, `savedViews`, `workTracking`, `posture`, `directions`, `relationships`, `meta`.
- Schema id for export envelopes: `pspf-explorer.v3` (schemaVersion: integer).
- Forward-only migrations in `src/data/db.ts`.
- All writes go through `runInTx(...)` — no partial envelopes.

## Compliance status values

`yes` | `no` | `risk-managed` | `not-applicable` | `not-set`

## Testing

- Unit tests (`*.test.ts` in `src/`): cover the **domain layer** only. Vitest, node env. Coverage gate: ≥60% by Phase 1, ≥80% by Phase 2.
- E2E tests (`tests/e2e/*.spec.ts`): cover user journeys. Each spec ends with an `@axe-core/playwright` assertion (zero serious/critical).
- Do not unit-test Lit components directly.

## What not to do

- Do not migrate v2 data. Clean start.
- Do not add runtime dependencies without a justification entry in [v3-plan.md](v3-plan.md) §17.
- Do not edit anything under `archive/v2/`. It exists for reference only.
- Do not relax CSP without a tracked rationale.
- Do not add docstrings or comments to code you did not change.
