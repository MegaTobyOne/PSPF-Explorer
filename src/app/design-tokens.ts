import { css } from 'lit';

/**
 * Shared design tokens for v3.
 * Imported into every component's `static styles` so CSS custom properties
 * are available inside every shadow root.
 */
export const designTokens = css`
  :host {
    /* Colours — dark theme baseline; light variant via prefers-color-scheme below. */
    --colour-bg: #0b0f14;
    --colour-bg-elevated: #131922;
    --colour-fg: #e6edf3;
    --colour-fg-muted: #8b96a3;
    --colour-border: #1f2733;
    --colour-accent: #4f8cff;
    --colour-accent-fg: #ffffff;

    --colour-status-yes: #2dd4bf;
    --colour-status-no: #ef4444;
    --colour-status-risk-managed: #facc15;
    --colour-status-not-applicable: #94a3b8;
    --colour-status-not-set: #475569;

    /* Risk bands — graduated red/amber/green. */
    --colour-risk-extreme: #99182c;
    --colour-risk-high: #d4451f;
    --colour-risk-medium: #e0903b;
    --colour-risk-low: #2f6f3a;

    /* Action statuses. */
    --colour-action-todo: #475569;
    --colour-action-in-progress: #2563eb;
    --colour-action-blocked: #b34a00;
    --colour-action-done: #2dd4bf;
    --colour-action-cancelled: #94a3b8;

    /* Direction response states. */
    --colour-direction-not-set: #ef4444;
    --colour-direction-no: #d4451f;
    --colour-direction-risk-managed: #facc15;
    --colour-direction-yes: #2dd4bf;

    /* Relationship-map edges. */
    --colour-map-edge-default: #94a3b8;
    --colour-map-edge-requirement-risk: #b34a00;
    --colour-map-edge-requirement-action: #059669;
    --colour-map-edge-risk-action: #2563eb;
    --colour-map-edge-requirement-direction: #7c3aed;
    --colour-map-node-stroke: #0f172a;

    --colour-classification-bg: #f59e0b;
    --colour-classification-fg: #1a1300;

    /* Spacing — 4px scale. */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-8: 3rem;

    /* Typography. */
    --font-family-sans:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-family-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;

    /* Shape & motion. */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-2: 0 4px 12px rgba(0, 0, 0, 0.35);
    --motion-fast: 120ms;
    --motion-medium: 220ms;
  }

  @media (prefers-color-scheme: light) {
    :host {
      --colour-bg: #f8fafc;
      --colour-bg-elevated: #ffffff;
      --colour-fg: #0f172a;
      --colour-fg-muted: #475569;
      --colour-border: #e2e8f0;
      --colour-accent: #1d4ed8;
      --colour-status-not-set: #cbd5e1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :host {
      --motion-fast: 0ms;
      --motion-medium: 0ms;
    }
  }
`;
