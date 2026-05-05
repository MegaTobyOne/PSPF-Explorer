import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import type { Relationship, RelationshipKind } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';

const KINDS: readonly {
  value: RelationshipKind;
  label: string;
  left: string;
  right: string;
}[] = [
  {
    value: 'requirement-risk',
    label: 'Requirement ↔ Risk',
    left: 'Requirement ID (e.g. GOV-1)',
    right: 'Risk ID',
  },
  {
    value: 'requirement-action',
    label: 'Requirement ↔ Action',
    left: 'Requirement ID',
    right: 'Action ID',
  },
  {
    value: 'risk-action',
    label: 'Risk ↔ Action',
    left: 'Risk ID',
    right: 'Action ID',
  },
  {
    value: 'requirement-direction',
    label: 'Requirement ↔ Direction',
    left: 'Requirement ID',
    right: 'Direction ID',
  },
];

@customElement('pspf-relationships-view')
export class RelationshipsView extends LitElement {
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
        grid-template-columns: 14rem 1fr 1fr auto;
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
      input,
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
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
      }
      th,
      td {
        text-align: left;
        padding: var(--space-2);
        border-bottom: 1px solid var(--colour-border);
      }
      th {
        color: var(--colour-fg-muted);
        font-size: var(--text-xs);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .endpoint {
        font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
        font-size: var(--text-sm);
      }
      .empty {
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
      }
      fieldset.filter {
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        padding: var(--space-1) var(--space-2);
        margin-bottom: var(--space-2);
      }
      fieldset.filter legend {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.relationships] : []));

  @state() private accessor kind: RelationshipKind = 'requirement-risk';
  @state() private accessor left = '';
  @state() private accessor right = '';
  @state() private accessor filterKind: RelationshipKind | 'all' = 'all';

  override render(): TemplateResult {
    const all = this.store?.relationships.value ?? [];
    const visible = this.filterKind === 'all' ? all : all.filter((r) => r.kind === this.filterKind);
    const meta = KINDS.find((k) => k.value === this.kind) ?? KINDS[0]!;

    return html`
      <article>
        <h2>Relationships</h2>
        <p>
          Cross-link requirements, risks, actions and directions. Relationships are symmetric;
          ordering of endpoints is normalised on save.
        </p>

        <form
          class="create"
          @submit=${(e: Event): void => {
            e.preventDefault();
            void this.#create();
          }}
          aria-label="Add relationship"
        >
          <label class="field">
            Kind
            <select
              @change=${(e: Event): void => {
                this.kind = (e.target as HTMLSelectElement).value as RelationshipKind;
              }}
            >
              ${KINDS.map(
                (k) =>
                  html`<option value=${k.value} ?selected=${k.value === this.kind}>
                    ${k.label}
                  </option>`,
              )}
            </select>
          </label>
          <label class="field">
            ${meta.left}
            <input
              type="text"
              required
              .value=${this.left}
              @input=${(e: Event): void => {
                this.left = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <label class="field">
            ${meta.right}
            <input
              type="text"
              required
              .value=${this.right}
              @input=${(e: Event): void => {
                this.right = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <button class="primary" type="submit" ?disabled=${!this.#canCreate()}>Add link</button>
        </form>

        <fieldset class="filter">
          <legend>Filter</legend>
          <select
            aria-label="Filter by kind"
            @change=${(e: Event): void => {
              this.filterKind = (e.target as HTMLSelectElement).value as RelationshipKind | 'all';
            }}
          >
            <option value="all" ?selected=${this.filterKind === 'all'}>All kinds</option>
            ${KINDS.map(
              (k) =>
                html`<option value=${k.value} ?selected=${k.value === this.filterKind}>
                  ${k.label}
                </option>`,
            )}
          </select>
        </fieldset>

        ${visible.length === 0
          ? html`<p class="empty" data-testid="empty">No relationships recorded.</p>`
          : html`
              <table aria-label="Relationships">
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Endpoint A</th>
                    <th>Endpoint B</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${visible.map((r) => this.#renderRow(r))}
                </tbody>
              </table>
            `}
      </article>
    `;
  }

  #renderRow(r: Relationship): TemplateResult {
    const label = KINDS.find((k) => k.value === r.kind)?.label ?? r.kind;
    return html`
      <tr data-id=${r.id}>
        <td>${label}</td>
        <td class="endpoint">${r.endpoints[0]}</td>
        <td class="endpoint">${r.endpoints[1]}</td>
        <td>
          <button @click=${(): void => void this.#remove(r)} aria-label="Delete relationship">
            Delete
          </button>
        </td>
      </tr>
    `;
  }

  #canCreate(): boolean {
    return this.left.trim().length > 0 && this.right.trim().length > 0;
  }

  async #create(): Promise<void> {
    if (!this.store || !this.#canCreate()) return;
    await this.store.createRelationship({
      kind: this.kind,
      endpoints: [this.left.trim(), this.right.trim()],
    });
    this.left = '';
    this.right = '';
  }

  async #remove(r: Relationship): Promise<void> {
    if (!this.store) return;
    const ok = window.confirm('Delete this relationship?');
    if (!ok) return;
    await this.store.removeRelationship(r.id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-relationships-view': RelationshipsView;
  }
}
