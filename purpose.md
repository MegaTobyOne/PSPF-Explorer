# PSPF Explorer v3.0 — Reimplementation Brief

## 1. Mandate

Reimplement PSPF Explorer as a new web application with feature parity to current, plus materially better storage durability, runtime performance, and UI responsiveness. Ship to the same audience (Australian Government security and governance practitioners) with no regression in offline guarantees.

|               |                                                                             |
| ------------- | --------------------------------------------------------------------------- |
| **Type**      | Offline-first SPA                                                           |
| **Users**     | Australian Government security practitioners and governance professionals   |
| **Framework** | PSPF 2025 — 218 requirements across 6 domains                               |
| **Stack**     | Lit · Vite · TypeScript (strict) · IndexedDB · Cytoscape.js (lazy, Phase 2) |
| **Tests**     | Vitest (unit) · Playwright (E2E)                                            |

## 2. PSPF Context

The Protective Security Policy Framework (PSPF) is the Australian Government's mandatory framework for managing protective security risks. It is managed by Home Affairs and structured across six domains: Governance, Information, Personnel, Physical, Risk, and Technology. All non-corporate Commonwealth entities must self-assess compliance annually and report to Home Affairs and ASD (for cyber parts). PSPF Explorer maps to the PSPF 2025 release (218 requirements) and is designed for the security practitioners and governance professionals who own this obligation. Part of the Technology domain is known as the Essential 8 and there are also ad-hoc directions issued by Home Affairs as supplements.

## 3. Why v3

v2 has reached the limits of its architecture:

- `localStorage` is synchronous, ~5 MB, string-only — a hard ceiling on data growth and a tab-crash data-loss risk.
- A single ~9 000-LOC class (`PSPFExplorer`) is the bottleneck for change velocity and testability.
- The canvas graph and coverage matrix struggle past ~200 nodes.
- No structural separation between data, domain logic, and view rendering makes isolated testing difficult.

## 4. Stack decisions

| Area            | Decision                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework       | **Lit** — lightweight component model, minimal runtime, no virtual DOM overhead                                                                  |
| Routing         | **`@vaadin/router`** — first-class web components support, declarative route config                                                              |
| Build           | **Vite** — fast HMR, zero-config, tree-shaking, produces a deployable static bundle                                                              |
| Storage         | **IndexedDB** via `idb` — async, durable, multi-store, no size ceiling                                                                           |
| Search          | **Synchronous in-memory filter** over requirement titles, IDs, and user record fields — no library, no worker; fast enough for this dataset size |
| State           | **`@lit/context`** + **`@preact/signals-core`** — reactive signals (~1 KB) injected via Lit context; no manual pub/sub                           |
| Graph rendering | **Cytoscape.js** — lazy-loaded via dynamic `import()` on first graph view (Phase 2); handles 1 000+ nodes, keyboard-accessible                   |
| Fonts           | **System font stack** — no external font CDN; may be revisited in a later styling pass                                                           |
| Language        | **TypeScript strict mode** — no `any` in domain or data layers                                                                                   |
| Unit tests      | **Vitest** — native ESM, fast, compatible with Vite project structure                                                                            |
| E2E tests       | **Playwright** — user-journey driven, written per phase                                                                                          |

## 5. Non-negotiable constraints

- **No runtime network calls.** No backend, no telemetry. The app may be loaded via GitHub Pages but makes no network requests after initial load. Works offline once loaded.
- **Single-user, single-device.** No auth, no sync, no realtime collaboration.
- **AU English** in all user-facing copy: "organisation", "-ise", "-our" spellings.
- **Authoritative source** remains protectivesecurity.gov.au; the app interprets, does not replace.
- **Sensitive data handling.** Treat all user-entered content as OFFICIAL: Sensitive by default. No third-party CDNs or external resources. Strict CSP (`default-src 'self'`).
- **WCAG 2.2 AA** compliance.

## 6. Performance budgets

Measured on a 2022-era mid-range laptop, cold load, no cache warming:

