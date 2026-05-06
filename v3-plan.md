# PSPF Explorer v3 — Implementation Plan

Companion to [purpose.md](purpose.md). The brief is authoritative; this document is the **how** and the **order**. Living document — update as decisions land.

> Status legend: 🔲 not started · 🟡 in progress · ✅ done · ❓ open question

---

## 0. Decisions confirmed in kickoff

| Decision            | Choice                                         |
| ------------------- | ---------------------------------------------- |
| v2 coexistence      | Move v2 to `archive/v2/`; build v3 at root     |
| Package manager     | npm                                            |
| Pages base path     | Sub-path now (env-driven), custom domain later |
| v2 → v3 data import | Not supported; clean start                     |
| Brief deviations    | None up front; ideas raised inline below as ❓ |

---

## 1. Repo reorganisation (one-shot, before any v3 code)

### Move to `archive/v2/`

```
pspf-explorer.html
index.html
update_requirements.js
PSPF Release 2025.csv
PSPF Release 2025 - …FINAL.XLSX
pspf-release-2025.pdf
pspf-explorer-design.md
pspf-explorer_2025-11-13_2103.zip
scripts/                  → archive/v2/scripts/
styles/                   → archive/v2/styles/
tests/                    → archive/v2/tests/
playwright.config.mjs     → archive/v2/playwright.config.mjs
playwright-report/        → archive/v2/playwright-report/   (or .gitignore + delete)
test-results/             → delete (regenerated)
.hintrc                   → archive/v2/.hintrc
```

### Stay/replace at root

