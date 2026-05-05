/**
 * Central application store.
 *
 * Wraps the open IndexedDB plus a set of @preact/signals-core signals that
 * mirror persisted state. Mutations always write through to IndexedDB first,
 * then update the corresponding signal so subscribers see consistent values.
 */

import { signal, type Signal } from '@preact/signals-core';
import {
  countCompliance,
  deleteCompliance,
  listCompliance,
  putCompliance,
} from '../data/compliance-store.ts';
import { openPspfDb, type PspfDb } from '../data/db.ts';
import { newId } from '../data/ids.ts';
import { getMeta, setMeta } from '../data/meta-store.ts';
import { getPosture, putPosture } from '../data/posture-store.ts';
import {
  deleteAction,
  deleteRisk,
  deleteSavedView,
  deleteTag,
  deleteWorkTracking,
  listActions,
  listRisks,
  listSavedViews,
  listTags,
  listWorkTracking,
  putAction,
  putRisk,
  putSavedView,
  putTag,
  putWorkTracking,
} from '../data/stores.ts';
import {
  asActionId,
  asRiskId,
  asSavedViewId,
  asTagId,
  asWorkTrackingId,
  type Action,
  type ActionId,
  type ComplianceEntry,
  type ComplianceState,
  type EvidenceRef,
  type PostureRecord,
  type RequirementId,
  type Risk,
  type RiskId,
  type SavedView,
  type SavedViewFilters,
  type SavedViewId,
  type Tag,
  type TagId,
  type WorkTrackingEntry,
  type WorkTrackingId,
} from '../data/types.ts';

export class AppStore {
  readonly db: PspfDb;

  readonly compliance: Signal<ReadonlyMap<RequirementId, ComplianceEntry>>;
  readonly risks: Signal<readonly Risk[]>;
  readonly actions: Signal<readonly Action[]>;
  readonly tags: Signal<readonly Tag[]>;
  readonly savedViews: Signal<readonly SavedView[]>;
  readonly workTracking: Signal<readonly WorkTrackingEntry[]>;
  readonly posture: Signal<PostureRecord | undefined>;
  readonly ready: Signal<boolean>;

  constructor(db: PspfDb) {
    this.db = db;
    this.compliance = signal(new Map());
    this.risks = signal([]);
    this.actions = signal([]);
    this.tags = signal([]);
    this.savedViews = signal([]);
    this.workTracking = signal([]);
    this.posture = signal(undefined);
    this.ready = signal(false);
  }

  static async open(name?: string): Promise<AppStore> {
    const db = await openPspfDb(name);
    const store = new AppStore(db);
    await store.loadAll();
    return store;
  }

  async loadAll(): Promise<void> {
    const [compliance, risks, actions, tags, savedViews, workTracking, posture] = await Promise.all(
      [
        listCompliance(this.db),
        listRisks(this.db),
        listActions(this.db),
        listTags(this.db),
        listSavedViews(this.db),
        listWorkTracking(this.db),
        getPosture(this.db),
      ],
    );
    this.compliance.value = new Map(compliance.map((e) => [e.requirementId, e]));
    this.risks.value = risks;
    this.actions.value = actions;
    this.tags.value = tags;
    this.savedViews.value = savedViews;
    this.workTracking.value = workTracking;
    this.posture.value = posture;
    this.ready.value = true;
  }

  // ---------- Compliance ----------

