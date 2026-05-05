import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { designTokens } from './design-tokens.ts';

@customElement('pspf-app')
export class PspfApp extends LitElement {
  static override styles = [
    designTokens,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--colour-bg);
        color: var(--colour-fg);
        font-family: var(--font-family-sans);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--colour-border);
      }

      h1 {
        font-size: var(--text-lg);
        font-weight: 600;
        margin: 0;
      }

      .classification {
        font-size: var(--text-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--colour-classification-fg);
        background: var(--colour-classification-bg);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
      }

      main {
        flex: 1;
        padding: var(--space-4);
      }

      footer {
        padding: var(--space-2) var(--space-4);
        font-size: var(--text-xs);
        color: var(--colour-fg-muted);
        border-top: 1px solid var(--colour-border);
        display: flex;
        justify-content: space-between;
      }
    `,
  ];

  override render() {
    return html`
      <header>
        <h1>PSPF Explorer</h1>
        <span class="classification" aria-label="Information classification"
          >OFFICIAL: Sensitive</span
        >
      </header>
      <main>
        <p>v3 scaffold ready. Phase 1 features land next.</p>
      </main>
      <footer>
        <span>v${__APP_VERSION__}</span>
        <span>Offline-first · No telemetry</span>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-app': PspfApp;
  }
}
