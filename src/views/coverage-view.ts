import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { COMPLIANCE_STATES, type ComplianceState } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import { summariseAllDomains } from '../domain/summary.ts';
import { complianceColourVar, complianceLabel } from '../domain/compliance-display.ts';

@customElement('pspf-coverage-view')
export class CoverageView extends LitElement {
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
      .panel {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        margin-bottom: var(--space-3);
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
      }
      th,
      td {
        padding: var(--space-2);
        text-align: left;
        border-bottom: 1px solid var(--colour-border);
      }
      th {
        font-weight: 600;
        color: var(--colour-fg-muted);
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      th.numeric,
      td.numeric {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      tr.totals {
        font-weight: 600;
        background: var(--colour-bg);
      }
      .legend {
        display: inline-block;
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 2px;
        vertical-align: middle;
        margin-right: 4px;
      }
      a.domain-link {
        color: var(--colour-accent);
        text-decoration: none;
      }
      a.domain-link:hover {
        text-decoration: underline;
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.compliance] : []));

  override render(): TemplateResult {
    const compliance = this.store?.compliance.value ?? new Map();
    const summaries = summariseAllDomains(compliance);

    const totals: Record<ComplianceState, number> = {
      yes: 0,
      no: 0,
      'risk-managed': 0,
      'not-applicable': 0,
      'not-set': 0,
    };
    let grandTotal = 0;
    for (const s of summaries) {
      grandTotal += s.total;
      for (const state of COMPLIANCE_STATES) totals[state] += s.byState[state];
    }
    const overallCompliantPct = grandTotal === 0 ? 0 : Math.round((totals.yes / grandTotal) * 100);

    return html`
      <article>
        <h2>Coverage matrix</h2>
        <p>
          Per-domain compliance state breakdown. The Compliant % column is the share of requirements
          with state &ldquo;Yes&rdquo;.
        </p>
        <div class="panel">
          <table aria-label="Compliance coverage by domain and state">
            <thead>
              <tr>
                <th scope="col">Domain</th>
                ${COMPLIANCE_STATES.map(
                  (s) =>
                    html`<th class="numeric" scope="col">
                      <span
                        class="legend"
                        style=${`background: var(${complianceColourVar(s)})`}
                      ></span>
                      ${complianceLabel(s)}
                    </th>`,
                )}
                <th class="numeric" scope="col">Total</th>
                <th class="numeric" scope="col">Compliant&nbsp;%</th>
              </tr>
            </thead>
            <tbody>
              ${summaries.map(
                (s) => html`
                  <tr data-domain=${s.domain.key}>
                    <th scope="row">
                      <a class="domain-link" href="#/domain/${s.domain.key}">${s.domain.name}</a>
                    </th>
                    ${COMPLIANCE_STATES.map(
                      (state) =>
                        html`<td class="numeric" data-state=${state}>${s.byState[state]}</td>`,
                    )}
                    <td class="numeric">${s.total}</td>
                    <td class="numeric">
                      ${s.total === 0 ? 0 : Math.round(s.compliantPct * 100)}%
                    </td>
                  </tr>
                `,
              )}
              <tr class="totals">
                <th scope="row">All domains</th>
                ${COMPLIANCE_STATES.map(
                  (state) =>
                    html`<td class="numeric" data-total-state=${state}>${totals[state]}</td>`,
                )}
                <td class="numeric" data-grand-total>${grandTotal}</td>
                <td class="numeric" data-overall-compliant-pct>${overallCompliantPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-coverage-view': CoverageView;
  }
}
