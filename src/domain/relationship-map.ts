import type {
  Action,
  ActionStatus,
  ComplianceEntry,
  ComplianceState,
  Direction,
  DirectionResponseState,
  Relationship,
  RequirementId,
  Risk,
  RiskStatus,
  WorkTrackingEntry,
} from '../data/types.ts';
import { requirementById } from '../pspf/index.ts';

export type RiskBand = 'low' | 'medium' | 'high' | 'extreme';

function riskBandOf(score: number): RiskBand {
  if (score >= 16) return 'extreme';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export type MapNodeKind = 'requirement' | 'risk' | 'action' | 'direction';

export interface MapVisibility {
  requirements: boolean;
  risks: boolean;
  actions: boolean;
  directions: boolean;
  unlinkedGapsOnly?: boolean;
}

export interface RequirementWorkSummary {
  riskCount: number;
  openRiskCount: number;
  actionCount: number;
  activeActionCount: number;
  blockedOrOverdueActionCount: number;
  directionCount: number;
  directionsNeedingResponseCount: number;
  workLogCount: number;
  evidenceCount: number;
  hasWork: boolean;
}

export interface MapNode {
  id: string;
  label: string;
  detail: string;
  kind: MapNodeKind;
  href: string;
  complianceState?: ComplianceState;
  riskStatus?: RiskStatus;
  riskBand?: RiskBand;
  actionStatus?: ActionStatus;
  actionOverdue?: boolean;
  directionResponseState?: DirectionResponseState;
  work?: RequirementWorkSummary;
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  kind: Relationship['kind'];
  label: string;
}

export interface RelationshipMapSummary {
  requirements: number;
  complianceGapsWithWork: number;
  complianceGapsWithoutWork: number;
  blockedOrOverdueActions: number;
  directionsNeedingResponse: number;
}

export interface RelationshipMapGraph {
  nodes: readonly MapNode[];
  edges: readonly MapEdge[];
  summary: RelationshipMapSummary;
}

export interface BuildRelationshipMapInput {
  compliance: ReadonlyMap<RequirementId, ComplianceEntry>;
  risks: readonly Risk[];
  actions: readonly Action[];
  directions: readonly Direction[];
  relationships: readonly Relationship[];
  workTracking: readonly WorkTrackingEntry[];
  visibility: MapVisibility;
  now?: number;
}

const DEFAULT_VISIBILITY: MapVisibility = {
  requirements: true,
  risks: true,
  actions: true,
  directions: true,
  unlinkedGapsOnly: false,
};

function isRequirementId(id: string): id is RequirementId {
  return /^[A-Z]+-\d+$/.test(id);
}

function isActionOverdue(action: Action, now: number): boolean {
  if (!action.dueAt) return false;
  if (action.status === 'done' || action.status === 'cancelled') return false;
  return new Date(action.dueAt).getTime() < now;
}

function edgeLabel(kind: Relationship['kind']): string {
  switch (kind) {
    case 'requirement-risk':
      return 'Risk affects requirement';
    case 'requirement-action':
      return 'Action remediates requirement';
    case 'risk-action':
      return 'Action treats risk';
    case 'requirement-direction':
      return 'Direction modifies requirement';
  }
}

function complianceGap(state: ComplianceState): boolean {
  return state === 'no' || state === 'risk-managed' || state === 'not-set';
}

export function buildRelationshipMapGraph(input: BuildRelationshipMapInput): RelationshipMapGraph {
  const visibility = { ...DEFAULT_VISIBILITY, ...input.visibility };
  const now = input.now ?? Date.now();
  const risksById = new Map(input.risks.map((risk) => [risk.id, risk]));
  const actionsById = new Map(input.actions.map((action) => [action.id, action]));
  const directionsById = new Map(input.directions.map((direction) => [direction.id, direction]));
  const workByRequirement = new Map<string, WorkTrackingEntry[]>();

  for (const entry of input.workTracking) {
    const list = workByRequirement.get(entry.requirementId) ?? [];
    list.push(entry);
    workByRequirement.set(entry.requirementId, list);
  }

  const relatedRiskIds = new Map<string, Set<string>>();
  const relatedActionIds = new Map<string, Set<string>>();
  const relatedDirectionIds = new Map<string, Set<string>>();
  const addRelated = (
    map: Map<string, Set<string>>,
    requirementId: string,
    workId: string,
  ): void => {
    const set = map.get(requirementId) ?? new Set<string>();
    set.add(workId);
    map.set(requirementId, set);
  };

  for (const risk of input.risks) {
    for (const requirementId of risk.requirementIds)
      addRelated(relatedRiskIds, requirementId, risk.id);
  }
  for (const action of input.actions) {
    for (const requirementId of action.requirementIds) {
      addRelated(relatedActionIds, requirementId, action.id);
    }
  }
  for (const direction of input.directions) {
    for (const requirementId of direction.requirementIds) {
      addRelated(relatedDirectionIds, requirementId, direction.id);
    }
  }
  for (const relationship of input.relationships) {
    const [first, second] = relationship.endpoints;
    const requirementId = isRequirementId(first)
      ? first
      : isRequirementId(second)
        ? second
        : undefined;
    const other = requirementId === first ? second : first;
    if (!requirementId) continue;
    switch (relationship.kind) {
      case 'requirement-risk':
        if (risksById.has(other as Risk['id'])) addRelated(relatedRiskIds, requirementId, other);
        break;
      case 'requirement-action':
        if (actionsById.has(other as Action['id']))
          addRelated(relatedActionIds, requirementId, other);
        break;
      case 'requirement-direction':
        if (directionsById.has(other as Direction['id'])) {
          addRelated(relatedDirectionIds, requirementId, other);
        }
        break;
      case 'risk-action':
        break;
    }
  }

  const requirementWorkSummary = (requirementId: string): RequirementWorkSummary => {
    const riskIds = [...(relatedRiskIds.get(requirementId) ?? [])];
    const actionIds = [...(relatedActionIds.get(requirementId) ?? [])];
    const directionIds = [...(relatedDirectionIds.get(requirementId) ?? [])];
    const risks = riskIds
      .map((id) => risksById.get(id as Risk['id']))
      .filter((risk): risk is Risk => Boolean(risk));
    const actions = actionIds
      .map((id) => actionsById.get(id as Action['id']))
      .filter((action): action is Action => Boolean(action));
    const directions = directionIds
      .map((id) => directionsById.get(id as Direction['id']))
      .filter((direction): direction is Direction => Boolean(direction));
    const entry = input.compliance.get(requirementId as RequirementId);
    const workLogCount = workByRequirement.get(requirementId)?.length ?? 0;
    const evidenceCount = entry?.evidence.length ?? 0;
    const blockedOrOverdueActionCount = actions.filter(
      (action) => action.status === 'blocked' || isActionOverdue(action, now),
    ).length;
    const summary: RequirementWorkSummary = {
      riskCount: risks.length,
      openRiskCount: risks.filter((risk) => risk.status !== 'closed').length,
      actionCount: actions.length,
      activeActionCount: actions.filter(
        (action) => action.status !== 'done' && action.status !== 'cancelled',
      ).length,
      blockedOrOverdueActionCount,
      directionCount: directions.length,
      directionsNeedingResponseCount: directions.filter(
        (direction) => direction.responseState === 'not-set' || direction.responseState === 'no',
      ).length,
      workLogCount,
      evidenceCount,
      hasWork: risks.length + actions.length + directions.length + workLogCount + evidenceCount > 0,
    };
    return summary;
  };

  const nodeMap = new Map<string, MapNode>();
  const addNode = (node: MapNode): void => {
    if (!nodeMap.has(node.id)) nodeMap.set(node.id, node);
  };
  const visibleRequirement = (requirementId: string): boolean => {
    if (!visibility.requirements) return false;
    const state = input.compliance.get(requirementId as RequirementId)?.state ?? 'not-set';
    const work = requirementWorkSummary(requirementId);
    if (visibility.unlinkedGapsOnly) return complianceGap(state) && !work.hasWork;
    return true;
  };
  const addRequirementNode = (requirementId: string): void => {
    if (!visibleRequirement(requirementId)) return;
    const requirement = requirementById.get(requirementId as RequirementId);
    const state = input.compliance.get(requirementId as RequirementId)?.state ?? 'not-set';
    const work = requirementWorkSummary(requirementId);
    addNode({
      id: requirementId,
      label: requirementId,
      detail: requirement ? `${requirement.title} · ${requirement.domain}` : 'Unknown requirement',
      kind: 'requirement',
      href: `#/requirement/${requirementId}`,
      complianceState: state,
      work,
    });
  };

  if (visibility.risks && !visibility.unlinkedGapsOnly) {
    for (const risk of input.risks) {
      addNode({
        id: risk.id,
        label: risk.title,
        detail: `${risk.status} · ${risk.likelihood * risk.impact} ${riskBandOf(risk.likelihood * risk.impact)} risk`,
        kind: 'risk',
        href: '#/risks',
        riskStatus: risk.status,
        riskBand: riskBandOf(risk.likelihood * risk.impact),
      });
    }
  }
  if (visibility.actions && !visibility.unlinkedGapsOnly) {
    for (const action of input.actions) {
      const actionOverdue = isActionOverdue(action, now);
      addNode({
        id: action.id,
        label: action.title,
        detail: `${action.status}${actionOverdue ? ' · overdue' : ''} · ${action.type}`,
        kind: 'action',
        href: '#/actions',
        actionStatus: action.status,
        actionOverdue,
      });
    }
  }
  if (visibility.directions && !visibility.unlinkedGapsOnly) {
    for (const direction of input.directions) {
      addNode({
        id: direction.id,
        label: direction.reference,
        detail: `${direction.responseState} · ${direction.title}`,
        kind: 'direction',
        href: '#/directions',
        directionResponseState: direction.responseState,
      });
    }
  }

  if (visibility.requirements) {
    for (const entry of input.compliance.values()) {
      if (complianceGap(entry.state) || workByRequirement.has(entry.requirementId)) {
        addRequirementNode(entry.requirementId);
      }
    }
    for (const requirementId of workByRequirement.keys()) addRequirementNode(requirementId);
  }

  const edgeMap = new Map<string, MapEdge>();
  const addEdge = (source: string, target: string, kind: Relationship['kind']): void => {
    if (!nodeMap.has(source) || !nodeMap.has(target)) return;
    const [normalSource, normalTarget] = source <= target ? [source, target] : [target, source];
    const id = `${kind}:${normalSource}->${normalTarget}`;
    if (edgeMap.has(id)) return;
    edgeMap.set(id, { id, source, target, kind, label: edgeLabel(kind) });
  };

  if (visibility.risks && !visibility.unlinkedGapsOnly) {
    for (const risk of input.risks) {
      if (visibility.requirements) {
        for (const requirementId of risk.requirementIds) {
          addRequirementNode(requirementId);
          addEdge(requirementId, risk.id, 'requirement-risk');
        }
      }
      if (visibility.actions) {
        for (const actionId of risk.actionIds) addEdge(risk.id, actionId, 'risk-action');
      }
    }
  }
  if (visibility.actions && !visibility.unlinkedGapsOnly) {
    for (const action of input.actions) {
      if (visibility.requirements) {
        for (const requirementId of action.requirementIds) {
          addRequirementNode(requirementId);
          addEdge(requirementId, action.id, 'requirement-action');
        }
      }
      if (visibility.risks) {
        for (const riskId of action.riskIds) addEdge(riskId, action.id, 'risk-action');
      }
    }
  }
  if (visibility.directions && visibility.requirements && !visibility.unlinkedGapsOnly) {
    for (const direction of input.directions) {
      for (const requirementId of direction.requirementIds) {
        addRequirementNode(requirementId);
        addEdge(requirementId, direction.id, 'requirement-direction');
      }
    }
  }

  if (!visibility.unlinkedGapsOnly) {
    for (const relationship of input.relationships) {
      const [first, second] = relationship.endpoints;
      if (isRequirementId(first)) addRequirementNode(first);
      if (isRequirementId(second)) addRequirementNode(second);
      addEdge(first, second, relationship.kind);
    }
  }

  const visibleRequirements = [...nodeMap.values()].filter((node) => node.kind === 'requirement');
  const summary: RelationshipMapSummary = {
    requirements: visibleRequirements.length,
    complianceGapsWithWork: visibleRequirements.filter(
      (node) => complianceGap(node.complianceState ?? 'not-set') && node.work?.hasWork,
    ).length,
    complianceGapsWithoutWork: visibleRequirements.filter(
      (node) => complianceGap(node.complianceState ?? 'not-set') && !node.work?.hasWork,
    ).length,
    blockedOrOverdueActions: input.actions.filter(
      (action) => action.status === 'blocked' || isActionOverdue(action, now),
    ).length,
    directionsNeedingResponse: input.directions.filter(
      (direction) => direction.responseState === 'not-set' || direction.responseState === 'no',
    ).length,
  };

  return { nodes: [...nodeMap.values()], edges: [...edgeMap.values()], summary };
}

export function formatRelationshipMapSummary(graph: RelationshipMapGraph): string {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const requirementNodes = graph.nodes
    .filter((node) => node.kind === 'requirement')
    .sort((left, right) => {
      const leftGap = complianceGap(left.complianceState ?? 'not-set') ? 0 : 1;
      const rightGap = complianceGap(right.complianceState ?? 'not-set') ? 0 : 1;
      return leftGap - rightGap || left.id.localeCompare(right.id);
    });

  if (requirementNodes.length === 0) {
    return 'Relationship map summary\n\nNo visible requirements in the current map view.';
  }

  const lines = [
    'Relationship map summary',
    '',
    `Requirements: ${graph.summary.requirements}`,
    `Gaps with work: ${graph.summary.complianceGapsWithWork}`,
    `Gaps without work: ${graph.summary.complianceGapsWithoutWork}`,
    `Blocked/overdue actions: ${graph.summary.blockedOrOverdueActions}`,
    `Directions needing response: ${graph.summary.directionsNeedingResponse}`,
    '',
  ];

  for (const requirement of requirementNodes) {
    const connected = graph.edges
      .filter((edge) => edge.source === requirement.id || edge.target === requirement.id)
      .map((edge) => nodesById.get(edge.source === requirement.id ? edge.target : edge.source))
      .filter((node): node is MapNode => Boolean(node));
    const risks = connected.filter((node) => node.kind === 'risk');
    const actions = connected.filter((node) => node.kind === 'action');
    const directions = connected.filter((node) => node.kind === 'direction');
    const work = requirement.work;

    lines.push(`${requirement.label}: ${requirement.detail}`);
    lines.push(`Compliance: ${requirement.complianceState ?? 'not-set'}`);
    lines.push(
      `Risks: ${risks.length > 0 ? risks.map((node) => `${node.label} (${node.riskBand ?? 'unknown'}, ${node.riskStatus ?? 'unknown'})`).join('; ') : 'None visible'}`,
    );
    lines.push(
      `Actions: ${actions.length > 0 ? actions.map((node) => `${node.label} (${node.actionStatus ?? 'unknown'}${node.actionOverdue ? ', overdue' : ''})`).join('; ') : 'None visible'}`,
    );
    lines.push(
      `Directions: ${directions.length > 0 ? directions.map((node) => `${node.label} (${node.directionResponseState ?? 'unknown'})`).join('; ') : 'None visible'}`,
    );
    lines.push(`Work log: ${work?.workLogCount ?? 0} entries`);
    lines.push(`Evidence: ${work?.evidenceCount ?? 0} items`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
