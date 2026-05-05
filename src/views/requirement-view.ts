import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { designTokens } from '../app/design-tokens.ts';
import { allDomains, requirementById, essentialEightControls } from '../pspf/index.ts';
import { asRequirementId, type ComplianceState } from '../data/types.ts';
import { appStoreContext } from '../state/contexts.ts';
import type { AppStore } from '../state/app-store.ts';
import { SignalWatcher } from '../state/signal-watcher.ts';
import '../components/compliance-badge.ts';
import '../components/compliance-editor.ts';

@customElement('pspf-requirement-view')
export class RequirementView extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: block;
      }
      header.req {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin: 0 0 var(--space-3) 0;
      }
      h2 {
        margin: 0;
        font-size: var(--text-xl);
      }
      .crumb {
        font-size: var(--text-sm);
        color: var(--colour-fg-muted);
      }
      .crumb a {
        color: inherit;
      }
      dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: var(--space-1) var(--space-3);
        margin: var(--space-3) 0 0 0;
        font-size: var(--text-sm);
      }
      dt {
        color: var(--colour-fg-muted);
      }
      dd {
        margin: 0;
      }
      p.text {
        max-width: 70ch;
        line-height: 1.5;
      }
      .placeholder {
        padding: var(--space-3);
        border: 1px dashed var(--colour-border);
        border-radius: var(--radius-md);
        color: var(--colour-fg-muted);
        font-size: var(--text-sm);
      }
      ul.refs {
        margin: 0;
        padding-left: var(--space-4);
        font-size: var(--text-sm);
      }
    `,
  ];

  @property({ attribute: false }) params: Record<string, string> = {};

  @consume({ context: appStoreContext, subscribe: true })
  private store: AppStore | undefined;

  // eslint-disable-next-line no-unused-private-class-members
  #watcher = new SignalWatcher(this, () => (this.store ? [this.store.compliance] : []));

  override render() {
    const raw = this.params.id;
    if (typeof raw !== 'string') {
      return html`<p class="placeholder">Missing requirement id.</p>`;
    }
    const req = requirementById.get(asRequirementId(raw));
    if (!req) {
      return html`<p class="placeholder">Unknown requirement: ${raw}.</p>`;
    }
    const domain = allDomains.find((d) => d.key === req.domain);
    const entry = this.store?.compliance.value.get(req.id);
    const state: ComplianceState = entry ? entry.state : 'not-set';
    const e8 = req.essentialEightControl
      ? essentialEightControls.find((c) => c.key === req.essentialEightControl)
      : undefined;
    return html`
      <article>
        <p class="crumb">
          <a href="#/">Home</a> ›
          <a href="#/domain/${req.domain}">${domain?.name ?? req.domain}</a> › ${req.id}
        </p>
        <header class="req">
          <h2>${req.id} — ${req.title}</h2>
          <pspf-compliance-badge .state=${state}></pspf-compliance-badge>
        </header>
        <p class="text">${req.text}</p>
        <dl>
          <dt>Domain</dt>
          <dd>${domain?.name ?? req.domain}</dd>
          <dt>Reporting</dt>
          <dd>${req.reportingType}</dd>
          ${e8
            ? html`
                <dt>Essential Eight</dt>
                <dd>${e8.name}</dd>
              `
            : ''}
          ${req.references && req.references.length > 0
            ? html`
                <dt>References</dt>
                <dd>
                  <ul class="refs">
                    ${req.references.map((r) => html`<li>${r}</li>`)}
                  </ul>
                </dd>
              `
            : ''}
        </dl>
        <pspf-compliance-editor .requirementId=${req.id}></pspf-compliance-editor>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-requirement-view': RequirementView;
  }
}
