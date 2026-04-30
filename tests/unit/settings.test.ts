/**
 * Unit tests for Settings backup/reset/preference flows.
 * Uses fake-indexeddb (via tests/setup.ts) — no Phaser, no DOM canvas.
 * per test-strategy.md §1.2 (unit tests)
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../src/persistence/db';
import { deviceMetaRepo } from '../../src/persistence/repositories/deviceMeta';
import { backupToFile } from '../../src/persistence/backup';
import { lastUsedStudent } from '../../src/persistence/lastUsedStudent';
import type { StudentId } from '../../src/types';

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(async () => {
  // Clear all tables between tests
  await db.students.clear();
  await db.sessions.clear();
  await db.attempts.clear();
  await db.skillMastery.clear();
  await db.deviceMeta.clear();
  await db.bookmarks.clear();
  await db.sessionTelemetry.clear();
  await db.hintEvents.clear();
});

// ── Backup happy path ──────────────────────────────────────────────────────

describe('backupToFile', () => {
  it('returns a Blob with application/json type', async () => {
    const blob = await backupToFile();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });

  it('blob content parses to a valid envelope with correct schema version', async () => {
    const blob = await backupToFile();
    const text = await blob.text();
    const envelope = JSON.parse(text) as {
      version: number;
      exportedAt: number;
      tables: Record<string, unknown[]>;
    };
    expect(envelope.version).toBe(1);
    expect(typeof envelope.exportedAt).toBe('number');
    expect(Array.isArray(envelope.tables.students)).toBe(true);
    expect(Array.isArray(envelope.tables.attempts)).toBe(true);
  });

  it('bumps deviceMeta.lastBackupAt after export', async () => {
    const before = Date.now();
    await backupToFile();
    const meta = await deviceMetaRepo.get();
    expect(meta.lastBackupAt).not.toBeNull();
    expect(meta.lastBackupAt as number).toBeGreaterThanOrEqual(before);
  });

  it('includes student rows in the blob when students exist', async () => {
    await db.students.add({
      id: 'stu-001' as StudentId,
      displayName: 'Alice',
      avatarConfig: {},
      gradeLevel: 1,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      localOnly: true,
      syncState: 'local',
    });
    const blob = await backupToFile();
    const text = await blob.text();
    const envelope = JSON.parse(text) as { tables: { students: Array<{ displayName: string }> } };
    expect(envelope.tables.students).toHaveLength(1);
    expect(envelope.tables.students[0].displayName).toBe('Alice');
  });
});

// ── Reset flow ────────────────────────────────────────────────────────────
// NOTE: db.delete() closes the shared Dexie instance, so this describe block
// must run last and must not be followed by any db operations.

describe('reset flow (lastUsedStudent.clear)', () => {
  it('clears lastUsedStudent from localStorage', () => {
    const store: Record<string, string> = { 'questerix.lastUsedStudentId': 'stu-abc' };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    lastUsedStudent.clear();
    expect(localStorage.getItem('questerix.lastUsedStudentId')).toBeNull();
    vi.unstubAllGlobals();
  });
});

// ── Preference toggle persistence ─────────────────────────────────────────

describe('deviceMetaRepo preference toggles', () => {
  it('updatePreferences persists a single pref change without losing others', async () => {
    await deviceMetaRepo.get(); // bootstrap
    await deviceMetaRepo.updatePreferences({ reduceMotion: true });
    const meta = await deviceMetaRepo.get();
    expect(meta.preferences.reduceMotion).toBe(true);
    // Other prefs should retain defaults
    expect(meta.preferences.highContrast).toBe(false);
  });

  it('toggleing audio off then on round-trips correctly', async () => {
    await deviceMetaRepo.get();
    await deviceMetaRepo.updatePreferences({ audio: false });
    let meta = await deviceMetaRepo.get();
    expect(meta.preferences.audio).toBe(false);
    await deviceMetaRepo.updatePreferences({ audio: true });
    meta = await deviceMetaRepo.get();
    expect(meta.preferences.audio).toBe(true);
  });
});
