import { describe, expect, it } from 'vitest';
import { buildRelationshipMapGraph } from './relationship-map.ts';
import {
  asActionId,
  asDirectionId,
  asRequirementId,
  asRiskId,
  type Action,
  type ComplianceEntry,
  type Direction,
  type Relationship,
  type RequirementId,
  type Risk,
  type WorkTrackingEntry,
} from '../data/types.ts';

const NOW = '2026-05-07T00:00:00.000Z';

function compliance(
  requirementId: RequirementId,
  state: ComplianceEntry['state'],
): ComplianceEntry {
  return { requirementId, state, evidence: [], createdAt: NOW, updatedAt: NOW };
}

function baseRisk(patch: Partial<Risk> = {}): Risk {
  return {
    id: asRiskId('risk-1'),
    title: 'Unowned privileged access',
    likelihood: 4,
    impact: 4,
    status: 'open',
    requirementIds: [],
    actionIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function baseAction(patch: Partial<Action> = {}): Action {
  return {
    id: asActionId('action-1'),
    title: 'Review admin accounts',
    type: 'review',
    status: 'in-progress',
    requirementIds: [],
    riskIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function baseDirection(patch: Partial<Direction> = {}): Direction {
  return {
    id: asDirectionId('direction-1'),
    reference: 'PSPF Direction 001-2026',
    title: 'Increase assurance reporting',
    issuedAt: '2026-05-01',
    requirementIds: [],
    responseState: 'not-set',
    evidence: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

describe('buildRelationshipMapGraph', () => {
  const requirementId = asRequirementId('GOV-001');

  it('adds compliance and work metadata to requirement nodes', () => {
    const risk = baseRisk({ requirementIds: [requirementId] });
    const action = baseAction({
      requirementIds: [requirementId],
      dueAt: '2026-01-01',
      status: 'blocked',
    });
    const direction = baseDirection({ requirementIds: [requirementId], responseState: 'no' });
    const work: WorkTrackingEntry = {
      id: 'work-1' as WorkTrackingEntry['id'],
      requirementId,
      note: 'Started control uplift',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const graph = buildRelationshipMapGraph({
      compliance: new Map([[requirementId, compliance(requirementId, 'no')]]),
      risks: [risk],
      actions: [action],
      directions: [direction],
      relationships: [],
      workTracking: [work],
      visibility: { requirements: true, risks: true, actions: true, directions: true },
      now: Date.parse('2026-05-07'),
    });

    const requirement = graph.nodes.find((node) => node.id === requirementId);
    expect(requirement?.complianceState).toBe('no');
    expect(requirement?.work).toMatchObject({
      riskCount: 1,
      openRiskCount: 1,
      actionCount: 1,
      activeActionCount: 1,
      blockedOrOverdueActionCount: 1,
      directionCount: 1,
      directionsNeedingResponseCount: 1,
      workLogCount: 1,
      hasWork: true,
    });
    expect(graph.summary).toMatchObject({
      requirements: 1,
      complianceGapsWithWork: 1,
      complianceGapsWithoutWork: 0,
      blockedOrOverdueActions: 1,
      directionsNeedingResponse: 1,
    });
  });

  it('deduplicates implicit and stored relationship edges', () => {
    const risk = baseRisk({ requirementIds: [requirementId] });
    const relationship: Relationship = {
      id: 'rel-1' as Relationship['id'],
      kind: 'requirement-risk',
      endpoints: [requirementId, risk.id],
      createdAt: NOW,
      updatedAt: NOW,
    };

    const graph = buildRelationshipMapGraph({
      compliance: new Map(),
      risks: [risk],
      actions: [],
      directions: [],
      relationships: [relationship],
      workTracking: [],
      visibility: { requirements: true, risks: true, actions: true, directions: true },
    });

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      source: requirementId,
      target: risk.id,
      label: 'Risk affects requirement',
    });
  });

  it('filters hidden work nodes and their edges', () => {
    const risk = baseRisk({ requirementIds: [requirementId] });
    const action = baseAction({ requirementIds: [requirementId] });

    const graph = buildRelationshipMapGraph({
      compliance: new Map(),
      risks: [risk],
      actions: [action],
      directions: [],
      relationships: [],
      workTracking: [],
      visibility: { requirements: true, risks: false, actions: true, directions: true },
    });

    expect(graph.nodes.some((node) => node.id === risk.id)).toBe(false);
    expect(graph.nodes.some((node) => node.id === action.id)).toBe(true);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.kind).toBe('requirement-action');
  });

  it('shows recorded compliance gaps before work has been linked', () => {
    const graph = buildRelationshipMapGraph({
      compliance: new Map([[requirementId, compliance(requirementId, 'no')]]),
      risks: [],
      actions: [],
      directions: [],
      relationships: [],
      workTracking: [],
      visibility: { requirements: true, risks: true, actions: true, directions: true },
    });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({ id: requirementId, complianceState: 'no' });
    expect(graph.edges).toHaveLength(0);
    expect(graph.summary).toMatchObject({
      complianceGapsWithWork: 0,
      complianceGapsWithoutWork: 1,
    });
  });
});
