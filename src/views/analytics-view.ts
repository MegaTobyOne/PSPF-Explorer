import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { COMPLIANCE_STATES, type ComplianceState } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import {
  actionStatusCounts,
  complianceBreakdown,
  directionsSummary,
  essentialEightCoverage,
  overdueActionCount,
  riskBandCounts,
} from '../domain/analytics.ts';
import { directionResponseLabel } from '../domain/reporting.ts';
import { summariseAllDomains } from '../domain/summary.ts';
import { complianceColourVar, complianceLabel } from '../domain/compliance-display.ts';

@customElement('pspf-analytics-view')
export class AnalyticsView extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
      }
      h2 {
        margin: 0 0 var(--space-3) 0;
        font-size: var(--text-xl);
      }
      h3 {
        margin: var(--space-3) 0 var(--space-2) 0;
        font-size: var(--text-md);
      }
      section.panel {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        margin-bottom: var(--space-3);
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        gap: var(--space-3);
      }
      .kpi {
        display: block;
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
      }
      a.kpi {
        color: inherit;
        text-decoration: none;
      }
      a.kpi:hover,
      a.kpi:focus-visible {
        border-color: var(--colour-fg-muted);
        outline: none;
      }
      .kpi .value {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.1;
      }
      .kpi .label {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
      }
      th,
      td {
        text-align: left;
        padding: var(--space-1) var(--space-2);
        border-bottom: 1px solid var(--colour-border);
      }
      th {
        font-weight: 600;
        color: var(--colour-fg-muted);
      }
      .bar {
        display: inline-block;
        height: 0.6rem;
        background: var(--bar-colour, var(--colour-accent));
        border-radius: var(--radius-sm);
        vertical-align: middle;
      }
      .legend {
        display: inline-block;
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 2px;
        vertical-align: middle;
        margin-right: 4px;
      }
      .row {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: baseline;
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () =>
    this.store
      ? [this.store.compliance, this.store.risks, this.store.actions, this.store.directions]
      : [],
  );

  override render(): TemplateResult {
    const compliance = this.store?.compliance.value ?? new Map();
    const risks = this.store?.risks.value ?? [];
    const actions = this.store?.actions.value ?? [];
    const directions = this.store?.directions.value ?? [];

    const breakdown = complianceBreakdown(compliance);
    const e8 = essentialEightCoverage(compliance);
    const directionStats = directionsSummary(directions);
    const bands = riskBandCounts(risks);
    const statusCounts = actionStatusCounts(actions);
    const overdue = overdueActionCount(actions);
    const summaries = summariseAllDomains(compliance);

    return html`
      <article>
        <h2>Analytics</h2>
        <p>
          Snapshot of programme health: compliance, risk posture, and action throughput. All numbers
          are computed live from the in-browser store.
        </p>

        <section class="panel" aria-label="Headline KPIs">
          <div class="kpi-grid">
            <div class="kpi">
              <div class="value" data-kpi="compliant-pct">${breakdown.compliantPct}%</div>
              <div class="label">Fully implemented (excl. n/a)</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="not-set">${breakdown.byState['not-set']}</div>
              <div class="label">Not yet assessed</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="open-risks">
                ${risks.filter((r) => r.status !== 'closed').length}
              </div>
              <div class="label">Open / monitored risks</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="overdue-actions">${overdue}</div>
              <div class="label">Overdue actions</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="e8-pct">${e8.implementedPct}%</div>
              <div class="label">
                Essential Eight (TECH-099 to TECH-106) · catchall TECH-107:
                ${complianceLabel(e8.catchall.state)}
              </div>
            </div>
            <a class="kpi" href="#/directions/not-set">
              <div class="value" data-kpi="directions-needing-response">
                ${directionStats.needsResponseCount}
              </div>
              <div class="label">
                Directions needing response · addressed ${directionStats.addressedPct}%
              </div>
            </a>
          </div>
        </section>

        <section class="panel" aria-label="Directions response coverage">
          <h3>Directions response coverage</h3>
          <table>
            <thead>
              <tr>
                <th>Response</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${directionResponseLabel('yes')}</td>
                <td>${directionStats.byState.yes}</td>
              </tr>
              <tr>
                <td>${directionResponseLabel('no')}</td>
                <td>${directionStats.byState.no}</td>
              </tr>
              <tr>
                <td>${directionResponseLabel('risk-managed')}</td>
                <td>${directionStats.byState['risk-managed']}</td>
              </tr>
              <tr>
                <td>${directionResponseLabel('not-set')}</td>
                <td>${directionStats.byState['not-set']}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel" aria-label="Compliance by domain">
          <h3>Compliance by domain</h3>
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Fully implemented %</th>
                <th aria-label="Bar"></th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${summaries.map(
                (s) => html`
                  <tr>
                    <td>${s.domain.name}</td>
                    <td>${s.compliantPct}%</td>
                    <td>
                      <span
                        class="bar"
                        style=${`width:${s.compliantPct}%; --bar-colour: var(${complianceColourVar(
                          'yes',
                        )})`}
                      ></span>
                    </td>
                    <td>${s.total}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </section>

        <section class="panel" aria-label="Compliance state distribution">
          <h3>Compliance state distribution</h3>
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Count</th>
                <th aria-label="Bar"></th>
              </tr>
            </thead>
            <tbody>
              ${COMPLIANCE_STATES.map((s: ComplianceState) => {
                const count = breakdown.byState[s];
                const pct = breakdown.total === 0 ? 0 : Math.round((count / breakdown.total) * 100);
                return html`
                  <tr>
                    <td>
                      <span
                        class="legend"
                        style=${`background: var(${complianceColourVar(s)})`}
                      ></span>
                      ${complianceLabel(s)}
                    </td>
                    <td>${count}</td>
                    <td>
                      <span
                        class="bar"
                        style=${`width:${pct}%; --bar-colour: var(${complianceColourVar(s)})`}
                      ></span>
                    </td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </section>

        <section class="panel" aria-label="Risks by band">
          <h3>Open risks by band</h3>
          <div class="row">
            <div class="kpi">
              <div class="value" data-kpi="risks-extreme">${bands.extreme}</div>
              <div class="label">Extreme (≥16)</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="risks-high">${bands.high}</div>
              <div class="label">High (10–15)</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="risks-medium">${bands.medium}</div>
              <div class="label">Medium (5–9)</div>
            </div>
            <div class="kpi">
              <div class="value" data-kpi="risks-low">${bands.low}</div>
              <div class="label">Low (1–4)</div>
            </div>
          </div>
        </section>

        <section class="panel" aria-label="Actions by status">
          <h3>Actions by status</h3>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(statusCounts).map(
                ([s, c]) => html`
                  <tr>
                    <td>${s}</td>
                    <td>${c}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </section>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-analytics-view': AnalyticsView;
  }
}
