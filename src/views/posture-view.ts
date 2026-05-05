import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-posture-view')
export class PostureView extends ViewBase {
  protected override heading(): string {
    return 'Posture';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-posture-view': PostureView;
  }
}
