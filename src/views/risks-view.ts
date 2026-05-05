import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-risks-view')
export class RisksView extends ViewBase {
  protected override heading(): string {
    return 'Risks';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-risks-view': RisksView;
  }
}
