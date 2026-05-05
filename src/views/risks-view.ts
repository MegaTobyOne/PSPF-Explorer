import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { RISK_STATUSES, type LikelihoodImpact, type Risk, type RiskStatus } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';

const SCALE: readonly LikelihoodImpact[] = [1, 2, 3, 4, 5];

function riskScore(r: Pick<Risk, 'likelihood' | 'impact'>): number {
  return r.likelihood * r.impact;
}

function riskBand(score: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (score >= 16) return 'extreme';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

@customElement('pspf-risks-view')
export class RisksView extends LitElement {
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
      form.create {
        display: grid;
        grid-template-columns: 1fr 8rem 8rem 9rem auto;
        gap: var(--space-2);
        align-items: end;
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-3);
      }
      @media (max-width: 800px) {
        form.create {
          grid-template-columns: 1fr 1fr;
        }
      }
      label.field {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      input[type='text'],
      textarea,
      select {
        font: inherit;
        color: inherit;
        background: var(--colour-bg);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        padding: var(--space-1) var(--space-2);
        width: 100%;
        box-sizing: border-box;
      }
      textarea {
        min-height: 4rem;
        resize: vertical;
      }
      button {
        font: inherit;
        cursor: pointer;
        background: var(--colour-bg);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        padding: var(--space-1) var(--space-2);
        color: inherit;
      }
      button.primary {
        background: var(--colour-accent);
        color: var(--colour-accent-fg);
        border-color: var(--colour-accent);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      ul.risks {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      li.risk {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
      }
      li.risk header {
        display: flex;
        gap: var(--space-2);
        align-items: baseline;
        flex-wrap: wrap;
      }
      li.risk .score {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px var(--space-1);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        font-weight: 600;
        background: var(--band-bg, var(--colour-bg));
        color: var(--band-fg, var(--colour-fg));
      }
      li.risk[data-band='low'] {
        --band-bg: #2f6f3a;
        --band-fg: #fff;
      }
      li.risk[data-band='medium'] {
        --band-bg: #b8860b;
        --band-fg: #fff;
      }
      li.risk[data-band='high'] {
        --band-bg: #b34a00;
        --band-fg: #fff;
      }
      li.risk[data-band='extreme'] {
        --band-bg: #99182c;
        --band-fg: #fff;
      }
      li.risk .meta {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      li.risk p.desc {
        margin: var(--space-2) 0;
        font-size: var(--text-sm);
      }
      .row {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .empty {
        padding: var(--space-3);
        border: 1px dashed var(--colour-border);
        border-radius: var(--radius-md);
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
      }
      .edit-grid {
        display: grid;
        grid-template-columns: 1fr 8rem 8rem 9rem;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }
      @media (max-width: 800px) {
        .edit-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.risks] : []));

  // Create form
  @state() private newTitle = '';
  @state() private newDescription = '';
  @state() private likelihood: LikelihoodImpact = 3;
  @state() private impact: LikelihoodImpact = 3;
  @state() private status: RiskStatus = 'open';

  // Edit state
  @state() private editingId: string | undefined;
  @state() private editTitle = '';
  @state() private editDescription = '';
  @state() private editLikelihood: LikelihoodImpact = 3;
  @state() private editImpact: LikelihoodImpact = 3;
  @state() private editStatus: RiskStatus = 'open';

  override render(): TemplateResult {
    const risks = this.store?.risks.value ?? [];
    return html`
      <article>
        <h2>Risk register</h2>
        <p>
          Capture risks against the security programme. Score = likelihood × impact (1–25). Link to
          requirements and actions in a future iteration.
        </p>
        ${this.#createForm()}
        ${risks.length === 0
          ? html`<p class="empty">No risks recorded yet.</p>`
          : html`
              <ul class="risks">
                ${risks.map((r) => this.#riskItem(r))}
              </ul>
            `}
      </article>
    `;
  }

  #createForm(): TemplateResult {
    return html`
      <form
        class="create"
        @submit=${(e: Event): void => {
          e.preventDefault();
          void this.#create();
        }}
      >
        <label class="field">
          Title
          <input
            type="text"
            required
            .value=${this.newTitle}
            @input=${(e: Event): void => {
              this.newTitle = (e.target as HTMLInputElement).value;
            }}
          />
        </label>
        <label class="field">
          Likelihood
          <select
            .value=${String(this.likelihood)}
            @change=${(e: Event): void => {
              this.likelihood = Number((e.target as HTMLSelectElement).value) as LikelihoodImpact;
            }}
          >
            ${SCALE.map((n) => html`<option value=${n}>${n}</option>`)}
          </select>
        </label>
        <label class="field">
          Impact
          <select
            .value=${String(this.impact)}
            @change=${(e: Event): void => {
              this.impact = Number((e.target as HTMLSelectElement).value) as LikelihoodImpact;
            }}
          >
            ${SCALE.map((n) => html`<option value=${n}>${n}</option>`)}
          </select>
        </label>
        <label class="field">
          Status
          <select
            .value=${this.status}
            @change=${(e: Event): void => {
              this.status = (e.target as HTMLSelectElement).value as RiskStatus;
            }}
          >
            ${RISK_STATUSES.map((s) => html`<option value=${s}>${s}</option>`)}
          </select>
        </label>
        <button class="primary" type="submit" ?disabled=${this.newTitle.trim() === ''}>
          Add risk
        </button>
      </form>
    `;
  }

  #riskItem(r: Risk): TemplateResult {
    const isEditing = this.editingId === r.id;
    const score = riskScore(r);
    const band = riskBand(score);
    const ariaLabel = `Risk score ${score}, ${band}`;
    return html`
      <li class="risk" data-band=${band}>
        <header>
          <strong>${r.title}</strong>
          <span class="score" aria-label=${ariaLabel}>
            ${r.likelihood}×${r.impact} → ${score} ${band}
          </span>
          <span class="meta">${r.status}</span>
        </header>
        ${isEditing ? this.#editForm(r) : this.#viewBody(r)}
      </li>
    `;
  }

  #viewBody(r: Risk): TemplateResult {
    return html`
      ${r.description ? html`<p class="desc">${r.description}</p>` : ''}
      <div class="row">
        <button @click=${(): void => this.#startEdit(r)}>Edit</button>
        <button @click=${(): void => void this.#remove(r)}>Delete</button>
      </div>
    `;
  }

  #editForm(r: Risk): TemplateResult {
    return html`
      <div class="edit-grid">
        <label class="field">
          Title
          <input
            type="text"
            .value=${this.editTitle}
            @input=${(e: Event): void => {
              this.editTitle = (e.target as HTMLInputElement).value;
            }}
          />
        </label>
        <label class="field">
          Likelihood
          <select
            .value=${String(this.editLikelihood)}
            @change=${(e: Event): void => {
              this.editLikelihood = Number(
                (e.target as HTMLSelectElement).value,
              ) as LikelihoodImpact;
            }}
          >
            ${SCALE.map((n) => html`<option value=${n}>${n}</option>`)}
          </select>
        </label>
        <label class="field">
          Impact
          <select
            .value=${String(this.editImpact)}
            @change=${(e: Event): void => {
              this.editImpact = Number((e.target as HTMLSelectElement).value) as LikelihoodImpact;
            }}
          >
            ${SCALE.map((n) => html`<option value=${n}>${n}</option>`)}
          </select>
        </label>
        <label class="field">
          Status
          <select
            .value=${this.editStatus}
            @change=${(e: Event): void => {
              this.editStatus = (e.target as HTMLSelectElement).value as RiskStatus;
            }}
          >
            ${RISK_STATUSES.map((s) => html`<option value=${s}>${s}</option>`)}
          </select>
        </label>
      </div>
      <label class="field" style="margin-top: var(--space-2)">
        Description
        <textarea
          .value=${this.editDescription}
          @input=${(e: Event): void => {
            this.editDescription = (e.target as HTMLTextAreaElement).value;
          }}
        ></textarea>
      </label>
      <div class="row" style="margin-top: var(--space-2)">
        <button class="primary" @click=${(): void => void this.#saveEdit(r)}>Save</button>
        <button @click=${(): void => this.#cancelEdit()}>Cancel</button>
      </div>
    `;
  }

  #startEdit(r: Risk): void {
    this.editingId = r.id;
    this.editTitle = r.title;
    this.editDescription = r.description ?? '';
    this.editLikelihood = r.likelihood;
    this.editImpact = r.impact;
    this.editStatus = r.status;
  }

  #cancelEdit(): void {
    this.editingId = undefined;
  }

  async #create(): Promise<void> {
    if (!this.store) return;
    const title = this.newTitle.trim();
    if (!title) return;
    const desc = this.newDescription.trim();
    await this.store.createRisk({
      title,
      ...(desc ? { description: desc } : {}),
      likelihood: this.likelihood,
      impact: this.impact,
      status: this.status,
      requirementIds: [],
      actionIds: [],
    });
    this.newTitle = '';
    this.newDescription = '';
    this.likelihood = 3;
    this.impact = 3;
    this.status = 'open';
  }

  async #saveEdit(r: Risk): Promise<void> {
    if (!this.store) return;
    const title = this.editTitle.trim();
    if (!title) return;
    const desc = this.editDescription.trim();
    await this.store.updateRisk(r.id, {
      title,
      ...(desc ? { description: desc } : {}),
      likelihood: this.editLikelihood,
      impact: this.editImpact,
      status: this.editStatus,
    });
    this.editingId = undefined;
  }

  async #remove(r: Risk): Promise<void> {
    if (!this.store) return;
    if (
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function' &&
      !window.confirm(`Delete risk "${r.title}"?`)
    ) {
      return;
    }
    await this.store.removeRisk(r.id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-risks-view': RisksView;
  }
}