| Path                      | Action                                                                    |
| ------------------------- | ------------------------------------------------------------------------- |
| `README.md`               | Rewrite for v3 (Phase 1 minimal stub at first)                            |
| `SECURITY.md`             | Update threat model section per brief §12                                 |
| `purpose.md`              | Keep — authoritative brief                                                |
| `v3-plan.md`              | This file                                                                 |
| `package.json`            | Replace with v3 manifest                                                  |
| `.gitignore`              | Add `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `.vite/` |
| `copilot-instructions.md` | Rewrite for v3 stack/conventions                                          |
| `favicon.svg`             | Reuse                                                                     |
| `.github/`                | Add `workflows/ci.yml`, `workflows/pages.yml`, `dependabot.yml`           |
| `.vscode/`                | Keep                                                                      |

### Note on `archive/v2`

Once moved, do not touch v2 code. v2 stays accessible by checkout of `archive/v2/pspf-explorer.html`. The deployed v2 site keeps serving from the existing Pages deployment until the v3 cutover (final step of Phase 1 DoD).

---

## 2. Project skeleton (Phase 0)

```
/
├─ index.html                    Vite entry (SPA shell, CSP meta, root <pspf-app>)
├─ vite.config.ts                base via env, define __APP_VERSION__, chunk hints
├─ tsconfig.json                 strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
├─ tsconfig.node.json            for vite/vitest/playwright configs
├─ package.json
├─ .eslintrc.cjs / eslint.config.js     flat config: typescript-eslint, lit, unicorn
├─ .prettierrc
├─ vitest.config.ts              jsdom env for view tests if added later; node env for domain
├─ playwright.config.ts          starts `npm run preview`; trace on first retry
├─ src/
│  ├─ main.ts                    bootstraps router + root context providers
│  ├─ app/
│  │  ├─ pspf-app.ts             root <pspf-app> Lit element; layout shell
│  │  ├─ router.ts               @vaadin/router config (lazy view modules)
│  │  └─ design-tokens.ts        css`...` shared sheet (colors, spacing, type, motion)
│  ├─ data/
│  │  ├─ types.ts                ALL persisted record interfaces (task zero)
│  │  ├─ schema.ts               pspf-explorer.v3 schema id + envelope shape
│  │  ├─ db.ts                   idb open(), migrations, version 1 stores
│  │  ├─ stores/
│  │  │  ├─ compliance.ts        CRUD over compliance store
│  │  │  ├─ risks.ts
│  │  │  ├─ actions.ts
│  │  │  ├─ tags.ts
│  │  │  ├─ savedViews.ts
│  │  │  ├─ workTracking.ts
│  │  │  ├─ posture.ts           threat level + posture (singleton record)
│  │  │  └─ directions.ts        Phase 2
│  │  ├─ backup.ts               export/import envelope build + parse
│  │  └─ validators.ts           hand-rolled type guards for imported JSON
│  ├─ domain/                    PURE TS — no DOM, no idb. Unit-tested.
│  │  ├─ requirements.ts         filtering, search index, grouping
│  │  ├─ compliance.ts           progress %, gap calc, maturity rollup
│  │  ├─ risk-scoring.ts         likelihood × impact → rating
│  │  ├─ essential-eight.ts      E8 maturity rollup
│  │  ├─ relationships.ts        normalisation, equivalence
│  │  └─ integrity.ts            orphan/duplicate/self-loop detectors
│  ├─ pspf/                      static PSPF 2025 data (read-only)
│  │  ├─ index.ts                getAllDomains/getAllRequirements
│  │  ├─ governance.ts
│  │  ├─ information.ts
│  │  ├─ personnel.ts
│  │  ├─ physical.ts
│  │  ├─ risk.ts
│  │  └─ technology.ts           includes Essential Eight controls
│  ├─ state/
│  │  ├─ contexts.ts             @lit/context Contexts for each store
│  │  ├─ signals.ts              app-wide signals (current route, search query, theme)
│  │  └─ controllers.ts          SignalController helper for Lit reactivity
│  ├─ views/                     each is a lazy-loaded route module
│  │  ├─ home-view.ts            domain cards + global posture
│  │  ├─ domain-view.ts
│  │  ├─ requirement-view.ts
│  │  ├─ risk-view.ts
│  │  ├─ action-view.ts
│  │  ├─ tags-view.ts
│  │  ├─ data-view.ts            backup / restore / clear
│  │  ├─ integrity-view.ts
│  │  ├─ analytics-view.ts       E8 + per-domain gaps
│  │  └─ help-view.ts
│  ├─ components/                shared Lit components (badges, dialogs, tables)
│  │  ├─ pspf-badge.ts
│  │  ├─ status-pill.ts
│  │  ├─ posture-indicator.ts
│  │  ├─ search-box.ts
│  │  ├─ confirm-dialog.ts
│  │  ├─ table-shell.ts          sticky-header, virtualised if >200 rows
│  │  └─ markdown-text.ts        safe inline markdown (whitelist)
│  ├─ workers/
│  │  └─ integrity.worker.ts     orphan/duplicate/self-loop scanner
│  └─ test-utils/
│     └─ fake-db.ts              in-memory idb adapter for tests
├─ tests/
│  └─ e2e/                       Playwright phase 1 specs
└─ public/
   ├─ favicon.svg
   └─ robots.txt                 disallow all
```

**Hard rule**: no file in `src/domain/` or `src/views/` exceeds ~500 LOC. Split by feature when approached.

---

## 3. Type definitions — task zero (per brief §10)

Defined in `src/data/types.ts` before any store or component is written.

```ts
// IDs — branded for safety
type RequirementId = string & { __brand: 'RequirementId' }; // e.g. 'GOV-001'
type RiskId = string & { __brand: 'RiskId' }; // ULID
type ActionId = string & { __brand: 'ActionId' };
type DirectionId = string & { __brand: 'DirectionId' };
type TagId = string & { __brand: 'TagId' };

type DomainKey = 'governance' | 'information' | 'personnel' | 'physical' | 'risk' | 'technology';

interface Requirement {
  id: RequirementId;
  domain: DomainKey;
  title: string;
  text: string;
  references?: string[];
  reportingType?: string;
  // E8-specific extras live on a discriminated union if needed
}

type ComplianceState = 'yes' | 'no' | 'risk-managed' | 'not-applicable' | 'not-set';

