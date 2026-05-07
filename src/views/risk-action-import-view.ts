/**
 * Risk + Action import view: file picker → review plan → confirm apply.
 *
 * Flow:
 *  1. User picks a JSON file conforming to the v1 work-import schema.
 *  2. Validation produces a plan classifying each entry as add or update.
 *  3. User reviews the plan with per-row checkboxes (and bulk select
 *     toggles for adds / updates) before confirming.
 *  4. Apply writes only the selected entries through the store.
 */

import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import {
  applyRiskActionImport,
  planRiskActionImport,
  validateRiskActionImport,
  type ActionPlanItem,
  type ApplySummary,
  type RiskActionImportPlan,
  type RiskPlanItem,
} from '../data/risk-action-import.ts';

const SAMPLE_PAYLOAD = {
  pspfWorkImport: 'v1',
  source: 'YourGRC',
  capturedAt: '2025-04-01T00:00:00Z',
  risks: [
    {
      id: 'risk-001',
      title: 'Privileged access without MFA',
      likelihood: 4,
      impact: 4,
      status: 'open',
      requirementIds: ['GOV-001'],
    },
  ],
  actions: [
    {
      id: 'action-001',
      title: 'Roll out FIDO2 to administrators',
      type: 'uplift',
      status: 'in-progress',
      dueAt: '2025-09-30T00:00:00Z',
      requirementIds: ['GOV-001'],
      riskIds: ['risk-001'],
    },
  ],
};

