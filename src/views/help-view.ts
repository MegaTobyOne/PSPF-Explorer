import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-help-view')
export class HelpView extends ViewBase {
  protected override heading(): string {
    return 'Help';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-help-view': HelpView;
  }
}
