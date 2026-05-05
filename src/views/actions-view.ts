import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import {
  ACTION_STATUSES,
  ACTION_TYPES,
  type Action,
  type ActionStatus,
  type ActionType,
} from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';

function isOverdue(a: Action): boolean {
  if (!a.dueAt) return false;
  if (a.status === 'done' || a.status === 'cancelled') return false;
  return new Date(a.dueAt).getTime() < Date.now();
}

@customElement('pspf-actions-view')
export class ActionsView extends LitElement {
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
        grid-template-columns: 1fr 9rem 9rem 10rem auto;
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
      ul.actions {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      li.action {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
      }
      li.action[data-overdue='true'] {
        border-color: #b34a00;
      }
      li.action header {
        display: flex;
        gap: var(--space-2);
        align-items: baseline;
        flex-wrap: wrap;
      }
      .pill {
        display: inline-flex;
        padding: 2px var(--space-1);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        background: var(--colour-bg);
        border: 1px solid var(--colour-border);
      }
      .pill.overdue {
        background: #b34a00;
        color: #fff;
        border-color: #b34a00;
      }
      .meta {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      p.desc {
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
        grid-template-columns: 1fr 9rem 9rem 10rem;
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
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.actions] : []));

  @state() private newTitle = '';
  @state() private newDescription = '';
  @state() private newType: ActionType = 'remediation';
  @state() private newStatus: ActionStatus = 'todo';
  @state() private newDueAt = '';

  @state() private editingId: string | undefined;
  @state() private editTitle = '';
  @state() private editDescription = '';
  @state() private editType: ActionType = 'remediation';
  @state() private editStatus: ActionStatus = 'todo';
  @state() private editDueAt = '';

  override render(): TemplateResult {
    const actions = this.store?.actions.value ?? [];
    return html`
      <article>
        <h2>Action tracker</h2>
        <p>
          Track remediation, uplift, review and investigation actions. Items past their due date are
          flagged as overdue (excluding done/cancelled).
        </p>
        ${this.#createForm()}
        ${actions.length === 0
          ? html`<p class="empty">No actions recorded yet.</p>`
          : html`
              <ul class="actions">
                ${actions.map((a) => this.#actionItem(a))}
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
          Type
          <select
            .value=${this.newType}
            @change=${(e: Event): void => {
              this.newType = (e.target as HTMLSelectElement).value as ActionType;
            }}
          >
            ${ACTION_TYPES.map((t) => html`<option value=${t}>${t}</option>`)}
          </select>
        </label>
        <label class="field">
          Status
          <select
            .value=${this.newStatus}
            @change=${(e: Event): void => {
              this.newStatus = (e.target as HTMLSelectElement).value as ActionStatus;
            }}
          >
            ${ACTION_STATUSES.map((s) => html`<option value=${s}>${s}</option>`)}
          </select>
        </label>
        <label class="field">
          Due
          <input
            type="date"
            .value=${this.newDueAt}
            @input=${(e: Event): void => {
              this.newDueAt = (e.target as HTMLInputElement).value;
            }}
          />
        </label>
        <button class="primary" type="submit" ?disabled=${this.newTitle.trim() === ''}>
          Add action
        </button>
      </form>
    `;
  }

  #actionItem(a: Action): TemplateResult {
    const overdue = isOverdue(a);
    const isEditing = this.editingId === a.id;
    return html`
      <li class="action" data-overdue=${overdue ? 'true' : 'false'}>
        <header>
          <strong>${a.title}</strong>
          <span class="pill">${a.type}</span>
          <span class="pill">${a.status}</span>
          ${a.dueAt
            ? html`<span class="pill ${overdue ? 'overdue' : ''}">due ${a.dueAt}</span>`
            : ''}
        </header>
        ${isEditing ? this.#editForm(a) : this.#viewBody(a)}
      </li>
    `;
  }

  #viewBody(a: Action): TemplateResult {
    return html`
      ${a.description ? html`<p class="desc">${a.description}</p>` : ''}
      <div class="row">
        <button @click=${(): void => this.#startEdit(a)}>Edit</button>
        <button @click=${(): void => void this.#remove(a)}>Delete</button>
      </div>
    `;
  }

  #editForm(a: Action): TemplateResult {
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
          Type
          <select
            .value=${this.editType}
            @change=${(e: Event): void => {
              this.editType = (e.target as HTMLSelectElement).value as ActionType;
            }}
          >
            ${ACTION_TYPES.map((t) => html`<option value=${t}>${t}</option>`)}
          </select>
        </label>
        <label class="field">
          Status
          <select
            .value=${this.editStatus}
            @change=${(e: Event): void => {
              this.editStatus = (e.target as HTMLSelectElement).value as ActionStatus;
            }}
          >
            ${ACTION_STATUSES.map((s) => html`<option value=${s}>${s}</option>`)}
          </select>
        </label>
        <label class="field">
          Due
          <input
            type="date"
            .value=${this.editDueAt}
            @input=${(e: Event): void => {
              this.editDueAt = (e.target as HTMLInputElement).value;
            }}
          />
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
        <button class="primary" @click=${(): void => void this.#saveEdit(a)}>Save</button>
        <button @click=${(): void => this.#cancelEdit()}>Cancel</button>
      </div>
    `;
  }

  #startEdit(a: Action): void {
    this.editingId = a.id;
    this.editTitle = a.title;
    this.editDescription = a.description ?? '';
    this.editType = a.type;
    this.editStatus = a.status;
    this.editDueAt = a.dueAt ?? '';
  }

  #cancelEdit(): void {
    this.editingId = undefined;
  }

  async #create(): Promise<void> {
    if (!this.store) return;
    const title = this.newTitle.trim();
    if (!title) return;
    const desc = this.newDescription.trim();
    const due = this.newDueAt.trim();
    await this.store.createAction({
      title,
      ...(desc ? { description: desc } : {}),
      type: this.newType,
      status: this.newStatus,
      ...(due ? { dueAt: due } : {}),
      requirementIds: [],
      riskIds: [],
    });
    this.newTitle = '';
    this.newDescription = '';
    this.newType = 'remediation';
    this.newStatus = 'todo';
    this.newDueAt = '';
  }

  async #saveEdit(a: Action): Promise<void> {
    if (!this.store) return;
    const title = this.editTitle.trim();
    if (!title) return;
    const desc = this.editDescription.trim();
    const due = this.editDueAt.trim();
    await this.store.updateAction(a.id, {
      title,
      ...(desc ? { description: desc } : {}),
      type: this.editType,
      status: this.editStatus,
      ...(due ? { dueAt: due } : {}),
    });
    this.editingId = undefined;
  }

  async #remove(a: Action): Promise<void> {
    if (!this.store) return;
    if (
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function' &&
      !window.confirm(`Delete action "${a.title}"?`)
    ) {
      return;
    }
    await this.store.removeAction(a.id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-actions-view': ActionsView;
  }
}
