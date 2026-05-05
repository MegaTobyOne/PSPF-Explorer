import { describe, expect, it } from 'vitest';
import {
  actionStatusCounts,
  complianceBreakdown,
  overdueActionCount,
  riskBandCounts,
  riskBandOf,
} from './analytics.ts';
import { allRequirements } from '../pspf/index.ts';
import type { Action, ComplianceEntry, RequirementId, Risk } from '../data/types.ts';

const now = new Date('2026-05-05T00:00:00Z').toISOString();

function entry(id: RequirementId, state: ComplianceEntry['state']): ComplianceEntry {
  return { requirementId: id, state, evidence: [], createdAt: now, updatedAt: now };
}

describe('complianceBreakdown', () => {
  it('treats missing entries as not-set and ignores n/a in the percentage', () => {
    const m = new Map<RequirementId, ComplianceEntry>();
    const [a, b, c] = allRequirements;
    m.set(a!.id, entry(a!.id, 'yes'));
    m.set(b!.id, entry(b!.id, 'not-applicable'));
    m.set(c!.id, entry(c!.id, 'no'));
    const out = complianceBreakdown(m);
    expect(out.total).toBe(allRequirements.length);
    expect(out.byState.yes).toBe(1);
    expect(out.byState['not-applicable']).toBe(1);
    expect(out.byState['not-set']).toBe(allRequirements.length - 3);
    // 1 yes / (total - 1 n/a)
    expect(out.compliantPct).toBe(Math.round((1 / (allRequirements.length - 1)) * 100));
  });
});

describe('riskBandOf / riskBandCounts', () => {
  it('classifies bands correctly', () => {
    expect(riskBandOf(1)).toBe('low');
    expect(riskBandOf(5)).toBe('medium');
    expect(riskBandOf(10)).toBe('high');
    expect(riskBandOf(20)).toBe('extreme');
  });
  it('counts bands and excludes closed risks', () => {
    const r = (l: number, i: number, status: Risk['status']): Risk => ({
      id: `${l}-${i}-${status}` as Risk['id'],
      title: 't',
      likelihood: l as 1,
      impact: i as 1,
      status,
      requirementIds: [],
      actionIds: [],
      createdAt: now,
      updatedAt: now,
    });
    const counts = riskBandCounts([r(1, 1, 'open'), r(4, 5, 'open'), r(5, 5, 'closed')]);
    expect(counts.low).toBe(1);
    expect(counts.extreme).toBe(1);
    expect(counts.high).toBe(0);
  });
});

describe('actionStatusCounts / overdueActionCount', () => {
  const a = (status: Action['status'], dueAt?: string): Action => ({
    id: `${status}-${dueAt ?? 'x'}` as Action['id'],
    title: 't',
    type: 'remediation',
    status,
    ...(dueAt ? { dueAt } : {}),
    requirementIds: [],
    riskIds: [],
    createdAt: now,
    updatedAt: now,
  });
  it('counts statuses', () => {
    const counts = actionStatusCounts([a('todo'), a('todo'), a('done')]);
    expect(counts.todo).toBe(2);
    expect(counts.done).toBe(1);
  });
  it('counts overdue (excluding done/cancelled)', () => {
    const past = '2020-01-01';
    const future = '2099-01-01';
    const list = [a('in-progress', past), a('done', past), a('todo', future), a('blocked', past)];
    expect(overdueActionCount(list, Date.parse('2026-05-05'))).toBe(2);
  });
});
