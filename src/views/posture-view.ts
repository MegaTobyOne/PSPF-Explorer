import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import {
  DOMAIN_KEYS,
  POSTURES,
  THREAT_LEVELS,
  type DomainKey,
  type Posture,
  type PostureRecord,
  type PostureSetting,
  type ThreatLevel,
} from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';

const DEFAULT_GLOBAL: PostureSetting = {
  threat: 'low',
  posture: 'standard',
  updatedAt: new Date(0).toISOString(),
};

@customElement('pspf-posture-view')
export class PostureView extends LitElement {
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
      .row {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        align-items: end;
      }
      label.field {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
        min-width: 12rem;
      }
      select {
        font: inherit;
        color: inherit;
        background: var(--colour-bg);
        border: 1px solid var(--colour-border);
        border-radius: var(--radius-sm);
        padding: var(--space-1) var(--space-2);
      }
      .meta {
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
      }
      table.domains {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
      }
      table.domains th,
      table.domains td {
        text-align: left;
        padding: var(--space-1) var(--space-2);
        border-bottom: 1px solid var(--colour-border);
      }
      .badge {
        display: inline-flex;
        padding: 2px var(--space-1);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        background: var(--badge-bg, var(--colour-bg));
        color: var(--badge-fg, var(--colour-fg));
        border: 1px solid var(--colour-border);
      }
      .badge[data-threat='low'] {
        --badge-bg: #2f6f3a;
        --badge-fg: #fff;
      }
      .badge[data-threat='elevated'] {
        --badge-bg: #b8860b;
        --badge-fg: #fff;
      }
      .badge[data-threat='high'] {
        --badge-bg: #b34a00;
        --badge-fg: #fff;
      }
      .badge[data-threat='critical'] {
        --badge-bg: #99182c;
        --badge-fg: #fff;
      }
    `,
  ];

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.posture] : []));

  override render(): TemplateResult {
    const record = this.store?.posture.value;
    const global = record?.global ?? DEFAULT_GLOBAL;
    return html`
      <article>
        <h2>Posture &amp; threat level</h2>
        <p>
          Set the organisation's overall threat level and security posture, with optional per-domain
          overrides for finer-grained signalling.
        </p>

        <section class="panel" aria-label="Global posture">
          <h3>Global</h3>
          <div class="row">
            <label class="field">
              Threat level
              <select
                @change=${(e: Event): void => {
                  const v = (e.target as HTMLSelectElement).value as ThreatLevel;
                  void this.#updateGlobal({ threat: v });
                }}
              >
                ${THREAT_LEVELS.map(
                  (t) => html`<option value=${t} ?selected=${t === global.threat}>${t}</option>`,
                )}
              </select>
            </label>
            <label class="field">
              Posture
              <select
                @change=${(e: Event): void => {
                  const v = (e.target as HTMLSelectElement).value as Posture;
                  void this.#updateGlobal({ posture: v });
                }}
              >
                ${POSTURES.map(
                  (p) => html`<option value=${p} ?selected=${p === global.posture}>${p}</option>`,
                )}
              </select>
            </label>
            <span class="meta">
              Updated ${global.updatedAt === DEFAULT_GLOBAL.updatedAt ? 'never' : global.updatedAt}
            </span>
          </div>
        </section>

        <section class="panel" aria-label="Per-domain overrides">
          <h3>Per-domain overrides</h3>
          <table class="domains">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Threat</th>
                <th>Posture</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              ${DOMAIN_KEYS.map((d) => this.#domainRow(d, record))}
            </tbody>
          </table>
        </section>
      </article>
    `;
  }

  #domainRow(d: DomainKey, record: PostureRecord | undefined): TemplateResult {
    const setting = record?.perDomain[d];
    const threat = setting?.threat ?? '';
    const posture = setting?.posture ?? '';
    return html`
      <tr>
        <td>${d}</td>
        <td>
          <select
            aria-label=${`Threat for ${d}`}
            @change=${(e: Event): void => {
              const v = (e.target as HTMLSelectElement).value as ThreatLevel | '';
              void this.#updateDomain(d, v === '' ? null : { threat: v });
            }}
          >
            <option value="" ?selected=${threat === ''}>(inherit)</option>
            ${THREAT_LEVELS.map(
              (t) => html`<option value=${t} ?selected=${t === threat}>${t}</option>`,
            )}
          </select>
          ${threat ? html`<span class="badge" data-threat=${threat}>${threat}</span>` : ''}
        </td>
        <td>
          <select
            aria-label=${`Posture for ${d}`}
            @change=${(e: Event): void => {
              const v = (e.target as HTMLSelectElement).value as Posture | '';
              void this.#updateDomain(d, v === '' ? null : { posture: v });
            }}
          >
            <option value="" ?selected=${posture === ''}>(inherit)</option>
            ${POSTURES.map(
              (p) => html`<option value=${p} ?selected=${p === posture}>${p}</option>`,
            )}
          </select>
        </td>
        <td class="meta">${setting?.updatedAt ?? '—'}</td>
      </tr>
    `;
  }

  async #updateGlobal(patch: Partial<Pick<PostureSetting, 'threat' | 'posture'>>): Promise<void> {
    if (!this.store) return;
    const current = this.store.posture.value;
    const global: PostureSetting = {
      threat: current?.global.threat ?? DEFAULT_GLOBAL.threat,
      posture: current?.global.posture ?? DEFAULT_GLOBAL.posture,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const next: PostureRecord = { global, perDomain: { ...(current?.perDomain ?? {}) } };
    await this.store.setPosture(next);
  }

  async #updateDomain(
    d: DomainKey,
    patch: Partial<Pick<PostureSetting, 'threat' | 'posture'>> | null,
  ): Promise<void> {
    if (!this.store) return;
    const current = this.store.posture.value;
    const global = current?.global ?? DEFAULT_GLOBAL;
    const perDomain: PostureRecord['perDomain'] = { ...(current?.perDomain ?? {}) };
    if (patch === null) {
      delete perDomain[d];
    } else {
      const existing = perDomain[d];
      perDomain[d] = {
        threat: existing?.threat ?? global.threat,
        posture: existing?.posture ?? global.posture,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    }
    await this.store.setPosture({ global, perDomain });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-posture-view': PostureView;
  }
}
