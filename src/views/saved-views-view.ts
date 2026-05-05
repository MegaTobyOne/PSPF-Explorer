import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-saved-views-view')
export class SavedViewsView extends ViewBase {
  protected override heading(): string {
    return 'Saved views';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-saved-views-view': SavedViewsView;
  }
}