@customElement('pspf-risk-action-import-view')
export class RiskActionImportView extends LitElement {
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
        margin: 0 0 var(--space-2) 0;
        font-size: var(--text-lg);
      }
      .panel {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
        margin-bottom: var(--space-3);
      }
      pre {
        margin: 0;
        padding: var(--space-2);
        background: var(--colour-bg);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        overflow-x: auto;
      }
      label.row {
        display: flex;
        gap: var(--space-2);
        align-items: center;
      }
      .alert {
        padding: var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        margin-top: var(--space-2);
      }
      .alert.error {
        background: var(--colour-state-no-bg, #fde8e8);
        color: var(--colour-state-no-fg, #7c1d1d);
      }
      .alert.ok {
        background: var(--colour-state-yes-bg, #e6f4ea);
        color: var(--colour-state-yes-fg, #1e4620);
      }
      .actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
        margin-top: var(--space-2);
      }
      .bulk {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        padding: var(--space-1) 0;
        font-size: var(--text-sm);
        color: var(--colour-fg-muted);
        flex-wrap: wrap;
      }
      .bulk button {
        font: inherit;
        cursor: pointer;
        padding: 2px 8px;
        background: transparent;
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        color: inherit;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
      }
      th,
      td {
        padding: var(--space-1) var(--space-2);
        border-bottom: 1px solid var(--colour-border);
        text-align: left;
        vertical-align: top;
      }
      th {
        font-weight: 600;
        background: var(--colour-bg);
        position: sticky;
        top: 0;
      }
      .badge {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: var(--text-xs);
        font-weight: 600;
      }
      .badge.add {
        background: var(--colour-state-yes-bg, #e6f4ea);
        color: var(--colour-state-yes-fg, #1e4620);
      }
      .badge.update {
        background: var(--colour-state-no-bg, #fef3c7);
        color: var(--colour-state-no-fg, #92400e);
      }
      .changes {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
        font-family: var(--font-mono, monospace);
      }
      .empty {
        font-size: var(--text-sm);
        color: var(--colour-fg-muted);
        font-style: italic;
      }
      .primary {
        background: var(--colour-accent, #2563eb);
        color: var(--colour-bg, #fff);
        border: 1px solid var(--colour-accent, #2563eb);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font: inherit;
      }
      .primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .secondary {
        background: transparent;
        border: 1px solid var(--colour-border);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font: inherit;
        color: inherit;
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  @state() private accessor errorMessage = '';
  @state() private accessor plan: RiskActionImportPlan | null = null;
  @state() private accessor selectedRiskIndexes: ReadonlySet<number> = new Set();
  @state() private accessor selectedActionIndexes: ReadonlySet<number> = new Set();
  @state() private accessor lastSummary: ApplySummary | null = null;

  override render(): TemplateResult {
    return html`
      <article>
        <h2>Risk &amp; Action import</h2>
        <p>
          Bulk-import risks and actions from a JSON payload. The importer matches each entry to an
          existing record by <code>id</code>: entries whose ID does not exist in the workspace are
          treated as additions; entries whose ID matches an existing record are treated as updates.
          You will review the plan and explicitly confirm which entries to apply &mdash; nothing is
          overwritten without confirmation.
        </p>

        <section class="panel" aria-labelledby="schema-heading">
          <h3 id="schema-heading">Expected payload</h3>
          <pre><code>${JSON.stringify(SAMPLE_PAYLOAD, null, 2)}</code></pre>
        </section>

        <section class="panel" aria-labelledby="upload-heading">
          <h3 id="upload-heading">1. Upload payload</h3>
          <label class="row">
            <span class="visually-hidden">Choose risk and action import file</span>
            <input
              type="file"
              accept="application/json,.json"
              data-testid="work-import-file"
              aria-label="Choose risk and action import file"
              @change=${(e: Event): void => void this.#parse(e)}
            />
          </label>
          ${this.errorMessage
            ? html`<div class="alert error" role="alert" data-testid="work-import-error">
                ${this.errorMessage}
              </div>`
            : ''}
          ${this.lastSummary ? this.#renderSummary(this.lastSummary) : ''}
        </section>

        ${this.plan ? this.#renderPlan(this.plan) : ''}
      </article>
    `;
  }

  #renderSummary(s: ApplySummary): TemplateResult {
    return html`
      <div class="alert ok" role="status" data-testid="work-import-summary">
        Applied: ${s.risksAdded} risk${s.risksAdded === 1 ? '' : 's'} added, ${s.risksUpdated}
        updated · ${s.actionsAdded} action${s.actionsAdded === 1 ? '' : 's'} added,
        ${s.actionsUpdated} updated.
      </div>
    `;
  }

  #renderPlan(plan: RiskActionImportPlan): TemplateResult {
    const totalSelected = this.selectedRiskIndexes.size + this.selectedActionIndexes.size;
    return html`
      <section class="panel" aria-labelledby="review-heading" data-testid="work-import-plan">
        <h3 id="review-heading">2. Review plan</h3>
        <p>
          Source: <strong>${plan.source}</strong> · captured <strong>${plan.capturedAt}</strong>.
          Tick the rows you want to apply &mdash; updates show which fields would change.
        </p>
        ${this.#renderRiskTable(plan.risks)} ${this.#renderActionTable(plan.actions)}
        <div class="actions">
          <button
            type="button"
            class="primary"
            data-testid="work-import-apply"
            ?disabled=${totalSelected === 0}
            @click=${(): void => void this.#apply()}
          >
            Apply ${totalSelected} selected
          </button>
          <button
            type="button"
            class="secondary"
            data-testid="work-import-cancel"
            @click=${(): void => this.#reset()}
          >
            Discard plan
          </button>
        </div>
      </section>
    `;
  }

  #renderRiskTable(items: readonly RiskPlanItem[]): TemplateResult {
    if (items.length === 0) {
      return html`<h4>Risks</h4>
        <p class="empty">No risks in payload.</p>`;
    }
    const adds = items.filter((i) => i.mode === 'add');
    const updates = items.filter((i) => i.mode === 'update');
    return html`
      <h4>Risks (${items.length})</h4>
      <div class="bulk">
        ${adds.length > 0
          ? html`<button
                type="button"
                data-testid="work-import-select-new-risks"
                @click=${(): void => this.#bulkRisks(adds, true)}
              >
                Select all new (${adds.length})
              </button>
              <button type="button" @click=${(): void => this.#bulkRisks(adds, false)}>
                Clear new
              </button>`
          : ''}
        ${updates.length > 0
          ? html`<button
                type="button"
                data-testid="work-import-select-updated-risks"
                @click=${(): void => this.#bulkRisks(updates, true)}
              >
                Select all updates (${updates.length})
              </button>
              <button type="button" @click=${(): void => this.#bulkRisks(updates, false)}>
                Clear updates
              </button>`
          : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Apply</span></th>
            <th scope="col">Mode</th>
            <th scope="col">ID</th>
            <th scope="col">Title</th>
            <th scope="col">Likelihood × Impact</th>
            <th scope="col">Status</th>
            <th scope="col">Changes</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => this.#renderRiskRow(item))}
        </tbody>
      </table>
    `;
  }

  #renderRiskRow(item: RiskPlanItem): TemplateResult {
    const checked = this.selectedRiskIndexes.has(item.index);
    return html`
      <tr data-testid=${`work-import-risk-row-${item.index}`}>
        <td>
          <input
            type="checkbox"
            aria-label=${`Apply risk ${item.next.title}`}
            .checked=${checked}
            @change=${(e: Event): void =>
              this.#toggleRisk(item.index, (e.target as HTMLInputElement).checked)}
          />
        </td>
        <td><span class=${`badge ${item.mode}`}>${item.mode}</span></td>
        <td><code>${item.next.id}</code></td>
        <td>${item.next.title}</td>
        <td>${item.next.likelihood} × ${item.next.impact}</td>
        <td>${item.next.status}</td>
        <td>
          ${item.mode === 'update'
            ? item.changedFields.length > 0
              ? html`<span class="changes">${item.changedFields.join(', ')}</span>`
              : html`<span class="empty">no changes</span>`
            : ''}
        </td>
      </tr>
    `;
  }

  #renderActionTable(items: readonly ActionPlanItem[]): TemplateResult {
    if (items.length === 0) {
      return html`<h4>Actions</h4>
        <p class="empty">No actions in payload.</p>`;
    }
    const adds = items.filter((i) => i.mode === 'add');
    const updates = items.filter((i) => i.mode === 'update');
    return html`
      <h4>Actions (${items.length})</h4>
      <div class="bulk">
        ${adds.length > 0
          ? html`<button
                type="button"
                data-testid="work-import-select-new-actions"
                @click=${(): void => this.#bulkActions(adds, true)}
              >
                Select all new (${adds.length})
              </button>
              <button type="button" @click=${(): void => this.#bulkActions(adds, false)}>
                Clear new
              </button>`
          : ''}
        ${updates.length > 0
          ? html`<button
                type="button"
                data-testid="work-import-select-updated-actions"
                @click=${(): void => this.#bulkActions(updates, true)}
              >
                Select all updates (${updates.length})
              </button>
              <button type="button" @click=${(): void => this.#bulkActions(updates, false)}>
                Clear updates
              </button>`
          : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Apply</span></th>
            <th scope="col">Mode</th>
            <th scope="col">ID</th>
            <th scope="col">Title</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col">Changes</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => this.#renderActionRow(item))}
        </tbody>
      </table>
    `;
  }

  #renderActionRow(item: ActionPlanItem): TemplateResult {
    const checked = this.selectedActionIndexes.has(item.index);
    return html`
      <tr data-testid=${`work-import-action-row-${item.index}`}>
        <td>
          <input
            type="checkbox"
            aria-label=${`Apply action ${item.next.title}`}
            .checked=${checked}
            @change=${(e: Event): void =>
              this.#toggleAction(item.index, (e.target as HTMLInputElement).checked)}
          />
        </td>
        <td><span class=${`badge ${item.mode}`}>${item.mode}</span></td>
        <td><code>${item.next.id}</code></td>
        <td>${item.next.title}</td>
        <td>${item.next.type}</td>
        <td>${item.next.status}</td>
        <td>
          ${item.mode === 'update'
            ? item.changedFields.length > 0
              ? html`<span class="changes">${item.changedFields.join(', ')}</span>`
              : html`<span class="empty">no changes</span>`
            : ''}
        </td>
      </tr>
    `;
  }

  #toggleRisk(index: number, checked: boolean): void {
    const next = new Set(this.selectedRiskIndexes);
    if (checked) next.add(index);
    else next.delete(index);
    this.selectedRiskIndexes = next;
  }

  #toggleAction(index: number, checked: boolean): void {
    const next = new Set(this.selectedActionIndexes);
    if (checked) next.add(index);
    else next.delete(index);
    this.selectedActionIndexes = next;
  }

  #bulkRisks(items: readonly RiskPlanItem[], select: boolean): void {
    const next = new Set(this.selectedRiskIndexes);
    for (const item of items) {
      if (select) next.add(item.index);
      else next.delete(item.index);
    }
    this.selectedRiskIndexes = next;
  }

  #bulkActions(items: readonly ActionPlanItem[], select: boolean): void {
    const next = new Set(this.selectedActionIndexes);
    for (const item of items) {
      if (select) next.add(item.index);
      else next.delete(item.index);
    }
    this.selectedActionIndexes = next;
  }

  #reset(): void {
    this.plan = null;
    this.selectedRiskIndexes = new Set();
    this.selectedActionIndexes = new Set();
    this.errorMessage = '';
  }

  async #parse(event: Event): Promise<void> {
    if (!this.store) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage = '';
    this.lastSummary = null;
    this.plan = null;
    this.selectedRiskIndexes = new Set();
    this.selectedActionIndexes = new Set();
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const payload = validateRiskActionImport(parsed);
      const store = this.store;
      const risksById = new Map(store.risks.value.map((r) => [r.id, r]));
      const actionsById = new Map(store.actions.value.map((a) => [a.id, a]));
      this.plan = planRiskActionImport(payload, { risksById, actionsById });
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      input.value = '';
    }
  }

  async #apply(): Promise<void> {
    if (!this.plan || !this.store) return;
    const store = this.store;
    try {
      const summary = await applyRiskActionImport(
        this.plan,
        { risks: this.selectedRiskIndexes, actions: this.selectedActionIndexes },
        {
          upsertRiskRecord: (risk) => store.upsertRiskRecord(risk),
          upsertActionRecord: (action) => store.upsertActionRecord(action),
        },
      );
      this.lastSummary = summary;
      this.plan = null;
      this.selectedRiskIndexes = new Set();
      this.selectedActionIndexes = new Set();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : String(err);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-risk-action-import-view': RiskActionImportView;
  }
}
