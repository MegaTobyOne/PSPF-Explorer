import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { designTokens } from './design-tokens.ts';
import { HashRouter } from './router.ts';
import { routes, NAV_ROUTES } from './routes.ts';
import { AppStore } from '../state/app-store.ts';
import { appStoreContext } from '../state/contexts.ts';
import '../components/command-palette.ts';

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

      h1 a {
        color: inherit;
        text-decoration: none;
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

      .header-labels {
        display: flex;
        gap: var(--space-2);
        align-items: center;
      }

      .tlp {
        font-size: var(--text-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #111827;
        background: #f59e0b;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
      }

      nav {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        border-bottom: 1px solid var(--colour-border);
        background: var(--colour-bg-elevated);
        font-size: var(--text-sm);
      }

      nav a {
        color: var(--colour-fg-muted);
        text-decoration: none;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
      }

      nav a:hover,
      nav a:focus-visible {
        color: var(--colour-fg);
        background: var(--colour-border);
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

      .loading {
        font-size: var(--text-sm);
        color: var(--colour-fg-muted);
      }

      @media print {
        :host {
          background: white;
          color: black;
        }
        header,
        nav,
        footer,
        pspf-command-palette {
          display: none !important;
        }
        main {
          padding: 0;
        }
      }
    `,
  ];

  @state() private store: AppStore | undefined;
  @state() private bootError: string | undefined;

  @provide({ context: appStoreContext })
  private storeContext!: AppStore;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.boot();
  }

  private async boot(): Promise<void> {
    try {
      const store = await AppStore.open();
      this.storeContext = store;
      this.store = store;
    } catch (error) {
      this.bootError =
        error instanceof Error ? error.message : 'Could not open the local database.';
    }
  }

  override firstUpdated(_changed: PropertyValues): void {
    const outlet = this.renderRoot.querySelector<HTMLElement>('#outlet');
    if (!outlet) return;
    const router = new HashRouter(outlet, routes);
    router.start();
  }

  override render() {
    return html`
      <header>
        <h1><a href="#/">PSPF Explorer</a></h1>
        <div class="header-labels">
          <span class="classification" aria-label="Information classification"
            >OFFICIAL: Sensitive</span
          >
          <span class="tlp" aria-label="Traffic Light Protocol marking">TLP:AMBER+STRICT</span>
        </div>
      </header>
      <nav aria-label="Primary">
        ${NAV_ROUTES.map((r) => html`<a href="#${r.path}">${r.label}</a>`)}
      </nav>
      <main>
        ${this.bootError
          ? html`<p role="alert">Startup failed: ${this.bootError}</p>`
          : !this.store
            ? html`<p class="loading">Loading…</p>`
            : ''}
        <div id="outlet"></div>
      </main>
      <footer>
        <span>v${__APP_VERSION__}</span>
        <span
          >Press <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> for the command palette · Offline-first · No
          telemetry</span
        >
      </footer>
      <pspf-command-palette></pspf-command-palette>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-app': PspfApp;
  }
}