interface ComplianceEntry {
  requirementId: RequirementId;
  state: ComplianceState;
  evidence: EvidenceRef[];
  targetMaturity?: 1 | 2 | 3 | 4;
  reviewedAt?: string; // ISO
  reviewer?: string;
  notes?: string;
  updatedAt: string;
}

interface EvidenceRef {
  kind: 'url' | 'note';
  value: string; // URL rendered as text-with-explicit-open
  addedAt: string;
}

interface Risk {
  id: RiskId;
  title: string;
  description?: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  status: 'open' | 'monitored' | 'closed';
  requirementIds: RequirementId[];
  actionIds: ActionId[];
  createdAt: string;
  updatedAt: string;
}

interface Action {
  id: ActionId;
  title: string;
  type: 'remediation' | 'uplift' | 'review' | 'investigation';
  status: 'todo' | 'in-progress' | 'blocked' | 'done' | 'cancelled';
  dueAt?: string;
  requirementIds: RequirementId[];
  riskIds: RiskId[];
  createdAt: string;
  updatedAt: string;
}

interface Tag {
  id: TagId;
  label: string;
  colour: string;
  priority?: 1 | 2 | 3 | 4;
}

interface SavedView {
  id: string;
  name: string;
  filters: { domain?: DomainKey; states?: ComplianceState[]; tagIds?: TagId[]; q?: string };
  createdAt: string;
}

type ThreatLevel = 'low' | 'elevated' | 'high' | 'critical';
type Posture = 'standard' | 'shields-up' | 'active-defence';

interface PostureRecord {
  global: { threat: ThreatLevel; posture: Posture; updatedAt: string };
  perDomain: Partial<
    Record<DomainKey, { threat: ThreatLevel; posture: Posture; updatedAt: string }>
  >;
}

