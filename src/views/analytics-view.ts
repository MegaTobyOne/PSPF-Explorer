import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-analytics-view')
export class AnalyticsView extends ViewBase {
  protected override heading(): string {
    return 'Analytics';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-analytics-view': AnalyticsView;
  }
}
