/**
 * PSPF Directions register.
 *
 * Directions are ad-hoc supplementary instructions issued by Home Affairs
 * (or sector-specific authorities) that bind to one or more PSPF
 * requirements. This view supports CRUD over the `directions` store.
 */

import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { asRequirementId, type Direction, type DirectionId } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';

function parseRequirementIds(raw: string): readonly ReturnType<typeof asRequirementId>[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(asRequirementId);
}

@customElement('pspf-directions-view')
export class DirectionsView extends LitElement {
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
        grid-template-columns: 8rem 1fr 10rem auto;
        gap: var(--space-2);
        align-items: end;
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-3);
      }
      form.create .full {
        grid-column: 1 / -1;
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
      textarea {
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
        min-height: 3.5rem;
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
      ul.list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      li.direction {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
      }
      .ref {
        font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
        font-size: var(--text-sm);
        color: var(--colour-fg-muted);
      }
      .meta {
        display: flex;
        gap: var(--space-3);
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
        margin-top: var(--space-1);
        flex-wrap: wrap;
      }
      .req-list {
        display: flex;
        gap: var(--space-1);
        flex-wrap: wrap;
        margin-top: var(--space-1);
      }
      .req-list a {
        font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
        font-size: var(--text-xs);
        background: var(--colour-bg);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        padding: 2px 6px;
        color: var(--colour-accent);
        text-decoration: none;
      }
      .actions {
        display: flex;
        gap: var(--space-1);
        margin-top: var(--space-2);
      }
      .empty {
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.directions] : []));

  @state() private accessor reference = '';
  @state() private accessor newTitle = '';
  @state() private accessor issuedAt = '';
  @state() private accessor description = '';
  @state() private accessor reqRefs = '';

  @state() private accessor editingId: DirectionId | null = null;
  @state() private accessor editReference = '';
  @state() private accessor editTitle = '';
  @state() private accessor editIssuedAt = '';
  @state() private accessor editDescription = '';
  @state() private accessor editReqRefs = '';

  override render(): TemplateResult {
    const directions = this.store?.directions.value ?? [];
    return html`
      <article>
        <h2>Directions register</h2>
        <p>
          Track PSPF Directions issued by Home Affairs and other authorities. Link each Direction to
          the requirements it modifies or supplements.
        </p>

        <form
          class="create"
          @submit=${(e: Event): void => {
            e.preventDefault();
            void this.#create();
          }}
          aria-label="Add direction"
        >
          <label class="field">
            Reference
            <input
              type="text"
              required
              placeholder="e.g. PSPF Direction 001-2025"
              .value=${this.reference}
              @input=${(e: Event): void => {
                this.reference = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
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
            Issued
            <input
              type="date"
              required
              .value=${this.issuedAt}
              @input=${(e: Event): void => {
                this.issuedAt = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <button class="primary" type="submit" ?disabled=${!this.#canCreate()}>
            Add direction
          </button>
          <label class="field full">
            Description
            <textarea
              .value=${this.description}
              @input=${(e: Event): void => {
                this.description = (e.target as HTMLTextAreaElement).value;
              }}
            ></textarea>
          </label>
          <label class="field full">
            Linked requirement IDs (comma or space separated, e.g. GOV-1 INF-3)
            <input
              type="text"
              .value=${this.reqRefs}
              @input=${(e: Event): void => {
                this.reqRefs = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
        </form>

        ${directions.length === 0
          ? html`<p class="empty" data-testid="empty">
              No directions recorded yet. Add the first one above.
            </p>`
          : html`
              <ul class="list">
                ${directions.map((d) => this.#renderItem(d))}
              </ul>
            `}
      </article>
    `;
  }

  #renderItem(d: Direction): TemplateResult {
    if (this.editingId === d.id) return this.#renderEdit(d);
    return html`
      <li class="direction" data-id=${d.id}>
        <div>
          <strong>${d.title}</strong>
          <div class="ref">${d.reference}</div>
        </div>
        ${d.description ? html`<p>${d.description}</p>` : ''}
        <div class="meta"><span>Issued: ${d.issuedAt}</span></div>
        ${d.requirementIds.length > 0
          ? html`
              <div class="req-list" aria-label="Linked requirements">
                ${d.requirementIds.map((id) => html`<a href="#/requirement/${id}">${id}</a>`)}
              </div>
            `
          : ''}
        <div class="actions">
          <button @click=${(): void => this.#startEdit(d)}>Edit</button>
          <button @click=${(): void => void this.#remove(d)}>Delete</button>
        </div>
      </li>
    `;
  }

  #renderEdit(d: Direction): TemplateResult {
    return html`
      <li class="direction" data-id=${d.id}>
        <form
          @submit=${(e: Event): void => {
            e.preventDefault();
            void this.#saveEdit(d);
          }}
        >
          <label class="field">
            Reference
            <input
              type="text"
              required
              .value=${this.editReference}
              @input=${(e: Event): void => {
                this.editReference = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <label class="field">
            Title
            <input
              type="text"
              required
              .value=${this.editTitle}
              @input=${(e: Event): void => {
                this.editTitle = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <label class="field">
            Issued
            <input
              type="date"
              required
              .value=${this.editIssuedAt}
              @input=${(e: Event): void => {
                this.editIssuedAt = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <label class="field">
            Description
            <textarea
              .value=${this.editDescription}
              @input=${(e: Event): void => {
                this.editDescription = (e.target as HTMLTextAreaElement).value;
              }}
            ></textarea>
          </label>
          <label class="field">
            Linked requirement IDs
            <input
              type="text"
              .value=${this.editReqRefs}
              @input=${(e: Event): void => {
                this.editReqRefs = (e.target as HTMLInputElement).value;
              }}
            />
          </label>
          <div class="actions">
            <button class="primary" type="submit">Save</button>
            <button type="button" @click=${(): void => this.#cancelEdit()}>Cancel</button>
          </div>
        </form>
      </li>
    `;
  }

  #canCreate(): boolean {
    return (
      this.reference.trim().length > 0 &&
      this.newTitle.trim().length > 0 &&
      this.issuedAt.length > 0
    );
  }

  async #create(): Promise<void> {
    if (!this.store || !this.#canCreate()) return;
    await this.store.createDirection({
      reference: this.reference.trim(),
      title: this.newTitle.trim(),
      issuedAt: this.issuedAt,
      ...(this.description.trim() ? { description: this.description.trim() } : {}),
      requirementIds: parseRequirementIds(this.reqRefs),
    });
    this.reference = '';
    this.newTitle = '';
    this.issuedAt = '';
    this.description = '';
    this.reqRefs = '';
  }

  #startEdit(d: Direction): void {
    this.editingId = d.id;
    this.editReference = d.reference;
    this.editTitle = d.title;
    this.editIssuedAt = d.issuedAt;
    this.editDescription = d.description ?? '';
    this.editReqRefs = d.requirementIds.join(', ');
  }

  #cancelEdit(): void {
    this.editingId = null;
  }

  async #saveEdit(d: Direction): Promise<void> {
    if (!this.store) return;
    const desc = this.editDescription.trim();
    await this.store.updateDirection(d.id, {
      reference: this.editReference.trim(),
      title: this.editTitle.trim(),
      issuedAt: this.editIssuedAt,
      ...(desc ? { description: desc } : {}),
      requirementIds: parseRequirementIds(this.editReqRefs),
    });
    this.editingId = null;
  }

  async #remove(d: Direction): Promise<void> {
    if (!this.store) return;
    const ok = window.confirm(`Delete direction "${d.reference}"?`);
    if (!ok) return;
    await this.store.removeDirection(d.id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-directions-view': DirectionsView;
  }
}