| Metric                                                     | Budget                    |
| ---------------------------------------------------------- | ------------------------- |
| First contentful paint                                     | < 1.0 s                   |
| Time to interactive                                        | < 1.5 s                   |
| View switch p95                                            | < 100 ms                  |
| Search (218 requirements + user records)                   | < 50 ms                   |
| Graph render, 500 nodes                                    | < 250 ms, 60 fps pan/zoom |
| Initial bundle (gzipped, excl. PSPF data, excl. Cytoscape) | < 250 KB                  |
| Graph chunk (Cytoscape.js, lazy-loaded)                    | ~80 KB additional         |
| Sustained dataset (10 000 user records)                    | No perceptible lag        |

## 7. Storage and data integrity

- All writes are async and record-level safe; no half-written envelopes.
- Crash-safe: closing the tab mid-edit must not corrupt prior committed data.
- Versioned schema with forward-only migrations; never silently drop fields.
- Integrity diagnostics (orphans, duplicates, self-loops) run in a Web Worker and surface non-blockingly.
- Import preflight with explicit conflict review before commit (parity with v2).
- Schema identifier: `pspf-explorer.v3`. Publish a JSON Schema for the export envelope.

## 8. Phased delivery

v3 is delivered in three phases. Each phase must be fully working and deployed to GitHub Pages before the next begins. This avoids the risk of a large partially-complete reimplementation.

### Phase 1 — Core compliance tool

The minimum viable product: everything a practitioner needs to track daily compliance work.

- Browse and search all 218 PSPF 2025 requirements across 6 domains.
- Compliance tracking: five states (Yes / No / Risk Managed / Not Applicable / Not Set), evidence capture, target maturity 1–4, review timestamps.
- Risk register with likelihood/impact ratings and requirement linkage.
- Action tracker with type, status, due dates, and requirement/risk linkage.
- Threat level (Low / Elevated / High / Critical) and defensive posture (Standard / Shields Up / Active Defence) — global and per-domain.
- Tags, saved views, per-user work tracking.
- Full backup/restore (JSON) with schema versioning.
- Essential Eight analytics and per-domain gap reporting.
- Data integrity diagnostics view.

### Phase 2 — Collaboration and relationship features

Builds on Phase 1. Adds the tools for sharing, external integration, and relationship visualisation.

- Relationship map (Cytoscape graph) that connects compliance gaps to risks, actions, Directions, and logged work.
- Coverage matrix (requirements × entity types).
- PSPF Directions register with requirement linkage.
- Targeted share packages with offline merge and conflict review on import.
- External GRC capture via documented JSON schema with locked-field enforcement.

### Phase 3 — Polish and power features

Deferred until Phase 2 is stable in production.

- Multiple workspaces/profiles (separate datasets per browser).
- Undo/redo for destructive operations.
- Diff view for share-package merge.
- Print/PDF export of domain summaries.
- Mobile-friendly read-only mode (lift current desktop-only capability gates).
- Keyboard command palette.
- Pluggable PSPF release year (2025 / future).

### Won't

- Auth, multi-user, sync, server storage, third-party API integrations.

## 9. Data strategy — clean start

v3 makes no attempt to migrate v2 data. Users start fresh. The v2 application remains available at its existing URL until v3 reaches Phase 1 feature parity.

- The v3 IndexedDB schema is defined from scratch under schema identifier `pspf-explorer.v3`.
- Publish a JSON Schema for the v3 export envelope so users can understand and verify their data.
- Document the v3 schema in the README; no migration guide needed.
- The `pspf_state_v2` localStorage key is ignored entirely.

## 10. Architecture targets

