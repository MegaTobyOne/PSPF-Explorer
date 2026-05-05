import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-integrity-view')
export class IntegrityView extends ViewBase {
  protected override heading(): string {
    return 'Integrity';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-integrity-view': IntegrityView;
  }
}
