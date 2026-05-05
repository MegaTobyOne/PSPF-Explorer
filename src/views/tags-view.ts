import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-tags-view')
export class TagsView extends ViewBase {
  protected override heading(): string {
    return 'Tags';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-tags-view': TagsView;
  }
}
