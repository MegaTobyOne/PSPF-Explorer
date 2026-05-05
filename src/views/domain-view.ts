import { html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';
import { allDomains, requirementsByDomain } from '../pspf/index.ts';
import type { DomainKey } from '../data/types.ts';

@customElement('pspf-domain-view')
export class DomainView extends ViewBase {
  @property({ attribute: false }) params: Record<string, string> = {};

  private get domainKey(): DomainKey | undefined {
    const raw = this.params.key;
    if (typeof raw !== 'string') return undefined;
    return allDomains.find((d) => d.key === raw)?.key;
  }

  protected override heading(): string {
    const key = this.domainKey;
    const domain = allDomains.find((d) => d.key === key);
    return domain ? domain.name : 'Unknown domain';
  }

  protected override body(): TemplateResult {
    const key = this.domainKey;
    if (!key) return html`<p class="placeholder">No matching domain.</p>`;
    const reqs = requirementsByDomain.get(key) ?? [];
    return html`
      <p>${reqs.length} requirements.</p>
      <ul>
        ${reqs.map(
          (r) => html` <li><a href="#/requirement/${r.id}">${r.id}</a> — ${r.title}</li> `,
        )}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-domain-view': DomainView;
  }
}
