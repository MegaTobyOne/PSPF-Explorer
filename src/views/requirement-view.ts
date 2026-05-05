import { html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';
import { requirementById } from '../pspf/index.ts';
import { asRequirementId } from '../data/types.ts';

@customElement('pspf-requirement-view')
export class RequirementView extends ViewBase {
  @property({ attribute: false }) params: Record<string, string> = {};

  protected override heading(): string {
    const raw = this.params.id;
    return typeof raw === 'string' ? raw : 'Requirement';
  }

  protected override body(): TemplateResult {
    const raw = this.params.id;
    if (typeof raw !== 'string') return html`<p class="placeholder">Missing id.</p>`;
    const req = requirementById.get(asRequirementId(raw));
    if (!req) return html`<p class="placeholder">Unknown requirement.</p>`;
    return html`
      <p><strong>${req.title}</strong></p>
      <p>${req.text}</p>
      <p><em>Domain:</em> ${req.domain}</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-requirement-view': RequirementView;
  }
}
