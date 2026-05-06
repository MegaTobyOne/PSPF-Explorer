# Copilot Instructions: PSPF Explorer v3

## What this project is

**PSPF Explorer v3** is an offline-first SPA for Australian Government entities tracking compliance with the Protective Security Policy Framework (PSPF) 2025. It runs entirely in the browser — no backend, no telemetry. See [purpose.md](purpose.md) for the authoritative brief and [v3-plan.md](v3-plan.md) for the implementation plan.

## Stack

Lit · Vite · TypeScript (strict) · IndexedDB (idb) · custom hash router (`src/app/router.ts`) · `@lit/context` + `@preact/signals-core` · Cytoscape.js (lazy relationship map). Tests: Vitest (unit: domain/data/state) + Playwright (E2E).

## Key commands

| Task                      | Command               |
| ------------------------- | --------------------- |
| Dev server (5173)         | `npm run dev`         |
| Production preview (4173) | `npm run preview`     |
| Unit tests (watch)        | `npm run test`        |
| Unit tests (CI)           | `npm run test:run`    |
| E2E tests                 | `npm run test:e2e`    |
| Lint + format check       | `npm run lint`        |
| Auto-fix formatting       | `npm run format`      |
| Typecheck                 | `npm run typecheck`   |
| Build                     | `npm run build`       |
| Performance budget        | `npm run perf:budget` |
| SBOM                      | `npm run sbom`        |

Playwright builds with `PSPF_BASE=/` and auto-starts `npm run preview`. CI runs lint → typecheck → unit coverage → build → performance budget → e2e.

> **Before every commit**, run `npm run format` (Prettier) then `npm run lint` to ensure the code passes the CI format check. `npm run lint` is `eslint . && prettier --check .` — both must pass.

## Architecture

Strict three-layer separation (no file > ~500 LOC in `domain/` or `views/`):

- `src/data/` — IndexedDB adapter (idb), schema, migrations, store CRUD, backup/restore.
- `src/domain/` — pure TypeScript over typed records. No DOM, no idb. **Vitest-tested**.
- `src/views/` and `src/components/` — Lit elements. Tested via Playwright E2E only.
- `src/pspf/` — static, read-only PSPF 2025 data (218 requirements, 6 domains). Use `.github/skills/pspf-domains/SKILL.md` for domain ranges and Essential Eight context.
- `src/state/` — `@lit/context` Contexts and `@preact/signals-core` signals.
- `src/workers/` — Web Workers (e.g. integrity diagnostics).

## Conventions

- **AU English** in all user-facing copy: "organisation", "-ise" spellings.
- **TypeScript strict**, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`. No `any` in domain/data layers.
- **Lit decorators require current TS settings**: keep `experimentalDecorators: true` paired with `useDefineForClassFields: false` or `@consume`/`@property` accessors can be shadowed by class-field initialisers.
- **Branded ID types** (`RequirementId`, `RiskId`, etc.) in `src/data/types.ts`.
- **Hash routing** (`#/route`) via the local `HashRouter`; do not reintroduce `@vaadin/router`.
- **No global CSS utility classes**; design tokens live in a shared `css` sheet adopted by every component.
- **Path aliases**: `@data/*`, `@domain/*`, `@views/*`, `@components/*`, `@pspf/*`, `@state/*`.
- **No runtime network calls.** No CDN, no fonts, no analytics.
- **Strict CSP** enforced via meta tag in `index.html`. Avoid patterns that would require relaxing it.
- **No `innerHTML` of user content.** Use Lit templates.

## Current lessons learned

- `@consume({ subscribe: true })` only reacts when the context value reference changes. For signal-backed stores, pair consumed stores with `new SignalWatcher(this, () => [...signals])`; the controller re-binds when async-injected stores appear.
- Avoid `<select .value=${x}>` for option lists rendered in the same template. Lit can set `.value` before children exist on initial render, leaving the first option selected. Prefer `?selected=${option === current}` on each `<option>` when touching select controls.
- In `pspf-app`, avoid `@query('#outlet')` during first router startup; use `this.renderRoot.querySelector('#outlet')` after render.

## Data model

- Database: `pspf-explorer.v3` (IndexedDB). Stores: `compliance`, `risks`, `actions`, `tags`, `savedViews`, `workTracking`, `posture`, `directions`, `relationships`, `meta`.
- Schema id for export envelopes: `pspf-explorer.v3` (schemaVersion: integer).
- Forward-only migrations in `src/data/db.ts`.
- All writes go through `runInTx(...)` — no partial envelopes.

## Compliance status values

`yes` | `no` | `risk-managed` | `not-applicable` | `not-set`

## Testing

- Unit tests (`*.test.ts` in `src/`): cover pure domain/data/state logic. Vitest, node env, `fake-indexeddb` setup where needed. Coverage gate is currently permissive but the brief targets ≥60% by Phase 1 and ≥80% by Phase 2.
- E2E tests (`tests/e2e/*.spec.ts`): cover user journeys. Each spec ends with an `@axe-core/playwright` assertion (zero serious/critical).
- Do not unit-test Lit components directly.

## What not to do

- Do not migrate v2 data. Clean start.
- Do not add runtime dependencies without a justification entry in [v3-plan.md](v3-plan.md) §17.
- Do not edit anything under `archive/v2/`. It exists for reference only.
- Do not relax CSP without a tracked rationale.
- Do not add docstrings or comments to code you did not change.
