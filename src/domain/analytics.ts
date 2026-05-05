/**
 * Pure analytics helpers: aggregations over the live data stores.
 */

import type {
  Action,
  ComplianceEntry,
  ComplianceState,
  RequirementId,
  Risk,
} from '../data/types.ts';
import { allRequirements } from '../pspf/index.ts';

export interface ComplianceBreakdown {
  total: number;
  byState: Record<ComplianceState, number>;
  compliantPct: number;
}

const ZERO_BY_STATE: Record<ComplianceState, number> = {
  yes: 0,
  no: 0,
  'risk-managed': 0,
  'not-applicable': 0,
  'not-set': 0,
};

export function complianceBreakdown(
  compliance: ReadonlyMap<RequirementId, ComplianceEntry>,
): ComplianceBreakdown {
  const byState: Record<ComplianceState, number> = { ...ZERO_BY_STATE };
  for (const r of allRequirements) {
    const entry = compliance.get(r.id);
    const state: ComplianceState = entry ? entry.state : 'not-set';
    byState[state] += 1;
  }
  const total = allRequirements.length;
  const denominator = total - byState['not-applicable'];
  const compliantPct = denominator === 0 ? 0 : Math.round((byState.yes / denominator) * 100);
  return { total, byState, compliantPct };
}

export type RiskBand = 'low' | 'medium' | 'high' | 'extreme';

export function riskBandOf(score: number): RiskBand {
  if (score >= 16) return 'extreme';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export function riskBandCounts(risks: readonly Risk[]): Record<RiskBand, number> {
  const out: Record<RiskBand, number> = { low: 0, medium: 0, high: 0, extreme: 0 };
  for (const r of risks) {
    if (r.status === 'closed') continue;
    out[riskBandOf(r.likelihood * r.impact)] += 1;
  }
  return out;
}

export function actionStatusCounts(actions: readonly Action[]): Record<string, number> {
  const out: Record<string, number> = {
    todo: 0,
    'in-progress': 0,
    blocked: 0,
    done: 0,
    cancelled: 0,
  };
  for (const a of actions) {
    out[a.status] = (out[a.status] ?? 0) + 1;
  }
  return out;
}

export function overdueActionCount(actions: readonly Action[], now = Date.now()): number {
  let n = 0;
  for (const a of actions) {
    if (!a.dueAt) continue;
    if (a.status === 'done' || a.status === 'cancelled') continue;
    if (new Date(a.dueAt).getTime() < now) n += 1;
  }
  return n;
}
