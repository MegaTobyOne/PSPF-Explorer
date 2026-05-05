import { customElement } from 'lit/decorators.js';
import { ViewBase } from './view-base.ts';

@customElement('pspf-backup-view')
export class BackupView extends ViewBase {
  protected override heading(): string {
    return 'Backup';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pspf-backup-view': BackupView;
  }
}
