/**
 * Backup / restore: dump and reload the entire IndexedDB.
 *
 * Format:
 *   {
 *     pspfBackup: 'v1',
 *     schemaVersion: number,
 *     createdAt: string,
 *     stores: { [storeName]: unknown[] }
 *   }
 */

import { DB_VERSION, type PspfDb, type PspfStoreNames } from './db.ts';

const BACKUP_FORMAT = 'v1' as const;

const STORE_NAMES = [
  'compliance',
  'complianceEvents',
  'risks',
  'actions',
  'tags',
  'savedViews',
  'workTracking',
  'posture',
  'directions',
  'relationships',
  'meta',
] as const satisfies readonly PspfStoreNames[];

export interface BackupEnvelope {
  pspfBackup: typeof BACKUP_FORMAT;
  schemaVersion: number;
  createdAt: string;
  stores: Partial<Record<(typeof STORE_NAMES)[number], unknown[]>>;
}

export async function exportBackup(db: PspfDb): Promise<BackupEnvelope> {
  const stores: BackupEnvelope['stores'] = {};
  for (const name of STORE_NAMES) {
    const all = await db.getAll(name);
    stores[name] = all;
  }
  return {
    pspfBackup: BACKUP_FORMAT,
    schemaVersion: DB_VERSION,
    createdAt: new Date().toISOString(),
    stores,
  };
}

export class BackupValidationError extends Error {}

interface RawEnvelope {
  pspfBackup?: unknown;
  schemaVersion?: unknown;
  stores?: unknown;
}

export function validateEnvelope(value: unknown): asserts value is BackupEnvelope {
  if (!value || typeof value !== 'object') {
    throw new BackupValidationError('Backup must be a JSON object.');
  }
  const v = value as RawEnvelope;
  if (v.pspfBackup !== BACKUP_FORMAT) {
    throw new BackupValidationError(
      `Unsupported backup format. Expected "${BACKUP_FORMAT}", got "${String(v.pspfBackup)}".`,
    );
  }
  if (typeof v.schemaVersion !== 'number') {
    throw new BackupValidationError('Missing or invalid schemaVersion.');
  }
  if (v.schemaVersion !== DB_VERSION) {
    throw new BackupValidationError(
      `Backup schemaVersion ${String(v.schemaVersion)} does not match current ${DB_VERSION}.`,
    );
  }
  if (!v.stores || typeof v.stores !== 'object') {
    throw new BackupValidationError('Missing stores section.');
  }
}

export async function clearAllStores(db: PspfDb): Promise<void> {
  const tx = db.transaction(STORE_NAMES, 'readwrite');
  await Promise.all(STORE_NAMES.map((s) => tx.objectStore(s).clear()));
  await tx.done;
}

export async function importBackup(db: PspfDb, envelope: unknown): Promise<void> {
  validateEnvelope(envelope);
  const tx = db.transaction(STORE_NAMES, 'readwrite');
  for (const name of STORE_NAMES) {
    const store = tx.objectStore(name);
    await store.clear();
    const items = envelope.stores[name];
    if (!items) continue;
    for (const item of items) {
      // Envelope is user-supplied JSON; cast to the store's record type.
      await store.put(item as never);
    }
  }
  await tx.done;
}