- Clear separation: **data layer** (IndexedDB adapter, schema, migrations) · **domain layer** (pure TypeScript functions over typed records) · **view layer** (Lit components). Domain layer must be unit-testable without a DOM.
- No single file > ~500 LOC in the domain or view layers.
- Workers for: integrity diagnostics. Graph layout delegated to Cytoscape internals (Phase 2).
- Static PSPF requirement data (218 requirements, 6 domains) remains read-only; loaded as ES modules.
- **Lit styling strategy:** use shared `adoptedStyleSheets` (via Lit's `css` tagged template) for design tokens so CSS custom properties are available inside all shadow roots. No global utility classes that rely on piercing shadow DOM.
- **Type definitions are task zero:** define `Requirement`, `Domain`, `ComplianceEntry`, `Risk`, `Action`, `Direction`, `Relationship` interfaces before writing any components or stores. This prevents expensive refactors once the domain layer is in use.

## 11. Accessibility

- WCAG 2.2 AA verified with axe-core in CI.
- Full keyboard operability including the graph view (list-equivalent fallback for keyboard-only users).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Visible focus indicators, 4.5:1 contrast minimum, no colour-only status encoding.

## 12. Security posture

- Strict CSP: `default-src 'self'`; no `unsafe-inline`, no `unsafe-eval`.
- Sanitise all imported JSON; never `innerHTML` user-supplied content.
- Treat external evidence URLs as untrusted; render as text with an explicit-open link (`rel="noopener noreferrer"`).
- No analytics, error reporting, or data that leaves the device.
- Threat model (document in SECURITY.md): XSS via malicious import, localStorage/IndexedDB exposure on shared machines, evidence-URL phishing.

## 13. Test strategy

Testing is phased to match delivery. Tests are written alongside features, not after.

### Unit tests (Vitest)

- Cover the **domain layer only** — pure TypeScript functions over typed records, no DOM required.
- Written in parallel with domain layer code; a feature is not complete until its domain logic has passing unit tests.
- Coverage gate: **≥ 60% branch coverage** on the domain layer by end of Phase 1, **≥ 80%** by end of Phase 2.
- Do not unit-test Lit components directly; that is covered by E2E.

### E2E tests (Playwright)

- One E2E suite per phase, covering the primary user journeys for that phase.
- **Phase 1 journeys:** browse requirements, set compliance status, add a risk, add an action, apply a tag, export backup, import backup.
- **Phase 2 journeys:** graph focus mode, create share package, import and review merge, GRC capture.
- Accessibility assertions (axe-core) are embedded in the E2E suite via `@axe-core/playwright` — not a separate step.
- Playwright starts the preview server automatically; no manual server management.

### CI

- `npm run test:run` (Vitest, no watch) and `npm run test:e2e` run on every push to `main` via GitHub Actions.
- Both must pass before deployment to `gh-pages`.
- SBOM is generated as a post-build step in the release workflow.

---

## 14. Definition of done (per phase)

### Phase 1

- All Phase 1 features working end-to-end in the deployed GitHub Pages app.
- Domain layer branch coverage ≥ 60% (Vitest).
- Phase 1 E2E suite passing with zero failures.
- axe-core: zero serious or critical violations in Phase 1 views.
- Performance budgets met on the reference machine.
- README reflects Phase 1 capabilities.
- SBOM generated and attached to the Phase 1 GitHub Release.

### Phase 2

- All Phase 2 features working end-to-end.
- Domain layer branch coverage ≥ 80%.
- Phase 2 E2E suite passing.
- axe-core: zero serious or critical violations in all views.
- JSON Schema for v3 export envelope published in the repo.
- Architecture overview document written.

### Phase 3

- All Phase 3 features working end-to-end.
- No regression in Phase 1 or 2 suites.
- Full README, architecture overview, and JSON Schema up to date.

## 15. Principles

1. **Traceability is the core value.** Keep requirement → risk → action → outcome relationships explicit.
2. **Responsiveness first.** The user must never feel like they are waiting — offline tools live and die by perceived speed.
3. **Integrity over convenience.** Validate before commit; surface anomalies clearly. Silent data corruption is worse than a visible warning.
4. **Accessibility and privacy by default.** This tool handles sensitive compliance posture data on government devices.
5. **Practical over abstract.** Prefer clear indicators over complex visualisations — users are compliance practitioners, not data scientists.
6. **Maintainability.** Direct, testable solutions over speculative architecture. This is a single-developer project.
7. **Done means deployed.** There is no separate QA or release team; ship only what is production-ready.

## 16. Deployment, hosting and local development

### GitHub Pages

Yes — v3 deploys to GitHub Pages. Vite's `build` command produces a fully static `dist/` folder (HTML, JS chunks, CSS, assets) which GitHub Pages serves without any server. Required configuration:

- Set `base` in `vite.config.ts` to the repo sub-path (e.g. `/pspf-explorer/`) if not deployed at a root domain.
- A GitHub Actions workflow runs `vite build` and deploys `dist/` to the `gh-pages` branch on every push to `main`.
- IndexedDB, Web Workers, and Cytoscape lazy-loading all work in this context.

### Local development

| Task                        | Command               |
| --------------------------- | --------------------- |
| Dev server (HMR, port 5173) | `npm run dev`         |
| Production preview          | `npm run preview`     |
| Unit tests (watch)          | `npm run test`        |
| Unit tests (CI, no watch)   | `npm run test:run`    |
| E2E tests                   | `npm run test:e2e`    |
| Build                       | `npm run build`       |
| Performance budget          | `npm run perf:budget` |
| SBOM generation             | `npm run sbom`        |

Playwright continues to start the dev/preview server automatically for E2E runs, preserving the v2 workflow.

### Serving the built output

The `npm run preview` command (Vite's built-in static server) replaces `serve` from v2. No separate `serve` package needed.

---

## 17. Dependency management and SBOM

### Dependency policy

- Keep the runtime dependency count **minimal and auditable**. Every runtime package must justify its inclusion against a clearly smaller alternative or the cost of writing it in-house.
- All dependencies must have: an active maintainer, a permissive licence (MIT/BSD/Apache-2), and no known critical CVEs at the time of addition.
- Permitted runtime dependencies (and rationale):

| Package                | Phase | Role                            | Approx. gzipped size |
| ---------------------- | ----- | ------------------------------- | -------------------- |
| `lit`                  | 1     | Component framework             | ~5 KB                |
| `@vaadin/router`       | 1     | Client-side routing             | ~8 KB                |
| `idb`                  | 1     | IndexedDB wrapper               | ~2 KB                |
| `@preact/signals-core` | 1     | Reactive state primitives       | ~1 KB                |
| `@lit/context`         | 1     | Dependency injection for stores | ~1 KB                |
| `cytoscape`            | 2     | Graph rendering (lazy chunk)    | ~75 KB               |

- Dev-only dependencies (`vite`, `typescript`, `vitest`, `@playwright/test`, `axe-core`) are not shipped and have no size budget constraint.
- No CDN resources, no remote fonts, no third-party analytics. All assets must be bundled.

### Dependency updates

- Run `npm audit` and `npm outdated` before every release.
- Pin exact versions in `package.json` for runtime dependencies (`"lit": "3.x.x"`, not `"^3"`). Use ranges for dev dependencies.
- Review breaking changes in changelogs before upgrading; never `npm update` blindly.

### Software Bill of Materials (SBOM)

- Generate a CycloneDX SBOM as part of the release process: `npm run sbom` (using `@cyclonedx/cyclonedx-npm` against `package-lock.json`).
- Include the SBOM (`sbom.json`) as a release artefact in GitHub Releases.
- The SBOM covers all production dependencies at the resolved version, with licence data.
- Purpose: supports supply-chain transparency for government deployment and security review.

---

## 18. Inherited learnings from v2

- Compliance entries must accept optional fields without breaking existing records — consumers default-fallback gracefully.
- Relationship direction normalised at write time; lookups treat `source→target` and `target→source` as equivalent.
- Colour-coded status indicators (threat badges, compliance dots, posture pills) reduce cognitive load for repeated scanning.
- Collapsible per-domain controls keep power-user options tidy — preserve the pattern.
- Sticky table headers are essential in the coverage matrix.
- Graph focus mode dramatically improves dense-graph legibility — preserve the affordance even though the renderer is changing.

## 19. Glossary

| Term                     | Meaning                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| **PSPF**                 | Protective Security Policy Framework (Australian Government)     |
| **Essential Eight (E8)** | ASD's baseline cyber mitigation strategies                       |
| **GRC**                  | Governance, Risk and Compliance platform                         |
| **CSO / CISO**           | Chief Security Officer / Chief Information Security Officer      |
| **Direction**            | A formal instrument issued under the PSPF                        |
| **Posture**              | Defensive operating mode: Standard / Shields Up / Active Defence |
| **Threat level**         | Declared threat context: Low / Elevated / High / Critical        |
