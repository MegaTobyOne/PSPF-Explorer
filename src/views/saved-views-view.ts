import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import {
  COMPLIANCE_STATES,
  DOMAIN_KEYS,
  type ComplianceEntry,
  type ComplianceState,
  type DomainKey,
  type RequirementId,
  type SavedView,
  type SavedViewFilters,
} from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import { applyFilters, filtersAreEmpty, summariseFilters } from '../domain/filtering.ts';
import { complianceLabel } from '../domain/compliance-display.ts';
import '../components/compliance-badge.ts';

@customElement('pspf-saved-views-view')
export class SavedViewsView extends LitElement {
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
      .layout {
        display: grid;
        grid-template-columns: minmax(16rem, 22rem) 1fr;
        gap: var(--space-4);
        align-items: start;
      }
      @media (max-width: 800px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
      section.panel {
        padding: var(--space-3);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-md);
        background: var(--colour-bg-elevated);
      }
      h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: var(--text-md);
      }
      label.field {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
        margin-bottom: var(--space-2);
      }
      input[type='text'],
      input[type='search'],
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
      .checkboxes {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: var(--text-sm);
      }
      .row {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-2);
        flex-wrap: wrap;
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
      ul.saved {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      ul.saved li {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: var(--space-2);
        align-items: baseline;
        padding: var(--space-2);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
      }
      ul.saved .meta {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      ul.results {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      ul.results li {
        display: grid;
        grid-template-columns: minmax(5rem, auto) 1fr auto;
        gap: var(--space-2);
        align-items: baseline;
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
      }
      ul.results a {
        color: inherit;
        font-weight: 600;
      }
      .empty {
        padding: var(--space-3);
        border: 1px dashed var(--colour-border);
        border-radius: var(--radius-md);
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
      }
      .summary {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
        margin: 0 0 var(--space-2) 0;
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () =>
    this.store ? [this.store.savedViews, this.store.compliance] : [],
  );

  @state() private filterDomain: DomainKey | '' = '';
  @state() private filterStates: ReadonlySet<ComplianceState> = new Set();
  @state() private filterQ = '';
  @state() private saveName = '';

  private get filters(): SavedViewFilters {
    const f: SavedViewFilters = {};
    if (this.filterDomain !== '') f.domain = this.filterDomain;
    if (this.filterStates.size > 0) f.states = [...this.filterStates];
    if (this.filterQ.trim() !== '') f.q = this.filterQ.trim();
    return f;
  }

  override render(): TemplateResult {
    const compliance: ReadonlyMap<RequirementId, ComplianceEntry> =
      this.store?.compliance.value ?? new Map();
    const saved = this.store?.savedViews.value ?? [];
    const matches = applyFilters(this.filters, { compliance });
    return html`
      <article>
        <h2>Saved views</h2>
        <p>
          Build a filter on the left to browse the requirement catalogue, then save it as a named
          view to come back to later.
        </p>
        <div class="layout">
          ${this.#filtersPanel(saved)} ${this.#resultsPanel(matches, compliance)}
        </div>
      </article>
    `;
  }

  #filtersPanel(saved: readonly SavedView[]): TemplateResult {
    return html`
      <section class="panel" aria-label="Filters and saved views">
        <h3>Filters</h3>
        <label class="field">
          Domain
          <select
            .value=${this.filterDomain}
            @change=${(e: Event): void => {
              const v = (e.target as HTMLSelectElement).value;
              this.filterDomain = v as DomainKey | '';
            }}
          >
            <option value="">Any</option>
            ${DOMAIN_KEYS.map((k) => html`<option value=${k}>${k}</option>`)}
          </select>
        </label>
        <fieldset style="border:0;padding:0;margin:0 0 var(--space-2) 0;">
          <legend style="font-size:var(--text-xs);color:var(--colour-fg-muted);padding:0;">
            Compliance status
          </legend>
          <div class="checkboxes">
            ${COMPLIANCE_STATES.map(
              (s) => html`
                <label>
                  <input
                    type="checkbox"
                    .checked=${this.filterStates.has(s)}
                    @change=${(e: Event): void => {
                      const next = new Set(this.filterStates);
                      if ((e.target as HTMLInputElement).checked) next.add(s);
                      else next.delete(s);
                      this.filterStates = next;
                    }}
                  />
                  ${complianceLabel(s)}
                </label>
              `,
            )}
          </div>
        </fieldset>
        <label class="field">
          Search
          <input
            type="search"
            placeholder="Title or text…"
            .value=${this.filterQ}
            @input=${(e: Event): void => {
              this.filterQ = (e.target as HTMLInputElement).value;
            }}
          />
        </label>
        <div class="row">
          <button
            type="button"
            @click=${(): void => {
              this.filterDomain = '';
              this.filterStates = new Set();
              this.filterQ = '';
            }}
          >
            Reset
          </button>
        </div>

        <h3 style="margin-top: var(--space-3)">Save current filter</h3>
        <label class="field">
          Name
          <input
            type="text"
            .value=${this.saveName}
            @input=${(e: Event): void => {
              this.saveName = (e.target as HTMLInputElement).value;
            }}
            placeholder="e.g. Tech / not-set"
          />
        </label>
        <div class="row">
          <button
            class="primary"
            type="button"
            ?disabled=${this.saveName.trim() === '' || filtersAreEmpty(this.filters)}
            @click=${(): void => void this.#save()}
          >
            Save view
          </button>
        </div>

        <h3 style="margin-top: var(--space-3)">Saved</h3>
        ${saved.length === 0
          ? html`<p class="empty">No saved views yet.</p>`
          : html`
              <ul class="saved">
                ${saved.map(
                  (sv) => html`
                    <li>
                      <div>
                        <strong>${sv.name}</strong>
                        <div class="meta">${summariseFilters(sv.filters)}</div>
                      </div>
                      <button @click=${(): void => this.#load(sv)}>Load</button>
                      <button @click=${(): void => void this.#remove(sv)}>Delete</button>
                    </li>
                  `,
                )}
              </ul>
            `}
      </section>
    `;
  }

  #resultsPanel(
    matches: ReturnType<typeof applyFilters>,
    compliance: ReadonlyMap<RequirementId, ComplianceEntry>,
  ): TemplateResult {
    return html`
      <section class="panel" aria-label="Filter results">
        <h3>Results (${matches.length})</h3>
        <p class="summary">${summariseFilters(this.filters)}</p>
        ${matches.length === 0
          ? html`<p class="empty">No requirements match the current filter.</p>`
          : html`
              <ul class="results">
                ${matches.slice(0, 200).map((r) => {
                  const entry = compliance.get(r.id);
                  const state: ComplianceState = entry ? entry.state : 'not-set';
                  return html`
                    <li>
                      <a href="#/requirement/${r.id}">${r.id}</a>
                      <span>${r.title}</span>
                      <pspf-compliance-badge .state=${state}></pspf-compliance-badge>
                    </li>
                  `;
                })}
              </ul>
              ${matches.length > 200
                ? html`<p class="summary">Showing first 200 of ${matches.length}.</p>`
                : ''}
            `}
      </section>
    `;
  }

  async #save(): Promise<void> {
    if (!this.store) return;
    const name = this.saveName.trim();
    if (!name) return;
    await this.store.createSavedView(name, this.filters);
    this.saveName = '';
  }

  #load(sv: SavedView): void {
    this.filterDomain = sv.filters.domain ?? '';
    this.filterStates = new Set(sv.filters.states ?? []);
    this.filterQ = sv.filters.q ?? '';
  }

  async #remove(sv: SavedView): Promise<void> {
    if (!this.store) return;
    if (
      typeof window !== 'undefined' &&
      typeof window.confirm === 'function' &&
      !window.confirm(`Delete saved view "${sv.name}"?`)
    ) {
      return;
    }
    await this.store.removeSavedView(sv.id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-saved-views-view': SavedViewsView;
  }
}
