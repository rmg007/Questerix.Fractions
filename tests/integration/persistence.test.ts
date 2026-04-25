/**
 * Integration tests for the Questerix Fractions persistence layer.
 * Uses fake-indexeddb so no real browser is needed.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '../../src/persistence/db';
import { studentRepo } from '../../src/persistence/repositories/student';
import { sessionRepo } from '../../src/persistence/repositories/session';
import { attemptRepo } from '../../src/persistence/repositories/attempt';
import { skillMasteryRepo } from '../../src/persistence/repositories/skillMastery';
import { deviceMetaRepo } from '../../src/persistence/repositories/deviceMeta';
import { bookmarkRepo } from '../../src/persistence/repositories/bookmark';
import { backupToFile, restoreFromFile } from '../../src/persistence/backup';
import type { Student, Session, Attempt, SkillMastery } from '../../src/types';
import {
  StudentId,
  SessionId,
  AttemptId,
  ActivityId,
  SkillId,
  QuestionTemplateId,
  MisconceptionId,
} from '../../src/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeStudent(name: string): Parameters<typeof studentRepo.create>[0] & { id: ReturnType<typeof StudentId> } {
  return {
    id: StudentId(`student-${name.toLowerCase()}`),
    displayName: name,
    avatarConfig: {},
    gradeLevel: 1,
    lastActiveAt: Date.now(),
    localOnly: true,
  };
}

function makeSession(studentId: ReturnType<typeof StudentId>, n: number): Session {
  return {
    id: SessionId(`session-${n}`),
    studentId,
    activityId: ActivityId('magnitude_scales'),
    levelNumber: 1,
    scaffoldLevel: 3,
    startedAt: Date.now() + n,
    endedAt: null,
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: null,
    avgResponseMs: null,
    xpEarned: 0,
    scaffoldRecommendation: null,
    endLevel: 1,
    device: { type: 'desktop', viewport: { width: 1280, height: 800 } },
    syncState: 'local',
  };
}

function makeAttempt(
  studentId: ReturnType<typeof StudentId>,
  sessionId: ReturnType<typeof SessionId>,
  n: number,
): Omit<Attempt, 'id'> {
  return {
    sessionId,
    studentId,
    questionTemplateId: QuestionTemplateId(`q:ms:L1:000${n}`),
    archetype: 'magnitude_scales',
    roundNumber: 1,
    attemptNumber: 1,
    startedAt: Date.now() + n,
    submittedAt: Date.now() + n + 3000,
    responseMs: 3000,
    studentAnswerRaw: 0.5,
    correctAnswerRaw: 0.5,
    outcome: 'EXACT',
    errorMagnitude: null,
    pointsEarned: 10,
    hintsUsedIds: [],
    hintsUsed: [],
    flaggedMisconceptionIds: [],
    validatorPayload: {},
    syncState: 'local',
  };
}

function makeMastery(
  studentId: ReturnType<typeof StudentId>,
  skillId: ReturnType<typeof SkillId>,
): SkillMastery {
  return {
    studentId,
    skillId,
    compositeKey: [studentId, skillId],
    masteryEstimate: 0.72,
    state: 'APPROACHING',
    consecutiveCorrectUnassisted: 2,
    totalAttempts: 5,
    correctAttempts: 4,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

// ── Reset DB between tests ─────────────────────────────────────────────────

beforeEach(async () => {
  await db.delete();
  await db.open();
});

// ── Student repository ─────────────────────────────────────────────────────

describe('studentRepo', () => {
  it('creates and retrieves a student', async () => {
    const input = makeStudent('Alice');
    const created = await studentRepo.create(input);
    expect(created.id).toBe(input.id);
    expect(created.syncState).toBe('local');
    expect(created.createdAt).toBeTypeOf('number');

    const fetched = await studentRepo.get(input.id);
    expect(fetched?.displayName).toBe('Alice');
  });

  it('lists students ordered by createdAt', async () => {
    await studentRepo.create(makeStudent('Bob'));
    await studentRepo.create(makeStudent('Carol'));
    const list = await studentRepo.list();
    expect(list.length).toBe(2);
    expect(list[0].createdAt).toBeLessThanOrEqual(list[1].createdAt);
  });

  it('updates a student field', async () => {
    const { id } = await studentRepo.create(makeStudent('Dave'));
    const ok = await studentRepo.update(id, { displayName: 'David' });
    expect(ok).toBe(true);
    const fetched = await studentRepo.get(id);
    expect(fetched?.displayName).toBe('David');
  });

  it('returns undefined for unknown id', async () => {
    const result = await studentRepo.get(StudentId('no-such-id'));
    expect(result).toBeUndefined();
  });
});

// ── Session repository ─────────────────────────────────────────────────────

describe('sessionRepo', () => {
  it('creates and retrieves a session', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Eve'));
    const session = makeSession(studentId, 1);
    await sessionRepo.create(session);
    const fetched = await sessionRepo.get(session.id);
    expect(fetched?.studentId).toBe(studentId);
  });

  it('lists sessions for a student', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Frank'));
    await sessionRepo.create(makeSession(studentId, 1));
    await sessionRepo.create(makeSession(studentId, 2));
    const list = await sessionRepo.listForStudent(studentId);
    expect(list.length).toBe(2);
  });

  it('closes a session with summary data', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Grace'));
    const session = makeSession(studentId, 1);
    await sessionRepo.create(session);
    const ok = await sessionRepo.close(session.id, {
      endedAt: Date.now(),
      totalAttempts: 5,
      correctAttempts: 4,
      accuracy: 0.8,
      avgResponseMs: 3200,
      xpEarned: 40,
      scaffoldRecommendation: 'advance',
      endLevel: 2,
    });
    expect(ok).toBe(true);
    const fetched = await sessionRepo.get(session.id);
    expect(fetched?.endedAt).not.toBeNull();
  });
});

// ── Attempt repository (append-only) ──────────────────────────────────────

describe('attemptRepo', () => {
  it('records 5 attempts append-only and counts them', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Heidi'));
    const session = makeSession(studentId, 1);
    await sessionRepo.create(session);

    for (let i = 0; i < 5; i++) {
      await attemptRepo.record(makeAttempt(studentId, session.id, i));
    }

    const count = await attemptRepo.countForStudent(studentId);
    expect(count).toBe(5);

    const list = await attemptRepo.listForSession(session.id);
    expect(list.length).toBe(5);
  });

  it('returned attempt has string id', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Ivan'));
    const session = makeSession(studentId, 1);
    await sessionRepo.create(session);
    const result = await attemptRepo.record(makeAttempt(studentId, session.id, 0));
    expect(typeof result.id).toBe('string');
  });
});

// ── SkillMastery repository ────────────────────────────────────────────────

describe('skillMasteryRepo', () => {
  it('upserts and retrieves by composite key', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Judy'));
    const skillId = SkillId('SK-03');
    const mastery = makeMastery(studentId, skillId);
    await skillMasteryRepo.upsert(mastery);

    const fetched = await skillMasteryRepo.get(studentId, skillId);
    expect(fetched?.masteryEstimate).toBe(0.72);
  });

  it('replaces on second upsert', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Karl'));
    const skillId = SkillId('SK-01');
    await skillMasteryRepo.upsert(makeMastery(studentId, skillId));
    await skillMasteryRepo.upsert({
      ...makeMastery(studentId, skillId),
      masteryEstimate: 0.95,
      state: 'MASTERED',
    });
    const fetched = await skillMasteryRepo.get(studentId, skillId);
    expect(fetched?.state).toBe('MASTERED');
  });

  it('getAllForStudent returns all mastery rows', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Laura'));
    await skillMasteryRepo.upsert(makeMastery(studentId, SkillId('SK-01')));
    await skillMasteryRepo.upsert(makeMastery(studentId, SkillId('SK-02')));
    const all = await skillMasteryRepo.getAllForStudent(studentId);
    expect(all.length).toBe(2);
  });
});

// ── DeviceMeta (singleton) ─────────────────────────────────────────────────

describe('deviceMetaRepo', () => {
  it('lazy-creates singleton with defaults', async () => {
    const meta = await deviceMetaRepo.get();
    expect(meta.installId).toBe('device');
    expect(meta.schemaVersion).toBe(1);
    expect(meta.lastBackupAt).toBeNull();
  });

  it('update patches the singleton', async () => {
    await deviceMetaRepo.get(); // ensure exists
    await deviceMetaRepo.update({ lastBackupAt: 12345 });
    const meta = await deviceMetaRepo.get();
    expect(meta.lastBackupAt).toBe(12345);
  });

  it('updatePreferences merges without clobbering', async () => {
    await deviceMetaRepo.updatePreferences({ reduceMotion: true });
    const meta = await deviceMetaRepo.get();
    expect(meta.preferences.reduceMotion).toBe(true);
    expect(meta.preferences.audio).toBe(true); // untouched
  });
});

// ── Bookmark repository ────────────────────────────────────────────────────

describe('bookmarkRepo', () => {
  it('saves and retrieves a bookmark', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Mallory'));
    const bm = {
      id: 'bm-1',
      studentId,
      activityId: ActivityId('magnitude_scales'),
      levelNumber: 3,
      savedAt: Date.now(),
      syncState: 'local' as const,
    };
    await bookmarkRepo.save(bm);
    const fetched = await bookmarkRepo.get('bm-1');
    expect(fetched?.levelNumber).toBe(3);
  });

  it('getLatestForStudent returns the most recent', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Nina'));
    await bookmarkRepo.save({ id: 'bm-a', studentId, activityId: ActivityId('a'), levelNumber: 1, savedAt: 100, syncState: 'local' });
    await bookmarkRepo.save({ id: 'bm-b', studentId, activityId: ActivityId('a'), levelNumber: 2, savedAt: 200, syncState: 'local' });
    const latest = await bookmarkRepo.getLatestForStudent(studentId);
    expect(latest?.id).toBe('bm-b');
  });
});

// ── Backup / restore round-trip ────────────────────────────────────────────

describe('backup and restore', () => {
  it('exports all rows and restores to fresh DB with correct counts', async () => {
    // Seed data
    const { id: studentId } = await studentRepo.create(makeStudent('Oscar'));
    const session = makeSession(studentId, 1);
    await sessionRepo.create(session);
    for (let i = 0; i < 5; i++) {
      await attemptRepo.record(makeAttempt(studentId, session.id, i));
    }
    await skillMasteryRepo.upsert(makeMastery(studentId, SkillId('SK-05')));

    // Export
    const blob = await backupToFile();
    expect(blob.size).toBeGreaterThan(0);

    const meta = await deviceMetaRepo.get();
    expect(meta.lastBackupAt).not.toBeNull();

    // Wipe DB and restore
    await db.delete();
    await db.open();

    const file = new File([blob], 'backup.json', { type: 'application/json' });
    const result = await restoreFromFile(file);

    // Verify counts
    const students = await studentRepo.list();
    const sessions = await sessionRepo.listForStudent(studentId);
    const attemptCount = await attemptRepo.countForStudent(studentId);
    const mastery = await skillMasteryRepo.getAllForStudent(studentId);

    expect(students.length).toBe(1);
    expect(sessions.length).toBe(1);
    expect(attemptCount).toBe(5);
    expect(mastery.length).toBe(1);
    expect(result.added).toBeGreaterThan(0);
  });

  it('skips duplicate records on second restore', async () => {
    const { id: studentId } = await studentRepo.create(makeStudent('Peggy'));
    const blob = await backupToFile();
    const file = new File([blob], 'backup.json', { type: 'application/json' });

    // First restore
    await db.delete();
    await db.open();
    const r1 = await restoreFromFile(file);

    // Second restore — all existing records should be skipped
    const r2 = await restoreFromFile(file);
    expect(r2.skipped).toBeGreaterThanOrEqual(r1.added);
    expect(r2.added).toBe(0);
  });

  it('throws on invalid JSON', async () => {
    const bad = new File(['not json'], 'bad.json', { type: 'application/json' });
    await expect(restoreFromFile(bad)).rejects.toThrow('invalid JSON');
  });

  it('throws on wrong schema version', async () => {
    const envelope = JSON.stringify({ version: 99, exportedAt: Date.now(), tables: {} });
    const file = new File([envelope], 'old.json', { type: 'application/json' });
    await expect(restoreFromFile(file)).rejects.toThrow('unsupported schema version');
  });
});
