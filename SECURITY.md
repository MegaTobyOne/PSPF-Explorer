# Security

PSPF Explorer is a single-user, offline-first browser application. It handles workspace data that should be treated as **OFFICIAL: Sensitive** by default.

## Reporting

This is an experimental open-source tool. To report a vulnerability, open a private security advisory on the GitHub repository.

## Posture

- **No backend.** No data leaves the browser.
- **No third-party CDNs.** All assets are bundled at build time.
- **Strict Content Security Policy** enforced via meta tag: `default-src 'self'`. No `unsafe-eval`. `unsafe-inline` is currently permitted for `style-src` only — see [v3-plan.md](v3-plan.md) §9 for the open work to remove it.
- **No telemetry, analytics, or remote logging.**
- **Local storage** uses IndexedDB (`pspf-explorer.v3`). Access is constrained by the browser's same-origin policy.

## Threat model (summary)

| Threat                                  | Mitigation                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| XSS via malicious imported JSON         | Hand-written validators in `src/data/validators.ts`; never `innerHTML` user content; Lit templates escape by default. |
| Phishing via evidence URLs              | URLs render as text with an explicit-open affordance; opened with `rel="noopener noreferrer"`.                        |
| IndexedDB exposure on shared machines   | Documented in-app; users responsible for device hygiene. The app provides a **Clear all data** action.                |
| Supply-chain compromise of a dependency | Minimal runtime dependency surface (see v3-plan.md §17); Dependabot weekly; SBOM generated per release.               |
| Tab-crash data loss mid-edit            | All writes go through a single `runInTx(...)` helper — no partial envelopes.                                          |

## Sensitive data handling

- Treat all user-entered content as OFFICIAL: Sensitive.
- The application surfaces an "OFFICIAL: Sensitive" classification banner on every screen.
- Users should regularly export backups via the Data view and store them according to their entity's handling rules.

## Audit

- Production dependencies are pinned to exact versions in `package.json`.
- A CycloneDX SBOM (`sbom.json`) is generated as part of the release workflow and attached to GitHub Releases.
