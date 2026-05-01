/**
 * Phase 7.4 / harden R29: defensive boundary tests for the backup restore.
 *
 * Covers:
 *   - valid envelope passes the schema
 *   - missing required field on a row aborts the entire restore
 *   - extra/unknown fields are tolerated (`.passthrough()`)
 *   - malformed JSON is rejected with the legacy error message preserved
 *   - schema failure does not partially populate Dexie (transactional, R29)
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { backupEnvelopeSchema, safeParseBackupEnvelope } from '../../../src/persistence/schemas';
import { restoreFromFile } from '../../../src/persistence/backup';
import { db } from '../../../src/persistence/db';

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'student-uuid-001',
    displayName: 'Alex',
    avatarConfig: { hair: 'short' },
    gradeLevel: 1 as const,
    createdAt: 1700000000000,
    lastActiveAt: 1700000001000,
    localOnly: true,
    syncState: 'local' as const,
    ...overrides,
  };
}

function makeEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    exportedAt: 1700000000000,
    tables: {
      students: [makeStudent()],
      sessions: [],
      attempts: [],
      skillMastery: [],
      deviceMeta: [],
      bookmarks: [],
      sessionTelemetry: [],
      hintEvents: [],
      misconceptionFlags: [],
      progressionStat: [],
    },
    ...overrides,
  };
}

/**
 * Build a synthetic File object from a JSON string. Vitest's jsdom env exposes
 * a working File constructor; `text()` is patched in older jsdom versions, so
 * we use the native body when available and fall back to a hand-rolled stub.
 */
function fileFromJson(payload: string | object): File {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const blob = new Blob([text], { type: 'application/json' });
  // @ts-expect-error — blob → file coercion in jsdom test env
  blob.name = 'backup.json';
  // @ts-expect-error — synthesise the .text() reader if missing
  if (typeof blob.text !== 'function') {
    // @ts-expect-error
    blob.text = async () => text;
  }
  return blob as unknown as File;
}

// ── Schema-level tests ────────────────────────────────────────────────────

describe('backupEnvelopeSchema', () => {
  it('accepts a fully-formed envelope', () => {
    const result = safeParseBackupEnvelope(makeEnvelope());
    expect(result.ok).toBe(true);
  });

  it('rejects an envelope with a row missing a required field', () => {
    const { id: _drop, ...broken } = makeStudent();
    void _drop;
    const env = makeEnvelope({
      tables: {
        students: [broken],
        sessions: [],
        attempts: [],
        skillMastery: [],
        deviceMeta: [],
        bookmarks: [],
        sessionTelemetry: [],
        hintEvents: [],
        misconceptionFlags: [],
        progressionStat: [],
      },
    });
    const result = safeParseBackupEnvelope(env);
    expect(result.ok).toBe(false);
  });

  it('tolerates extra unknown envelope fields via passthrough', () => {
    const parsed = backupEnvelopeSchema.safeParse({
      ...makeEnvelope(),
      futureMetadataField: { generator: 'pipeline-v2' },
    });
    expect(parsed.success).toBe(true);
  });

  it('tolerates extra unknown fields on a row via passthrough', () => {
    const env = makeEnvelope({
      tables: {
        students: [makeStudent({ futureField: 42 })],
        sessions: [],
        attempts: [],
        skillMastery: [],
        deviceMeta: [],
        bookmarks: [],
        sessionTelemetry: [],
        hintEvents: [],
        misconceptionFlags: [],
        progressionStat: [],
      },
    });
    const result = safeParseBackupEnvelope(env);
    expect(result.ok).toBe(true);
  });

  it('rejects an envelope where tables is not an object', () => {
    const result = safeParseBackupEnvelope({
      version: 1,
      exportedAt: 1700000000000,
      tables: 'not-an-object',
    });
    expect(result.ok).toBe(false);
  });
});

// ── restoreFromFile boundary tests ────────────────────────────────────────

describe('restoreFromFile (Zod boundary, R29)', () => {
  beforeEach(async () => {
    await db.students.clear();
    await db.sessions.clear();
    await db.attempts.clear();
    await db.skillMastery.clear();
    await db.deviceMeta.clear();
    await db.bookmarks.clear();
    await db.sessionTelemetry.clear();
    await db.hintEvents.clear();
    await db.misconceptionFlags.clear();
    await db.progressionStat.clear();
  });

  it('rejects malformed JSON with the legacy error message', async () => {
    const file = fileFromJson('not { valid json');
    await expect(restoreFromFile(file)).rejects.toThrow(/invalid JSON/);
  });

  it('rejects an envelope failing schema validation and writes nothing', async () => {
    const { id: _drop, ...brokenStudent } = makeStudent();
    void _drop;
    const env = makeEnvelope({
      tables: {
        students: [brokenStudent],
        sessions: [],
        attempts: [],
        skillMastery: [],
        deviceMeta: [],
        bookmarks: [],
        sessionTelemetry: [],
        hintEvents: [],
        misconceptionFlags: [],
        progressionStat: [],
      },
    });
    const file = fileFromJson(env);
    await expect(restoreFromFile(file)).rejects.toThrow(/schema validation failed/);
    // R29 invariant: nothing landed in Dexie.
    const count = await db.students.count();
    expect(count).toBe(0);
  });

  it('accepts a valid envelope and writes the expected rows', async () => {
    const file = fileFromJson(makeEnvelope());
    const result = await restoreFromFile(file);
    expect(result.added).toBeGreaterThanOrEqual(1);
    const students = await db.students.toArray();
    expect(students).toHaveLength(1);
    expect(students[0]?.id).toBe('student-uuid-001');
  });
});
