/**
 * Dexie database declaration for Questerix Fractions.
 * per persistence-spec.md §4 (schema), §3.2 (persistence grant), §5 (bootstrap)
 */

import Dexie, { type Table } from 'dexie';
import type {
  Student,
  Session,
  Attempt,
  HintEvent,
  SkillMastery,
  DeviceMeta,
  Bookmark,
  SessionTelemetry,
  QuestionTemplate,
} from '../types';

// ── Supplemental types not covered by runtime.ts ───────────────────────────

/** Aggregate telemetry row written at session close. */
export interface SessionTelemetryRow extends SessionTelemetry {
  sessionId: import('../types').SessionId;
}

// ── DB class ───────────────────────────────────────────────────────────────

export class QuesterixDB extends Dexie {
  // Static stores (curriculum) — per persistence-spec.md §4
  questionTemplates!: Table<QuestionTemplate, string>;

  // Dynamic stores (student progress) — per persistence-spec.md §4
  students!: Table<Student, string>;
  sessions!: Table<Session, string>;
  // ++id means auto-increment numeric PK; typed as number at the Dexie layer
  attempts!: Table<Attempt, number>;
  skillMastery!: Table<SkillMastery, [string, string]>;
  deviceMeta!: Table<DeviceMeta, string>;
  bookmarks!: Table<Bookmark, string>;
  sessionTelemetry!: Table<SessionTelemetry, string>;
  hintEvents!: Table<HintEvent, number>;

  constructor() {
    super('questerix-fractions');

    // Schema version 1 — initial release. per persistence-spec.md §4
    this.version(1).stores({
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      // ++id = auto-increment PK; append-only per persistence-spec.md §4
      attempts: '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId', // singleton row, installId="device"
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
    });

    // Schema version 2 — adds questionTemplates static store. per persistence-spec.md §4
    // levelGroup index allows db.questionTemplates.where('levelGroup').equals('01-02') queries.
    this.version(2).stores({
      students: 'id, displayName, createdAt',
      sessions: 'id, studentId, startedAt, [studentId+startedAt]',
      attempts: '++id, sessionId, studentId, questionTemplateId, submittedAt, [studentId+submittedAt], [studentId+questionTemplateId]',
      skillMastery: '[studentId+skillId], studentId, skillId, lastAttemptAt',
      deviceMeta: '&installId',
      bookmarks: 'id, studentId',
      sessionTelemetry: 'sessionId, studentId',
      hintEvents: '++id, attemptId',
      // Static curriculum store — per persistence-spec.md §4
      questionTemplates: 'id, archetype, [archetype+difficultyTier], levelGroup',
    });
  }
}

export const db = new QuesterixDB();

// ── Persistence grant helper ───────────────────────────────────────────────

/**
 * Request durable IndexedDB storage to survive iOS Safari ITP eviction.
 * per persistence-spec.md §3.2
 * Returns false if the API is unavailable or the request is denied.
 */
export async function ensurePersistenceGranted(): Promise<boolean> {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist();
  } catch {
    return false;
  }
}
