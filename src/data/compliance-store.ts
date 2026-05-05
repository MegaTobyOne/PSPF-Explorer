/**
 * Compliance store: single record per RequirementId.
 */

import type { PspfDb } from './db.ts';
import type { ComplianceEntry, RequirementId } from './types.ts';

export async function getCompliance(
  db: PspfDb,
  id: RequirementId,
): Promise<ComplianceEntry | undefined> {
  return db.get('compliance', id);
}

export async function listCompliance(db: PspfDb): Promise<ComplianceEntry[]> {
  return db.getAll('compliance');
}

export async function putCompliance(db: PspfDb, entry: ComplianceEntry): Promise<void> {
  await db.put('compliance', entry);
}

export async function deleteCompliance(db: PspfDb, id: RequirementId): Promise<void> {
  await db.delete('compliance', id);
}

export async function countCompliance(db: PspfDb): Promise<number> {
  return db.count('compliance');
}
