import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-actions-view')
export class ActionsView extends ViewBase {
  protected override heading(): string {
    return 'Actions';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-actions-view': ActionsView;
  }
}