  async setCompliance(
    requirementId: RequirementId,
    patch: Partial<Omit<ComplianceEntry, 'requirementId' | 'createdAt' | 'updatedAt'>> & {
      state: ComplianceState;
    },
  ): Promise<ComplianceEntry> {
    const existing = this.compliance.value.get(requirementId);
    const now = new Date().toISOString();
    const entry: ComplianceEntry = {
      requirementId,
      state: patch.state,
      evidence: patch.evidence ?? existing?.evidence ?? [],
      ...(patch.targetMaturity !== undefined ? { targetMaturity: patch.targetMaturity } : {}),
      ...(patch.reviewedAt !== undefined ? { reviewedAt: patch.reviewedAt } : {}),
      ...(patch.reviewer !== undefined ? { reviewer: patch.reviewer } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await putCompliance(this.db, entry);
    const next = new Map(this.compliance.value);
    next.set(requirementId, entry);
    this.compliance.value = next;
    return entry;
  }

  async addEvidence(requirementId: RequirementId, evidence: EvidenceRef): Promise<void> {
    const existing = this.compliance.value.get(requirementId);
    const base: ComplianceEntry =
      existing ??
      ({
        requirementId,
        state: 'not-set',
        evidence: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies ComplianceEntry);
    await this.setCompliance(requirementId, {
      state: base.state,
      evidence: [...base.evidence, evidence],
      ...(base.targetMaturity !== undefined ? { targetMaturity: base.targetMaturity } : {}),
      ...(base.reviewedAt !== undefined ? { reviewedAt: base.reviewedAt } : {}),
      ...(base.reviewer !== undefined ? { reviewer: base.reviewer } : {}),
      ...(base.notes !== undefined ? { notes: base.notes } : {}),
    });
  }

  async clearCompliance(requirementId: RequirementId): Promise<void> {
    await deleteCompliance(this.db, requirementId);
    const next = new Map(this.compliance.value);
    next.delete(requirementId);
    this.compliance.value = next;
  }

  async removeEvidence(requirementId: RequirementId, index: number): Promise<void> {
    const existing = this.compliance.value.get(requirementId);
    if (!existing) return;
    if (index < 0 || index >= existing.evidence.length) return;
    const evidence = existing.evidence.filter((_, i) => i !== index);
    await this.setCompliance(requirementId, {
      state: existing.state,
      evidence,
      ...(existing.targetMaturity !== undefined ? { targetMaturity: existing.targetMaturity } : {}),
      ...(existing.reviewedAt !== undefined ? { reviewedAt: existing.reviewedAt } : {}),
      ...(existing.reviewer !== undefined ? { reviewer: existing.reviewer } : {}),
      ...(existing.notes !== undefined ? { notes: existing.notes } : {}),
    });
  }

  async complianceCount(): Promise<number> {
    return countCompliance(this.db);
  }

  // ---------- Risks ----------

  async createRisk(input: Omit<Risk, 'id' | 'createdAt' | 'updatedAt'>): Promise<Risk> {
    const now = new Date().toISOString();
    const risk: Risk = { ...input, id: asRiskId(newId()), createdAt: now, updatedAt: now };
    await putRisk(this.db, risk);
    this.risks.value = [...this.risks.value, risk];
    return risk;
  }

  async updateRisk(id: RiskId, patch: Partial<Risk>): Promise<Risk> {
    const existing = this.risks.value.find((r) => r.id === id);
    if (!existing) throw new Error(`Risk ${id} not found`);
    const updated: Risk = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    await putRisk(this.db, updated);
    this.risks.value = this.risks.value.map((r) => (r.id === id ? updated : r));
    return updated;
  }

  async removeRisk(id: RiskId): Promise<void> {
    await deleteRisk(this.db, id);
    this.risks.value = this.risks.value.filter((r) => r.id !== id);
  }

  // ---------- Actions ----------

  async createAction(input: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action> {
    const now = new Date().toISOString();
    const action: Action = { ...input, id: asActionId(newId()), createdAt: now, updatedAt: now };
    await putAction(this.db, action);
    this.actions.value = [...this.actions.value, action];
    return action;
  }

  async updateAction(id: ActionId, patch: Partial<Action>): Promise<Action> {
    const existing = this.actions.value.find((a) => a.id === id);
    if (!existing) throw new Error(`Action ${id} not found`);
    const updated: Action = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    await putAction(this.db, updated);
    this.actions.value = this.actions.value.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  async removeAction(id: ActionId): Promise<void> {
    await deleteAction(this.db, id);
    this.actions.value = this.actions.value.filter((a) => a.id !== id);
  }

  // ---------- Tags ----------

  async createTag(input: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const now = new Date().toISOString();
    const tag: Tag = { ...input, id: asTagId(newId()), createdAt: now, updatedAt: now };
    await putTag(this.db, tag);
    this.tags.value = [...this.tags.value, tag];
    return tag;
  }

  async updateTag(id: TagId, patch: Partial<Tag>): Promise<Tag> {
    const existing = this.tags.value.find((t) => t.id === id);
    if (!existing) throw new Error(`Tag ${id} not found`);
    const updated: Tag = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    await putTag(this.db, updated);
    this.tags.value = this.tags.value.map((t) => (t.id === id ? updated : t));
    return updated;
  }

  async removeTag(id: TagId): Promise<void> {
    await deleteTag(this.db, id);
    this.tags.value = this.tags.value.filter((t) => t.id !== id);
  }

  // ---------- Saved views ----------

  async createSavedView(name: string, filters: SavedViewFilters): Promise<SavedView> {
    const now = new Date().toISOString();
    const view: SavedView = {
      id: asSavedViewId(newId()),
      name,
      filters,
      createdAt: now,
      updatedAt: now,
    };
    await putSavedView(this.db, view);
    this.savedViews.value = [...this.savedViews.value, view];
    return view;
  }

  async removeSavedView(id: SavedViewId): Promise<void> {
    await deleteSavedView(this.db, id);
    this.savedViews.value = this.savedViews.value.filter((v) => v.id !== id);
  }

  // ---------- Work tracking ----------

  async addWorkTracking(
    requirementId: RequirementId,
    note: string,
    effort?: string,
  ): Promise<WorkTrackingEntry> {
    const now = new Date().toISOString();
    const entry: WorkTrackingEntry = {
      id: asWorkTrackingId(newId()),
      requirementId,
      note,
      ...(effort !== undefined ? { effort } : {}),
      createdAt: now,
      updatedAt: now,
    };
    await putWorkTracking(this.db, entry);
    this.workTracking.value = [...this.workTracking.value, entry];
    return entry;
  }

  async removeWorkTracking(id: WorkTrackingId): Promise<void> {
    await deleteWorkTracking(this.db, id);
    this.workTracking.value = this.workTracking.value.filter((w) => w.id !== id);
  }

  // ---------- Posture ----------

  async setPosture(record: PostureRecord): Promise<void> {
    await putPosture(this.db, record);
    this.posture.value = record;
  }

  // ---------- Meta ----------

  async getMeta(key: string): Promise<unknown> {
    const record = await getMeta(this.db, key);
    return record?.value;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await setMeta(this.db, key, value);
  }
}
