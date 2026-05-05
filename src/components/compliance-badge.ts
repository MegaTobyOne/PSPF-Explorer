import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { designTokens } from '../app/design-tokens.ts';
import type { ComplianceState } from '../data/types.ts';
import { complianceColourVar, complianceLabel } from '../domain/compliance-display.ts';

@customElement('pspf-compliance-badge')
export class ComplianceBadge extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: 2px var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        font-weight: 600;
        background: var(--colour-bg-elevated);
        border: 1px solid var(--colour-border);
        color: var(--colour-fg);
        line-height: 1.2;
      }
      .swatch {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--swatch, var(--colour-fg-muted));
      }
    `,
  ];

  @property({ reflect: true }) state: ComplianceState = 'not-set';

  override render() {
    return html`
      <span class="swatch" style=${`--swatch: var(${complianceColourVar(this.state)})`}></span>
      <span>${complianceLabel(this.state)}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-compliance-badge': ComplianceBadge;
  }
}
