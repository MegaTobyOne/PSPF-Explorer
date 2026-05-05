# PSPF Explorer

**v3.0 (alpha)** — Offline-first compliance management for the Australian Government [Protective Security Policy Framework (PSPF) 2025](https://www.protectivesecurity.gov.au/pspf-annual-release).

> v3 is under active development. The previous v2 release lives under [archive/v2/](archive/v2/) and remains available at the existing GitHub Pages URL until v3 reaches Phase 1 feature parity. See [purpose.md](purpose.md) for the v3 brief and [v3-plan.md](v3-plan.md) for the implementation plan.

## What it is

A single-page web application that helps Australian Government security and governance practitioners track their entity's compliance against all 218 PSPF 2025 requirements across six domains. All data stays in the browser — no servers, no telemetry, no third-party CDNs.

## Status

- Phase 0 — Project scaffold, tooling, CI (in progress)
- Phase 1 — Core compliance tool
- Phase 2 — Collaboration and relationship features
- Phase 3 — Polish and power features

## Develop

Requires Node.js 20.11+.

```sh
npm install
npm run dev          # http://localhost:5173
npm run test         # unit tests (watch)
npm run test:e2e     # Playwright E2E
npm run build        # static build into dist/
npm run preview      # serve dist/ on :4173
```

## Privacy and data

- All user data is stored locally via IndexedDB under the schema id `pspf-explorer.v3`.
- The application makes no network requests after initial load.
- Treat the workspace as **OFFICIAL: Sensitive** by default.

See [SECURITY.md](SECURITY.md) for the security posture and threat model.
