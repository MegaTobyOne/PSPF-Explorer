import { html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';
import { allDomains } from '../pspf/index.ts';

@customElement('pspf-home-view')
export class HomeView extends ViewBase {
  protected override heading(): string {
    return 'PSPF domains';
  }
  protected override body(): TemplateResult {
    return html`
      <p>
        Welcome to PSPF Explorer v3. Select a domain below to start working through its
        requirements. Your work is stored on this device only.
      </p>
      <ul>
        ${allDomains.map(
          (d) => html`
            <li>
              <a href="#/domain/${d.key}"><strong>${d.name}</strong></a>
              — ${d.description}
            </li>
          `,
        )}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-home-view': HomeView;
  }
}
