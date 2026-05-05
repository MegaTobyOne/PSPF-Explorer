import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-restore-view')
export class RestoreView extends ViewBase {
  protected override heading(): string {
    return 'Restore';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-restore-view': RestoreView;
  }
}
