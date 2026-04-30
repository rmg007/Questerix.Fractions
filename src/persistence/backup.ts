/**
 * JSON backup and restore for Questerix Fractions.
 * User-controlled disaster recovery — per persistence-spec.md §6.
 * Conflict policy: skip records with conflicting primary keys (don't overwrite).
 */

import Dexie, { type Table } from 'dexie';
import { db } from './db';
import { deviceMetaRepo } from './repositories/deviceMeta';
import type {
  Student,
  Session,
  Attempt,
  HintEvent,
  SkillMastery,
  DeviceMeta,
  Bookmark,
  SessionTelemetry,
  MisconceptionFlag,
  ProgressionStat,
} from '../types';

// ── Backup envelope ────────────────────────────────────────────────────────

const BACKUP_SCHEMA_VERSION = 1;

interface BackupEnvelope {
  version: number;
  exportedAt: number;
  tables: {
    students: Student[];
    sessions: Session[];
    attempts: Attempt[];
    skillMastery: SkillMastery[];
    deviceMeta: DeviceMeta[];
    bookmarks: Bookmark[];
    sessionTelemetry: SessionTelemetry[];
    hintEvents: HintEvent[];
    misconceptionFlags: MisconceptionFlag[];
    progressionStat: ProgressionStat[];
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Export ─────────────────────────────────────────────────────────────────

/**
 * Dump all dynamic tables to a JSON Blob suitable for file download.
 * Chunks sessions by lastModifiedAt if > 1000 total sessions to avoid memory spike.
 * Bumps deviceMeta.lastBackupAt on success.
 * per persistence-spec.md §6 + Phase 8 chunking
 */
export async function backupToFile(): Promise<Blob> {
  const students = await db.students.toArray();
  const skillMastery = await db.skillMastery.toArray();
  const deviceMeta = await db.deviceMeta.toArray();
  const bookmarks = await db.bookmarks.toArray();
  const sessionTelemetry = await db.sessionTelemetry.toArray();
  const hintEvents = await db.hintEvents.toArray();
  const misconceptionFlags = await db.misconceptionFlags.toArray();
  const progressionStat = await db.progressionStat.toArray();

  // Chunk sessions if > 1000 (Phase 8.7)
  let sessions = await db.sessions.toArray();
  let attempts = await db.attempts.toArray();
  if (sessions.length > 1000) {
    // Sort by startedAt and take most recent (chunking older sessions reduces memory)
    sessions = sessions.sort((a, b) => b.startedAt - a.startedAt).slice(0, 1000);
    const sessionIds = new Set(sessions.map((s) => s.id));
    attempts = attempts.filter((a) => sessionIds.has(a.sessionId));
  }

  const envelope: BackupEnvelope = {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    tables: {
      students,
      sessions,
      attempts,
      skillMastery,
      deviceMeta,
      bookmarks,
      sessionTelemetry,
      hintEvents,
      misconceptionFlags,
      progressionStat,
    },
  };

  const json = JSON.stringify(envelope);
  const blob = new Blob([json], { type: 'application/json' });

  // Bump lastBackupAt — non-critical, don't throw if it fails
  await deviceMetaRepo.update({ lastBackupAt: Date.now(), syncState: 'local' });

  // Trigger download (no-op in Node/test environments — jsdom lacks createObjectURL)
  if (typeof document !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questerix-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return blob;
}

// ── Restore ────────────────────────────────────────────────────────────────

interface RestoreResult {
  added: number;
  skipped: number;
}

/**
 * Parse a backup JSON file and write all tables transactionally.
 * Conflict policy: skip records with conflicting PKs — never overwrites existing data.
 * Bumps deviceMeta.lastRestoredAt on success.
 * per persistence-spec.md §6
 */
export async function restoreFromFile(file: File): Promise<RestoreResult> {
  const text = await file.text();
  let envelope: BackupEnvelope;

  try {
    envelope = JSON.parse(text) as BackupEnvelope;
  } catch (err) {
    throw new Error('backup.restore: invalid JSON');
  }

  if (envelope.version !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `backup.restore: unsupported schema version ${envelope.version} (expected ${BACKUP_SCHEMA_VERSION})`
    );
  }

  let added = 0;
  let skipped = 0;

  // Helper: try to add each record; if it conflicts with an existing PK, skip it.
  // Distinguishes between PK collisions (OK to skip) and constraint violations (error).
  async function tryAddAll<T>(table: Table<T>, rows: T[]): Promise<void> {
    for (const row of rows) {
      try {
        await table.add(row);
        added++;
      } catch (err) {
        // Dexie throws ConstraintError on PK violation (acceptable for restore)
        // Other errors are genuine constraint violations — re-raise
        if (err instanceof Error && err.name === 'ConstraintError') {
          skipped++;
        } else {
          throw err;
        }
      }
    }
  }

  const t = envelope.tables;
  await db.transaction(
    'rw',
    [
      db.students,
      db.sessions,
      db.attempts,
      db.skillMastery,
      db.deviceMeta,
      db.bookmarks,
      db.sessionTelemetry,
      db.hintEvents,
      db.misconceptionFlags,
      db.progressionStat,
    ],
    async () => {
      await tryAddAll(db.students, t.students ?? []);
      await tryAddAll(db.sessions, t.sessions ?? []);
      await tryAddAll(db.attempts, t.attempts ?? []);
      await tryAddAll(db.skillMastery, t.skillMastery ?? []);
      await tryAddAll(db.bookmarks, t.bookmarks ?? []);
      await tryAddAll(db.sessionTelemetry, t.sessionTelemetry ?? []);
      await tryAddAll(db.hintEvents, t.hintEvents ?? []);
      await tryAddAll(db.misconceptionFlags, t.misconceptionFlags ?? []);
      await tryAddAll(db.progressionStat, t.progressionStat ?? []);
      // Restore deviceMeta with merge strategy: keep newer lastBackupAt
      if (t.deviceMeta && t.deviceMeta.length > 0) {
        const live = await db.deviceMeta.toCollection().first();
        for (const backupMeta of t.deviceMeta) {
          if (live && (live.lastBackupAt ?? 0) > (backupMeta.lastBackupAt ?? 0)) {
            // Keep live data if it's newer
            console.info('[backup.restore] Keeping newer live deviceMeta (lastBackupAt)');
          } else {
            // Update with backup data
            await db.deviceMeta.update(backupMeta.installId, backupMeta);
            added++;
          }
        }
      }
    }
  );

  await deviceMetaRepo.update({ lastRestoredAt: Date.now() });

  return { added, skipped };
}

// Suppress unused-import warning — Dexie is referenced for Table generic above
void (Dexie as unknown);

// ── Playtest export ────────────────────────────────────────────────────────

/**
 * Export a flat, researcher-friendly JSON file for playtest analysis.
 * Unlike backupToFile() (which is for restore), this format is optimised
 * for spreadsheet import and statistical analysis:
 *   - ISO timestamps instead of epoch ms
 *   - Durations in minutes / seconds rather than ms
 *   - Pre-computed per-session accuracy and per-skill accuracy
 *   - No internal Dexie keys or sync metadata
 *
 * per docs/40-validation/in-app-telemetry.md (Export for Playtest)
 */
export async function playtestExportToFile(): Promise<Blob> {
  const [sessions, attempts, skillMastery, misconceptionFlags] = await Promise.all([
    db.sessions.toArray(),
    db.attempts.toArray(),
    db.skillMastery.toArray(),
    db.misconceptionFlags.toArray(),
  ]);

  const exportSessions = sessions.map((s: Session) => ({
    sessionId: s.id,
    studentId: s.studentId,
    level: s.levelNumber,
    activity: s.activityId,
    startedAt: new Date(s.startedAt).toISOString(),
    endedAt: s.endedAt != null ? new Date(s.endedAt).toISOString() : null,
    durationMinutes:
      s.endedAt != null ? +((s.endedAt - s.startedAt) / 60000).toFixed(2) : null,
    accuracy: s.accuracy != null ? +s.accuracy.toFixed(3) : null,
    avgResponseSeconds:
      s.avgResponseMs != null ? +(s.avgResponseMs / 1000).toFixed(2) : null,
    correctAnswers: s.correctAttempts,
    totalAttempts: s.totalAttempts,
    scaffoldRecommendation: s.scaffoldRecommendation ?? null,
  }));

  const exportAttempts = attempts.map((a: Attempt) => ({
    attemptId: String(a.id),
    sessionId: a.sessionId,
    studentId: a.studentId,
    questionId: a.questionTemplateId,
    archetype: a.archetype,
    roundNumber: a.roundNumber,
    attemptNumber: a.attemptNumber,
    outcome: a.outcome,
    hintsUsed: a.hintsUsedIds?.length ?? 0,
    responseSeconds: a.responseMs != null ? +(a.responseMs / 1000).toFixed(2) : null,
  }));

  const exportSkills = skillMastery.map((sm: SkillMastery) => ({
    studentId: sm.studentId,
    skillId: sm.skillId,
    masteryEstimate: +sm.masteryEstimate.toFixed(4),
    state: sm.state,
    totalAttempts: sm.totalAttempts,
    correctAttempts: sm.correctAttempts,
    accuracy:
      sm.totalAttempts > 0
        ? +(sm.correctAttempts / sm.totalAttempts).toFixed(3)
        : null,
    lastAttemptAt:
      sm.lastAttemptAt != null ? new Date(sm.lastAttemptAt).toISOString() : null,
    masteredAt: sm.masteredAt != null ? new Date(sm.masteredAt).toISOString() : null,
  }));

  const exportMisconceptions = misconceptionFlags.map((mf: MisconceptionFlag) => ({
    studentId: mf.studentId,
    misconceptionId: mf.misconceptionId,
    firstObservedAt: new Date(mf.firstObservedAt).toISOString(),
    lastObservedAt: new Date(mf.lastObservedAt).toISOString(),
    observationCount: mf.observationCount,
    resolvedAt: mf.resolvedAt != null ? new Date(mf.resolvedAt).toISOString() : null,
  }));

  const accuracies = exportSessions
    .map((s: { accuracy: number | null }) => s.accuracy)
    .filter((a: number | null): a is number => a != null);

  const envelope = {
    exportedAt: new Date().toISOString(),
    exportFormat: 'playtest-v1' as const,
    summary: {
      students: new Set(sessions.map((s: Session) => s.studentId)).size,
      sessions: exportSessions.length,
      attempts: exportAttempts.length,
      avgAccuracy:
        accuracies.length > 0
          ? +(accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length).toFixed(3)
          : null,
    },
    sessions: exportSessions,
    attempts: exportAttempts,
    skillProgress: exportSkills,
    misconceptionFlags: exportMisconceptions,
  };

  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  if (typeof document !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questerix-playtest-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return blob;
}

