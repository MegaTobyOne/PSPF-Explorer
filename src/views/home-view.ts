import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { appStoreContext } from '../state/contexts.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import type { AppStore } from '../state/app-store.ts';
import { summariseAllDomains, type DomainSummary } from '../domain/summary.ts';
import type { ComplianceEntry, RequirementId } from '../data/types.ts';
import {
  complianceBreakdown,
  directionsSummary,
  essentialEightCoverage,
} from '../domain/analytics.ts';
import { complianceLabel } from '../domain/compliance-display.ts';
import '../components/breadcrumbs.ts';

@customElement('pspf-home-view')
export class HomeView extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
      }
      h2 {
        font-size: var(--text-xl);
        margin: 0 0 var(--space-3) 0;
      }
      .lede {
        max-width: 60ch;
        color: var(--colour-fg-muted);
        margin: 0 0 var(--space-4) 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
        gap: var(--space-3);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .widgets {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
        gap: var(--space-3);
        margin: 0 0 var(--space-4) 0;
      }
      .widget {
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        padding: var(--space-3);
      }
      a.widget {
        text-decoration: none;
        color: inherit;
      }
      a.widget:hover,
      a.widget:focus-visible {
        border-color: var(--colour-fg-muted);
        outline: none;
      }
      .widget .value {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.1;
      }
      .widget .label {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        text-decoration: none;
        color: inherit;
      }
      .card:hover,
      .card:focus-visible {
        border-color: var(--colour-fg-muted);
        outline: none;
      }
      .card h3 {
        margin: 0;
        font-size: var(--text-lg);
      }
      .card p {
        margin: 0;
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
      }
      .meter {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      .bar {
        height: 6px;
        background: var(--colour-border);
        border-radius: 3px;
        overflow: hidden;
      }
      .bar > span {
        display: block;
        height: 100%;
        background: var(--colour-fg);
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // Re-render whenever the compliance signal changes.
  // The watcher is held only for its controller lifecycle.
  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () =>
    this.store ? [this.store.compliance, this.store.directions] : [],
  );

  override render() {
    const compliance: ReadonlyMap<RequirementId, ComplianceEntry> =
      this.store?.compliance.value ?? new Map();
    const summaries = summariseAllDomains(compliance);
    const overall = complianceBreakdown(compliance);
    const e8 = essentialEightCoverage(compliance);
    const directionStats = directionsSummary(this.store?.directions.value ?? []);
    return html`
      <article>
        <pspf-breadcrumbs .items=${[{ label: 'Home' }]}></pspf-breadcrumbs>
        <h2>PSPF domains</h2>
        <p class="lede">
          Welcome to PSPF Explorer v3. Select a domain to start working through its requirements.
          Your work is stored on this device only.
        </p>
        <section class="widgets" aria-label="Programme overview widgets">
          <div class="widget" data-testid="home-widget-overall">
            <div class="value">${overall.compliantPct}%</div>
            <div class="label">Overall fully implemented (excl. n/a)</div>
          </div>
          <a class="widget" data-testid="home-widget-e8" href="#/essential-eight">
            <div class="value">${e8.implementedPct}%</div>
            <div class="label">
              Essential Eight (TECH-099 to TECH-106) · catchall TECH-107:
              ${complianceLabel(e8.catchall.state)}
            </div>
          </a>
          <a class="widget" data-testid="home-widget-directions" href="#/directions/not-set">
            <div class="value">${directionStats.needsResponseCount}</div>
            <div class="label">
              Directions needing response · addressed ${directionStats.addressedPct}%
            </div>
          </a>
        </section>
        <ul class="grid">
          ${summaries.map((s) => this.#card(s))}
        </ul>
      </article>
    `;
  }

  #card(s: DomainSummary): TemplateResult {
    const pct = Math.round(s.compliantPct * 100);
    return html`
      <li>
        <a class="card" href="#/domain/${s.domain.key}">
          <h3>${s.domain.name}</h3>
          <p>${s.domain.description}</p>
          <div class="meter">
            <div>${s.byState.yes} of ${s.total} fully implemented · ${pct}%</div>
            <div
              class="bar"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow=${pct}
              aria-label=${`${s.domain.name} compliance progress`}
            >
              <span style=${`width: ${pct}%`}></span>
            </div>
          </div>
        </a>
      </li>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-home-view': HomeView;
  }
}
