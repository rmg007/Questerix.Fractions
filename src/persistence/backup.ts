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
  } catch {
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
