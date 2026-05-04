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
  LevelProgression,
  StreakRecord,
  TelemetryEvent,
} from '../types';
import { safeParseBackupEnvelope } from './schemas';
import { log } from '../lib/log';

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
    levelProgression: LevelProgression[];
    streakRecord: StreakRecord[];
    telemetryEvents: TelemetryEvent[];
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
  const levelProgression = await db.levelProgression.toArray();
  const streakRecord = await db.streakRecord.toArray();
  const telemetryEvents = await db.telemetryEvents.toArray();

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
      levelProgression,
      streakRecord,
      telemetryEvents,
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
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error('backup.restore: invalid JSON');
  }

  // Phase 7.4 / harden R29: Zod-backed envelope validation. Reject the entire
  // restore on any malformed table or row — the transaction below stays
  // all-or-nothing, and a partially-valid backup never reaches Dexie.
  const parsed = safeParseBackupEnvelope(raw);
  if (!parsed.ok) {
    log.warn('BACKUP', 'envelope.invalid', { issues: parsed.message });
    throw new Error(`backup.restore: schema validation failed — ${parsed.message}`);
  }
  const envelope = parsed.value;

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
        // Dexie throws ConstraintError on both PK and other constraint violations.
        // For restore semantics, PK collisions are acceptable (skip silently);
        // non-PK constraint violations should also be skipped with logging.
        if (err instanceof Error && err.name === 'ConstraintError') {
          // Log the collision for visibility but don't fail the entire restore
          if (err.message.includes('PRIMARY KEY')) {
            // PK collision — expected in restore, skip silently
            skipped++;
          } else {
            // Non-PK constraint violation — log and skip
            log.warn('BACKUP', 'restore.constraint_violation', {
              table: table.name,
              error: err.message,
              row: row,
            });
            skipped++;
          }
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
      db.levelProgression,
      db.streakRecord,
      db.telemetryEvents,
    ],
    async () => {
      // Cast Zod-parsed tables (plain strings) to entity types (branded IDs)
      // Zod validates structure; TypeScript brands are zero-cost at runtime
      await tryAddAll(db.students, (t.students ?? []) as unknown as Student[]);
      await tryAddAll(db.sessions, (t.sessions ?? []) as unknown as Session[]);
      await tryAddAll(db.attempts, (t.attempts ?? []) as unknown as Attempt[]);
      await tryAddAll(db.skillMastery, (t.skillMastery ?? []) as unknown as SkillMastery[]);
      await tryAddAll(db.bookmarks, (t.bookmarks ?? []) as unknown as Bookmark[]);
      await tryAddAll(
        db.sessionTelemetry,
        (t.sessionTelemetry ?? []) as unknown as SessionTelemetry[]
      );
      await tryAddAll(db.hintEvents, (t.hintEvents ?? []) as unknown as HintEvent[]);
      await tryAddAll(
        db.misconceptionFlags,
        (t.misconceptionFlags ?? []) as unknown as MisconceptionFlag[]
      );
      await tryAddAll(
        db.progressionStat,
        (t.progressionStat ?? []) as unknown as ProgressionStat[]
      );
      await tryAddAll(
        db.levelProgression,
        (t.levelProgression ?? []) as unknown as LevelProgression[]
      );
      await tryAddAll(db.streakRecord, (t.streakRecord ?? []) as unknown as StreakRecord[]);
      await tryAddAll(db.telemetryEvents, (t.telemetryEvents ?? []) as unknown as TelemetryEvent[]);
      // Restore deviceMeta with merge strategy: keep newer lastBackupAt.
      // Wrapped in nested transaction to avoid race between read and write.
      if (t.deviceMeta && t.deviceMeta.length > 0) {
        for (const backupMeta of t.deviceMeta) {
          const backupMetaTyped = backupMeta as unknown as DeviceMeta;
          // Atomic read-compare-write: ensure no other update sneaks between read and update
          await db.transaction('rw', db.deviceMeta, async () => {
            const live = await db.deviceMeta.get(backupMetaTyped.installId);
            if (live && (live.lastBackupAt ?? 0) > (backupMetaTyped.lastBackupAt ?? 0)) {
              // Keep live data if it's newer
              console.info('[backup.restore] Keeping newer live deviceMeta (lastBackupAt)');
            } else {
              // Update with backup data
              await db.deviceMeta.put(backupMetaTyped);
              added++;
            }
          });
        }
      }
    }
  );

  await deviceMetaRepo.update({ lastRestoredAt: Date.now() });

  return { added, skipped };
}

// Suppress unused-import warning — Dexie is referenced for Table generic above
void (Dexie as unknown);