interface ExportEnvelope {
  schema: 'pspf-explorer.v3';
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  data: {
    compliance: ComplianceEntry[];
    risks: Risk[];
    actions: Action[];
    tags: Tag[];
    savedViews: SavedView[];
    posture: PostureRecord;
    workTracking: WorkTrackingEntry[];
    directions?: Direction[]; // Phase 2
    relationships?: Relationship[]; // Phase 2
  };
}
```

❓ **Branded IDs vs plain strings** — branded gives compile-time safety at zero runtime cost. Recommend keeping. Disagree?

❓ **Validation library** — brief says minimal deps. Options: hand-write type guards (zero KB, more code), or add `valibot` (~3 KB) for declarative schemas with great DX. Recommend `valibot` _only_ if hand-written guards become painful — defer to first sign of pain.

---

## 4. IndexedDB schema (version 1)

Database name: `pspf-explorer.v3`. One DB, multiple object stores.

| Store           | Key path                         | Indexes                                                       | Notes                                          |
| --------------- | -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `compliance`    | `requirementId`                  | `state`, `updatedAt`                                          | one entry per requirement; absent = `not-set`  |
| `risks`         | `id`                             | `status`, `updatedAt`, multi-entry on `requirementIds`        |                                                |
| `actions`       | `id`                             | `status`, `dueAt`, multi-entry on `requirementIds`, `riskIds` |                                                |
| `tags`          | `id`                             | —                                                             |                                                |
| `savedViews`    | `id`                             | —                                                             |                                                |
| `workTracking`  | `id`                             | `requirementId`                                               | per-user per-requirement notes/log             |
| `posture`       | `id` (singleton `'__posture__'`) | —                                                             |                                                |
| `directions`    | `id`                             | —                                                             | Phase 2; created in v1 schema with no rows     |
| `relationships` | `id`                             | multi-entry `endpoints`                                       | Phase 2                                        |
| `meta`          | `key`                            | —                                                             | schema version, last integrity scan, app prefs |

**Migration policy**: forward-only. `db.ts` keeps an array of `migrations: Record<number, (db, tx) => void>`. Schema bump always = new entry; never mutate previous migrations. Versioned tests assert each migration in isolation.

**Crash safety**: every write goes through a single `runInTx(stores, mode, fn)` helper that wraps `idb` transactions. No partial envelopes possible.

---

## 5. State / reactivity model

- One signal per store (`signal<ComplianceEntry[]>`, etc.) initialised from idb on app boot.
- A `SignalController` Lit reactive controller subscribes a host element to one or more signals, calls `requestUpdate()` on change.
- Derived state via `computed()` (e.g. `progressByDomain`, `e8Maturity`).
- Stores are exposed via `@lit/context` so deep components don't need prop drilling and tests can swap fakes.

❓ **Idea**: Wrap `requestIdleCallback` around large derived recomputations (graph layout, integrity scan) so view interactions stay 60 fps. Worth adopting from the start.

---

## 6. Routing

`@vaadin/router` with hash mode for GitHub Pages compatibility (no need for `404.html` fallback gymnastics; cleaner when we move to a custom domain we can switch to history mode by changing one line).

Phase 1 routes:

```
#/                          home-view
#/domain/:key               domain-view
#/requirement/:id           requirement-view
#/risks                     risk-view
#/risks/:id                 risk-view (detail)
#/actions                   action-view
#/actions/:id               action-view (detail)
#/tags                      tags-view
#/analytics                 analytics-view
#/integrity                 integrity-view
#/data                      data-view
#/help                      help-view
```

❓ **Hash routing tradeoff**: hash URLs are uglier but eliminate Pages SPA-fallback issues forever. Recommended.

---

## 7. PSPF data port (one-time)

Port `archive/v2/scripts/domains/*.js` → `src/pspf/*.ts`.

- Convert each `xRequirements` object literal into a typed `readonly` const.
- Validate at build time via a Vitest test that asserts: total = 218, domain coverage matches expected counts, every ID is unique and matches `/^[A-Z]+-\d{3}$/`, every ID is referenced in exactly one domain.
- Export a precomputed search index map (`Map<RequirementId, Requirement>`) at module load.
- Essential Eight controls (currently bolted onto `technology.js`) become a separate typed const `essentialEightControls` keyed by control id.

---

## 8. Tooling — concrete settings

### `package.json` scripts

```
"dev": "vite",
"build": "vite build",
"preview": "vite preview --port 4173",
"test": "vitest",
"test:run": "vitest run --coverage",
"test:e2e": "playwright test",
"lint": "eslint . && prettier --check .",
"format": "prettier --write .",
"typecheck": "tsc --noEmit",
"sbom": "cyclonedx-npm --package-lock-only --output-file sbom.json --omit dev"
```

### Vite

- `base: process.env.PSPF_BASE ?? '/pspf-explorer/'` — env-driven so custom-domain switch is one line.
- `build.target: 'es2022'`, `cssCodeSplit: true`, manual chunks: `cytoscape` (Phase 2 only).
- `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`.

### tsconfig (strict)

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`, `useDefineForClassFields: true`.
- `paths`: `@data/*`, `@domain/*`, `@views/*`, `@components/*`, `@pspf/*`.

### CI (`.github/workflows/ci.yml`)

- Triggers on push & PR to `main`.
- Steps: setup-node 20, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npx playwright install --with-deps chromium`, `npm run test:e2e`.

### CD (`.github/workflows/pages.yml`)

- Triggers on push to `main` after CI green.
- Builds, generates SBOM, uploads `dist/` as Pages artefact, deploys.

### Dependabot

- Weekly, grouped: `lit-*`, `vite-*`, `@playwright/test`, `eslint-*`. Run CI on every PR.

❓ **Adding ESLint + Prettier** — brief doesn't mention them. Recommend including: typescript-eslint, eslint-plugin-lit, eslint-plugin-lit-a11y, eslint-plugin-unicorn (selective rules). Worth the dev-only dep cost. OK?

❓ **Husky / lint-staged** — single-developer project, probably not worth the friction. Skip.

❓ **PWA / service worker** — brief says works offline once loaded. A SW would let it survive reloads with no network at all and enable "Add to Home Screen". Adds CSP complexity (`worker-src 'self'`) and update-flow complexity. **Recommend deferring to Phase 3** (or as a polish item) and shipping Phase 1 without one.

---

## 9. Security implementation

- `index.html` ships with strict CSP `<meta>`:
  ```
  default-src 'self';
  style-src 'self' 'unsafe-inline';   ← Lit shadow styles need this; documented tradeoff
  script-src 'self';
  worker-src 'self';
  connect-src 'self';
  img-src 'self' data:;
  font-src 'self';
  base-uri 'none'; frame-ancestors 'none'; object-src 'none';
  ```
  ❓ Lit uses adoptedStyleSheets where supported, but `style-src 'self' 'unsafe-inline'` is the practical baseline because `<style>` blocks emerge from server-rendered tags or third-party Lit usage patterns. Worth investigating whether we can drop `unsafe-inline` for style by relying entirely on adopted sheets — TBD during build-out.
- `markdown-text` component renders only a tight whitelist (links → text + explicit-open icon, bold, italic, lists). Never `innerHTML` user content.
- All evidence URLs render as `<a rel="noopener noreferrer" target="_blank">` with an explicit "↗" affordance, never auto-followed.
- `validators.ts` hard-rejects unknown root keys, oversized strings (>32 KB per text field), and non-string IDs in imported envelopes.

---

## 10. Phase 1 backlog (ordered)

1. ✅ Repo reorganisation: move v2 → `archive/v2/`. Verify v2 still loads via direct file open from archive.
2. ✅ Bootstrap Vite + TS strict + Lit + ESLint + Prettier + Vitest + Playwright. Empty `<pspf-app>` renders "Hello v3".
3. ✅ CI workflow green on the empty app.
4. ✅ Type definitions in `src/data/types.ts` + JSON Schema for export envelope under `docs/schema/`.
5. ✅ PSPF data port + structural test (218 / 6 domains / unique IDs).
6. ✅ IndexedDB layer: open, migrate to v1 schema, store CRUD helpers + `runInTx`, fake-db for tests.
7. ✅ Signal stores wired through `@lit/context`. Boot loads from idb.
8. ✅ Router + view shells (all Phase 1 routes resolve, even if empty).
9. ✅ home-view: domain cards with live progress.
10. ✅ domain-view + requirement-view: read-only browse + search.
11. ✅ Compliance editing on requirement-view (state, evidence, target maturity, reviewer notes).
12. ✅ Tags CRUD + tag-based filtering on domain-view.
13. ✅ Saved views.
14. ✅ Risk register CRUD + linkage to requirements.
15. ✅ Action tracker CRUD + linkage to requirements & risks.
16. ✅ Posture/threat-level (global + per-domain).
17. ✅ Work-tracking notes per requirement.
18. ✅ analytics-view: E8 maturity + per-domain gap report.
19. ✅ Integrity worker + integrity-view (orphans/duplicates/self-loops). _(completed in Phase 3 polish)_
20. ✅ Backup export (JSON envelope, schema-versioned).
21. ✅ Restore import with preflight conflict review.
22. ✅ Clear-all-data with double-confirm.
23. ✅ Help view + threat-model link to SECURITY.md.
24. ✅ axe-core sweep — fix all serious/critical.
25. ✅ Performance pass against budgets in brief §6.
26. ✅ README rewrite for v3 Phase 1.
27. ✅ SBOM step in release workflow.
28. 🟡 Cutover: point Pages at v3 build; archive v2 site notice. _(deployment task; pending owner action)_

Each step ends with: domain-layer Vitest passing, view changes covered by at least one Playwright assertion, manual smoke at the configured Pages base path.

---

## 11. Phase 1 E2E coverage (Playwright)

Per brief §13. One spec per journey, axe assertion at the end of each.

- `browse-requirements.spec.ts`
- `set-compliance.spec.ts`
- `add-risk.spec.ts`
- `add-action.spec.ts`
- `apply-tag.spec.ts`
- `export-import-backup.spec.ts`
- `analytics-and-integrity.spec.ts`

---

## 12. Performance verification

Against brief §6 budgets:

- `vitest --bench` for hot domain functions (search, progress, e8 rollup) — fail if >2× regression.
- Playwright trace + `performance.mark`/`measure` around route switches; assert p95 < 100 ms over 20 navigations.
- Lighthouse run in CI on the built preview (`@lhci/cli`); FCP < 1.0s, TTI < 1.5s as budget.
- Bundle size guard: a tiny `scripts/bundle-budget.mjs` that fails CI if main chunk gzipped > 250 KB or graph chunk > 90 KB.

---

## 13. Phase 2 / Phase 3 — status

**Phase 2** ✅ shipped: Cytoscape lazy chunk (`/map`), relationship store + register view (`/relationships`), coverage matrix (`/coverage`), directions register (`/directions`), share packages with skip-on-conflict merge (`/share`), GRC capture with locked-schema validator (`/grc`). JSON Schema published under `docs/schema/`.

**Phase 3** — in progress (started after Phase 2):

- ✅ Integrity worker + view (orphans / duplicates / self-loops / dangling endpoints) — closes deferred Phase 1 step 19.
- ✅ Keyboard command palette (Cmd/Ctrl+K) — global navigator over all routes.
- ✅ Print stylesheet for domain summaries.
- ✅ Reporting-language UX update: "Not yet implemented" / "Fully implemented" labels in UI summaries and status views.
- ✅ Persistent breadcrumbs on Home, Domain, and Requirement pages.
- ✅ Relationship entry autocomplete and validation in Relationships view.
- ✅ Requirement-level quick relationship linking (risk/action/direction).
- ✅ Compliance notes persistence fix on status changes.
- ✅ Compliance status history (audit-trail lite) with human-friendly timestamps.
- ✅ Header markings updated to include TLP:AMBER+STRICT next to OFFICIAL: Sensitive.
- 🔲 Multiple workspaces (separate idb DB per workspace).
- 🔲 Undo/redo for destructive operations.
- 🔲 Diff view for share-package merges.
- 🔲 PDF export of domain summaries (browser print covers MVP).
- 🔲 Mobile-friendly read-only mode.
- 🔲 Pluggable PSPF release year.
- 🔲 Optional service worker / PWA.

---

## 14. Open ideas to discuss

Things I'd flag as worth a short conversation when we get there:

1. **Branded ID types** (§3) — recommend adopt.
2. **valibot for import validation** — defer until pain point hits.
3. **Hash routing** for Pages compatibility — recommend adopt.
4. **ESLint + Prettier** — recommend adopt.
5. **`requestIdleCallback` for heavy derived state** — recommend adopt early.
6. **Drop `unsafe-inline` from `style-src`** — investigate during build-out; not a launch blocker.
7. **Service worker / PWA** — defer to Phase 3.
8. **Lighthouse CI + bundle-budget gate** — recommend adopt; cheap insurance against regressions.
9. **Per-build `__APP_VERSION__` constant** — recommend adopt; surfaces in Help view.
10. **Branded "OFFICIAL: Sensitive" footer banner** in the app shell, so the data classification context stays visible — small UX nudge that costs nothing.

---

## 15. Risks worth tracking

| Risk                                            | Mitigation                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Cytoscape lazy chunk creep                      | Manual chunk + bundle-size gate from day one.                                                                            |
| IDB migration mistakes lose user data           | Forward-only migrations, isolated tests per migration, every migration also writes a meta record describing the upgrade. |
| Lit shadow DOM + axe false positives            | Use `@axe-core/playwright` with shadow DOM piercing enabled; document any disabled rules.                                |
| Strict CSP breaks third-party libs we add later | Add a CSP regression test (Playwright loads each route with CSP enforced and fails on console violations).               |
| Solo developer scope creep into Phase 2 work    | Treat the Phase 1 backlog (§10) as a hard gate — no Phase 2 features land until §10 is fully ✅.                         |

---

_End of plan. Update statuses inline as work progresses. Add new ❓ items at the bottom of §14 as they surface._
