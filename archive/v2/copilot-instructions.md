# Copilot Instructions: PSPF Explorer

## What this project is

**PSPF Explorer** (v2.0) is an offline-first, single-page compliance management tool for Australian Government entities tracking obligations under the [Protective Security Policy Framework (PSPF)](https://www.protectivesecurity.gov.au/pspf-annual-release). It runs entirely in the browser — no server, no build step, no external dependencies.

See [purpose.md](purpose.md) and [pspf-explorer-design.md](pspf-explorer-design.md) for detailed product context.

## Key commands

| Task | Command |
|---|---|
| Run unit tests | `npm test` |
| Run E2E tests (requires server) | `npm run test:e2e` |
| Start dev server (port 4173) | `npm run serve` |

Unit tests use Node's built-in test runner + jsdom. E2E tests use Playwright against `http://127.0.0.1:4173`. Playwright starts the dev server automatically.

## File map

| Path | Role |
|---|---|
| `pspf-explorer.html` | **Entry point** — the SPA shell; open this in a browser |
| `scripts/main.js` | All app logic (~9000+ LOC, `PSPFExplorer` class) |
| `scripts/core.js` | `PSPFExplorerCore` base class (shared utilities) |
| `scripts/domains/` | Static PSPF requirement data (6 domain modules + `index.js`) |
| `styles/main.css` | All styles — dark theme, CSS custom properties |
| `scripts/tests/*.test.js` | Unit tests |
| `tests/e2e/*.spec.mjs` | Playwright E2E tests |

> `index.html` redirects to `pspf-explorer.html`. Do not edit it as the primary entry point.

## Architecture

- **Vanilla ES modules** — no bundler. `pspf-explorer.html` imports `scripts/main.js` as a module.
- **One class, one file**: all views, CRUD, persistence, and integrity logic live in `PSPFExplorer` inside `scripts/main.js`.
- **localStorage only** — no IndexedDB, no server calls. Canonical state key: `pspf_state_v2`.
- **Static PSPF data** is read-only, loaded from `scripts/domains/`. ~218 requirements across 6 domains.
- **Dynamic user data** (compliance, projects, tasks, risks, incidents, evidence, relationships, directions, actions) is persisted in the v2 envelope.

## Data model (v2.0)

- `DATA_MODEL_VERSION = '2.0'`, stored at `pspf_data_model_version` in localStorage.
- State is written/read as a JSON envelope under `pspf_state_v2` via `buildLocalStateEnvelope()` / `parseLocalStateEnvelope()`.
- v2 entity arrays on `this`: `actions`, `directions`, `relationships`, `evidenceRecords`, `importBatches`, `mergeReviews`.
- Import envelope schema ID: `pspf-explorer.v2`. Supported import versions: `1.0`, `1.1`, `2.0`.
- `runDataModelMigrations()` upgrades legacy data idempotently on load.
- Export/import goes through `getPortableDataSnapshot()` → `buildDataEnvelope()` → `resolveImportPayload()`.

## Compliance status values

`Yes` | `No` | `Risk Managed` | `Not Applicable` | `Not Set`

## Mobile capability gating

`MOBILE_BREAKPOINT_PX = 768`. The following are **desktop-only** and are blocked on mobile:

| Key | Feature |
|---|---|
| `relationshipMap` | Relationship visualisation (canvas graph + coverage matrix) |
| `advancedMerge` | Offline merge with conflict review |
| `dataImport` | Data import |
| `clearAllData` | Clear all data |
| `requirementManager` | Requirement manager |

Use `ensureCapabilityAvailable(key)` before rendering any desktop-only view. `updateMobileCapabilityNotice()` manages the in-app notice.

## Coding conventions

- **AU English** in all user-facing copy: "organisation", "-ise" spellings.
- ES6+ throughout: arrow functions, `const`/`let`, template literals, `Object.freeze()` for constants.
- DOM manipulation via `document.querySelector()` and delegated event listeners on the app container.
- CSS custom properties for all theming — no hardcoded colours outside `styles/main.css`.
- No new runtime dependencies. No build tools.
- Do not add docstrings or comments to code you didn't change.

## Testing conventions

- Unit tests: `scripts/tests/*.test.js` — run with `npm test`.
- Each logical change should have corresponding unit test coverage before moving on.
- Test the behaviour you changed, not framework internals.
- After any edit to `scripts/main.js` or `styles/main.css`, run `npm test` to confirm no regressions.
- E2E tests cover navigation, layout, and welcome flows — run before shipping any view-layer change.

## Data integrity

`computeDataIntegrityDiagnostics()` returns orphan/duplicate/self-loop anomalies. The Data view renders these via `renderDataIntegrityDiagnostics()`. Import runs a preflight check via `computeIntegrityDiagnosticsForData(payload)` and requires confirmation before committing anomalous data.