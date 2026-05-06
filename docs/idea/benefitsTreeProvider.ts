import * as vscode from 'vscode';
import { onDataChanged } from './events';
import { StorageManager } from './storageManager';
import { Benefit, BenefitStage } from './types';

class BenefitCategoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly categoryKey: string,
    label: string,
    count: number,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(`${label} (${count})`, collapsibleState);
    this.description = `${count} benefit${count === 1 ? '' : 's'}`;
    this.tooltip = `${label}\n${count} benefit${count === 1 ? '' : 's'}`;
    this.contextValue = 'benefitCategory';
    this.iconPath = new vscode.ThemeIcon('group-by-ref-type');
  }
}

class BenefitTreeItem extends vscode.TreeItem {
  constructor(public readonly benefit: Benefit) {
    super(benefit.title, vscode.TreeItemCollapsibleState.None);

    // Calculate progress percentage if values are available
    const hasProgress =
      typeof benefit.currentValue === 'number' &&
      typeof benefit.targetValue === 'number' &&
      benefit.targetValue > 0;
    const progressPercent = hasProgress
      ? Math.round((benefit.currentValue! / benefit.targetValue!) * 100)
      : null;

    const tooltipParts: string[] = [benefit.description];
    tooltipParts.push(`Stage: ${benefit.stage}`);
    if (benefit.owner) {
      tooltipParts.push(`Owner: ${benefit.owner}`);
    }
    if (benefit.sponsor) {
      tooltipParts.push(`Sponsor: ${benefit.sponsor}`);
    }
    if (benefit.kpi) {
      tooltipParts.push(`KPI: ${benefit.kpi}`);
    }
    if (hasProgress) {
      tooltipParts.push(
        `Progress: ${benefit.currentValue}/${benefit.targetValue} ${benefit.unit ?? ''} (${progressPercent}%)`.trim(),
      );
    }

    this.tooltip = tooltipParts.join('\n');

    // Description shows stage with progress percentage if available
    const progressStr = progressPercent !== null ? ` • ${progressPercent}%` : '';
    this.description = `${benefit.stage}${progressStr}`;
    this.contextValue = 'benefit';

    // Get icon with colour coding for at-risk and realised stages
    const iconColor =
      benefit.stage === 'at-risk'
        ? new vscode.ThemeColor('errorForeground')
        : benefit.stage === 'realised'
          ? new vscode.ThemeColor('testing.iconPassed')
          : undefined;
    this.iconPath = new vscode.ThemeIcon(this.getIconForStage(benefit.stage), iconColor);

    this.command = {
      command: 'actiontracker.openBenefitDetails',
      title: 'Open Benefit Details',
      arguments: [benefit.id],
    };
  }

  private getIconForStage(stage: BenefitStage): string {
    switch (stage) {
      case 'realised':
        return 'pass'; // Green checkmark
      case 'in-progress':
        return 'rocket';
      case 'at-risk':
        return 'warning'; // Warning triangle
      case 'deferred':
        return 'clock';
      case 'idea':
        return 'lightbulb';
      case 'planned':
      default:
        return 'milestone';
    }
  }
}

type TreeItemType = BenefitCategoryTreeItem | BenefitTreeItem;

export class BenefitsTreeDataProvider implements vscode.TreeDataProvider<TreeItemType> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeItemType | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly storageManager: StorageManager) {
    onDataChanged.event(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItemType): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItemType): Thenable<TreeItemType[]> {
    if (!element) {
      return Promise.resolve(this.getCategoryItems());
    }

    if (element instanceof BenefitCategoryTreeItem) {
      return Promise.resolve(this.getBenefitsForCategory(element.categoryKey));
    }

    return Promise.resolve([]);
  }

  private getCategoryItems(): TreeItemType[] {
    const benefits = this.storageManager.getAllBenefits();
    if (benefits.length === 0) {
      return [];
    }

    const grouped = new Map<string, Benefit[]>();

    benefits.forEach((benefit) => {
      const key = benefit.category || 'uncategorized';
      const bucket = grouped.get(key) ?? [];
      bucket.push(benefit);
      grouped.set(key, bucket);
    });

    const sortedKeys = Array.from(grouped.keys()).sort((a, b) =>
      this.formatCategoryName(a).localeCompare(this.formatCategoryName(b)),
    );

    return sortedKeys.map((key) => {
      const count = grouped.get(key)?.length ?? 0;
      return new BenefitCategoryTreeItem(
        key,
        this.formatCategoryName(key),
        count,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });
  }

  private getBenefitsForCategory(categoryKey: string): TreeItemType[] {
    const benefits = this.storageManager.getAllBenefits();
    const filtered = benefits.filter(
      (benefit) => (benefit.category || 'uncategorized') === categoryKey,
    );
    const sorted = filtered.sort((a, b) => a.title.localeCompare(b.title));
    return sorted.map((benefit) => new BenefitTreeItem(benefit));
  }

  private formatCategoryName(key: string): string {
    if (!key || key === 'uncategorized') {
      return 'Uncategorized';
    }

    return key
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }
}
