/**
 * Share packages: export a subset of stores as a portable JSON envelope, and
 * merge another package's content into the current database without clearing
 * existing records.
 *
 * Merge policy: an item with the same primary key as an existing record is
 * skipped (existing wins). Returned MergeReport summarises counts.
 */

import { DB_VERSION, type PspfDb, type PspfStoreNames } from './db.ts';

const SHARE_FORMAT = 'pspf-share-v1' as const;

export const SHAREABLE_STORES = [
  'risks',
  'actions',
  'tags',
  'savedViews',
  'directions',
  'relationships',
] as const satisfies readonly PspfStoreNames[];

export type ShareableStore = (typeof SHAREABLE_STORES)[number];

export interface SharePackage {
  pspfShare: typeof SHARE_FORMAT;
  schemaVersion: number;
  createdAt: string;
  stores: Partial<Record<ShareableStore, unknown[]>>;
}

export interface MergeReport {
  added: Record<ShareableStore, number>;
  skipped: Record<ShareableStore, number>;
}

export class SharePackageValidationError extends Error {}

function emptyCounts(): Record<ShareableStore, number> {
  return {
    risks: 0,
    actions: 0,
    tags: 0,
    savedViews: 0,
    directions: 0,
    relationships: 0,
  };
}

export async function exportSharePackage(
  db: PspfDb,
  selection: readonly ShareableStore[] = SHAREABLE_STORES,
): Promise<SharePackage> {
  const stores: SharePackage['stores'] = {};
  for (const name of selection) {
    const all = await db.getAll(name);
    stores[name] = all;
  }
  return {
    pspfShare: SHARE_FORMAT,
    schemaVersion: DB_VERSION,
    createdAt: new Date().toISOString(),
    stores,
  };
}

interface RawShare {
  pspfShare?: unknown;
  schemaVersion?: unknown;
  stores?: unknown;
}

export function validateSharePackage(value: unknown): asserts value is SharePackage {
  if (!value || typeof value !== 'object') {
    throw new SharePackageValidationError('Share package must be a JSON object.');
  }
  const v = value as RawShare;
  if (v.pspfShare !== SHARE_FORMAT) {
    throw new SharePackageValidationError(
      `Unsupported share format. Expected "${SHARE_FORMAT}", got "${String(v.pspfShare)}".`,
    );
  }
  if (typeof v.schemaVersion !== 'number') {
    throw new SharePackageValidationError('Missing or invalid schemaVersion.');
  }
  if (v.schemaVersion !== DB_VERSION) {
    throw new SharePackageValidationError(
      `Share package schemaVersion ${String(v.schemaVersion)} does not match current ${DB_VERSION}.`,
    );
  }
  if (!v.stores || typeof v.stores !== 'object') {
    throw new SharePackageValidationError('Missing stores section.');
  }
}

interface KeyedRecord {
  id?: string;
}

export async function mergeSharePackage(db: PspfDb, pkg: unknown): Promise<MergeReport> {
  validateSharePackage(pkg);
  const added = emptyCounts();
  const skipped = emptyCounts();
  const tx = db.transaction(SHAREABLE_STORES, 'readwrite');
  for (const name of SHAREABLE_STORES) {
    const items = pkg.stores[name];
    if (!items) continue;
    const store = tx.objectStore(name);
    for (const raw of items) {
      const rec = raw as KeyedRecord;
      if (typeof rec.id !== 'string') {
        skipped[name] += 1;
        continue;
      }
      const existing = await store.get(rec.id);
      if (existing !== undefined) {
        skipped[name] += 1;
        continue;
      }
      await store.put(raw as never);
      added[name] += 1;
    }
  }
  await tx.done;
  return { added, skipped };
}
