import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import type { Relationship, RelationshipKind } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import { allRequirements } from '../pspf/index.ts';

const KINDS: readonly {
  value: RelationshipKind;
  label: string;
  left: string;
  right: string;
}[] = [
  {
    value: 'requirement-risk',
    label: 'Requirement ↔ Risk',
    left: 'Requirement',
    right: 'Risk',
  },
  {
    value: 'requirement-action',
    label: 'Requirement ↔ Action',
    left: 'Requirement',
    right: 'Action',
  },
  {
    value: 'risk-action',
    label: 'Risk ↔ Action',
    left: 'Risk',
    right: 'Action',
  },
  {
    value: 'requirement-direction',
    label: 'Requirement ↔ Direction',
    left: 'Requirement',
    right: 'Direction',
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
  #watcher = new SignalWatcher(this, () =>
    this.store
      ? [this.store.relationships, this.store.risks, this.store.actions, this.store.directions]
      : [],
  );

  @state() private accessor kind: RelationshipKind = 'requirement-risk';
  @state() private accessor left = '';
  @state() private accessor right = '';
  @state() private accessor filterKind: RelationshipKind | 'all' = 'all';

  #requirementOptions = allRequirements.map((req) => ({
    id: req.id,
    label: `${req.id} – ${req.title}`,
  }));

  override render(): TemplateResult {
    const all = this.store?.relationships.value ?? [];
    const visible = this.filterKind === 'all' ? all : all.filter((r) => r.kind === this.filterKind);
    const meta = KINDS.find((k) => k.value === this.kind) ?? KINDS[0]!;
    const leftOptions = this.#endpointOptions(this.kind, 'left');
    const rightOptions = this.#endpointOptions(this.kind, 'right');

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
                this.left = '';
                this.right = '';
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
            <select
              aria-label=${meta.left}
              required
              @change=${(e: Event): void => {
                this.left = (e.target as HTMLSelectElement).value;
              }}
            >
              <option value="" ?selected=${this.left === ''}>— select —</option>
              ${leftOptions.map(
                (opt) =>
                  html`<option value=${opt.id} ?selected=${opt.id === this.left}>
                    ${opt.label}
                  </option>`,
              )}
            </select>
          </label>
          <label class="field">
            ${meta.right}
            <select
              aria-label=${meta.right}
              required
              @change=${(e: Event): void => {
                this.right = (e.target as HTMLSelectElement).value;
              }}
            >
              <option value="" ?selected=${this.right === ''}>— select —</option>
              ${rightOptions.map(
                (opt) =>
                  html`<option value=${opt.id} ?selected=${opt.id === this.right}>
                    ${opt.label}
                  </option>`,
              )}
            </select>
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
        <td class="endpoint">${this.#lookupLabel(r.endpoints[0])}</td>
        <td class="endpoint">${this.#lookupLabel(r.endpoints[1])}</td>
        <td>
          <button @click=${(): void => void this.#remove(r)} aria-label="Delete relationship">
            Delete
          </button>
        </td>
      </tr>
    `;
  }

  #canCreate(): boolean {
    const left = this.left.trim();
    const right = this.right.trim();
    if (left.length === 0 || right.length === 0) return false;
    return (
      this.#isValidEndpoint(this.kind, 'left', left) &&
      this.#isValidEndpoint(this.kind, 'right', right)
    );
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

  #endpointOptions(
    kind: RelationshipKind,
    side: 'left' | 'right',
  ): readonly {
    id: string;
    label: string;
  }[] {
    const risks = (this.store?.risks.value ?? []).map((risk) => ({
      id: risk.id,
      label: risk.title,
    }));
    const actions = (this.store?.actions.value ?? []).map((action) => ({
      id: action.id,
      label: action.title,
    }));
    const directions = (this.store?.directions.value ?? []).map((direction) => ({
      id: direction.id,
      label: `${direction.reference} – ${direction.title}`,
    }));
    switch (kind) {
      case 'requirement-risk':
        return side === 'left' ? this.#requirementOptions : risks;
      case 'requirement-action':
        return side === 'left' ? this.#requirementOptions : actions;
      case 'risk-action':
        return side === 'left' ? risks : actions;
      case 'requirement-direction':
        return side === 'left' ? this.#requirementOptions : directions;
    }
  }

  #isValidEndpoint(kind: RelationshipKind, side: 'left' | 'right', id: string): boolean {
    const value = id.trim();
    if (value.length === 0) return false;
    const options = this.#endpointOptions(kind, side);
    return options.some((opt) => opt.id === value);
  }

  #lookupLabel(id: string): string {
    const req = allRequirements.find((r) => r.id === id);
    if (req) return `${req.id} – ${req.title}`;
    const risk = this.store?.risks.value.find((r) => r.id === id);
    if (risk) return risk.title;
    const action = this.store?.actions.value.find((a) => a.id === id);
    if (action) return action.title;
    const direction = this.store?.directions.value.find((d) => d.id === id);
    if (direction) return `${direction.reference} – ${direction.title}`;
    return id;
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
