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
import { levelProgressionRepo } from '../../src/persistence/repositories/levelProgression';
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

function makeStudent(
  name: string
): Parameters<typeof studentRepo.create>[0] & { id: ReturnType<typeof StudentId> } {
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
  n: number
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
  skillId: ReturnType<typeof SkillId>
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
    await bookmarkRepo.save({
      id: 'bm-a',
      studentId,
      activityId: ActivityId('a'),
      levelNumber: 1,
      savedAt: 100,
      syncState: 'local',
    });
    await bookmarkRepo.save({
      id: 'bm-b',
      studentId,
      activityId: ActivityId('a'),
      levelNumber: 2,
      savedAt: 200,
      syncState: 'local',
    });
    const latest = await bookmarkRepo.getLatestForStudent(studentId);
    expect(latest?.id).toBe('bm-b');
  });
});

// ── Level progression repository (C5 Dexie migration) ──────────────────────

describe('levelProgressionRepo', () => {
  it('getOrCreate initializes with level 1 unlocked', async () => {
    const studentId = StudentId('student-new');
    const prog = await levelProgressionRepo.getOrCreate(studentId);
    expect(prog.studentId).toBe(studentId);
    expect(prog.unlockedLevels).toEqual([1]);
    expect(prog.completedLevels).toEqual([]);
    expect(prog.syncState).toBe('local');
  });

  it('get returns undefined for non-existent student', async () => {
    const studentId = StudentId('student-nonexistent');
    const prog = await levelProgressionRepo.get(studentId);
    expect(prog).toBeUndefined();
  });

  it('unlock adds a level idempotently', async () => {
    const studentId = StudentId('student-unlock-test');
    await levelProgressionRepo.unlock(studentId, 2);
    const prog = await levelProgressionRepo.get(studentId);
    expect(prog?.unlockedLevels).toContain(2);

    // Second unlock should be idempotent
    await levelProgressionRepo.unlock(studentId, 2);
    const prog2 = await levelProgressionRepo.get(studentId);
    expect(prog2?.unlockedLevels.filter((n) => n === 2)).toHaveLength(1);
  });

  it('complete marks a level as completed and unlocks next', async () => {
    const studentId = StudentId('student-complete-test');
    await levelProgressionRepo.complete(studentId, 1);
    const prog = await levelProgressionRepo.get(studentId);
    expect(prog?.completedLevels).toContain(1);
    expect(prog?.unlockedLevels).toContain(2);
  });

  it('complete is idempotent', async () => {
    const studentId = StudentId('student-complete-idempotent');
    await levelProgressionRepo.complete(studentId, 3);
    await levelProgressionRepo.complete(studentId, 3);
    const prog = await levelProgressionRepo.get(studentId);
    expect(prog?.completedLevels.filter((n) => n === 3)).toHaveLength(1);
  });

  it('complete unlocks level 9 but does not try to unlock level 10', async () => {
    const studentId = StudentId('student-complete-9');
    await levelProgressionRepo.complete(studentId, 9);
    const prog = await levelProgressionRepo.get(studentId);
    expect(prog?.completedLevels).toContain(9);
    // Should not attempt to add level 10 (which doesn't exist)
    expect(prog?.unlockedLevels).not.toContain(10);
  });

  it('getUnlockedLevels returns a Set', async () => {
    const studentId = StudentId('student-unlocked-set');
    await levelProgressionRepo.unlock(studentId, 1);
    await levelProgressionRepo.unlock(studentId, 2);
    await levelProgressionRepo.unlock(studentId, 3);
    const unlocked = await levelProgressionRepo.getUnlockedLevels(studentId);
    expect(unlocked).toBeInstanceOf(Set);
    expect(unlocked.has(1)).toBe(true);
    expect(unlocked.has(2)).toBe(true);
    expect(unlocked.has(3)).toBe(true);
    expect(unlocked.has(4)).toBe(false);
  });

  it('getCompletedLevels returns a Set', async () => {
    const studentId = StudentId('student-completed-set');
    await levelProgressionRepo.complete(studentId, 1);
    await levelProgressionRepo.complete(studentId, 2);
    const completed = await levelProgressionRepo.getCompletedLevels(studentId);
    expect(completed).toBeInstanceOf(Set);
    expect(completed.has(1)).toBe(true);
    expect(completed.has(2)).toBe(true);
    expect(completed.has(3)).toBe(false);
  });

  it('upsert persists a full progression record', async () => {
    const studentId = StudentId('student-upsert');
    const now = Date.now();
    const record = {
      studentId,
      unlockedLevels: [1, 2, 3, 4],
      completedLevels: [1, 2],
      lastUpdatedAt: now,
      syncState: 'local' as const,
    };
    await levelProgressionRepo.upsert(record);
    const fetched = await levelProgressionRepo.get(studentId);
    expect(fetched?.unlockedLevels).toEqual([1, 2, 3, 4]);
    expect(fetched?.completedLevels).toEqual([1, 2]);
  });

  it('delete removes a progression record idempotently', async () => {
    const studentId = StudentId('student-delete');
    await levelProgressionRepo.complete(studentId, 1);
    let prog = await levelProgressionRepo.get(studentId);
    expect(prog).toBeDefined();

    await levelProgressionRepo.delete(studentId);
    prog = await levelProgressionRepo.get(studentId);
    expect(prog).toBeUndefined();

    // Second delete should not throw
    await levelProgressionRepo.delete(studentId);
    expect(true); // No exception
  });

  it('maintains sorted order on unlock and complete', async () => {
    const studentId = StudentId('student-sorted');
    // Unlock in non-sequential order
    await levelProgressionRepo.unlock(studentId, 5);
    await levelProgressionRepo.unlock(studentId, 2);
    await levelProgressionRepo.unlock(studentId, 8);
    const prog = await levelProgressionRepo.get(studentId);
    expect(prog?.unlockedLevels).toEqual([1, 2, 5, 8]);
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

    // Second restore — every conflict-skip table (students, sessions, etc.)
    // should report skipped, not added. deviceMeta is the one exception: its
    // restore branch is an idempotent upsert (`db.deviceMeta.update`) and
    // always counts as added, so r2.added can be up to 1.
    const r2 = await restoreFromFile(file);
    expect(r2.skipped).toBeGreaterThanOrEqual(r1.added - 1);
    expect(r2.added).toBeLessThanOrEqual(1);
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

// ── Backup envelope shape — the contract validation-data/scripts/check.py reads ──
//
// `check.py` is the playtest pre-flight validator. If its expectations drift
// from the runtime envelope, the playtest day is wasted on a debug session.
// Every assertion here mirrors a check the script makes; if you change the
// envelope, update both sides at once.
describe('backup envelope shape (check.py contract)', () => {
  const VALID_OUTCOMES = new Set(['EXACT', 'CLOSE', 'WRONG', 'ASSISTED', 'ABANDONED']);
  const CORRECT_OUTCOMES = new Set(['EXACT', 'CLOSE']);

  async function seedAndExport(): Promise<Record<string, unknown>> {
    const { id: studentId } = await studentRepo.create(makeStudent('Playtester'));
    const session = makeSession(studentId, 1);
    await sessionRepo.create(session);
    const outcomes: Array<'EXACT' | 'CLOSE' | 'WRONG'> = [
      'EXACT',
      'EXACT',
      'WRONG',
      'CLOSE',
      'EXACT',
    ];
    for (let i = 0; i < outcomes.length; i++) {
      const att = { ...makeAttempt(studentId, session.id, i), outcome: outcomes[i]! };
      await attemptRepo.record(att);
    }
    const correctCount = outcomes.filter((o) => CORRECT_OUTCOMES.has(o)).length;
    await sessionRepo.close(session.id, {
      endedAt: Date.now() + 1000,
      totalAttempts: outcomes.length,
      correctAttempts: correctCount,
      accuracy: correctCount / outcomes.length,
      avgResponseMs: 3000,
      xpEarned: correctCount * 10,
      scaffoldRecommendation: 'hold',
      endLevel: 1,
    });
    const blob = await backupToFile();
    return JSON.parse(await blob.text()) as Record<string, unknown>;
  }

  it('writes the top-level keys check.py reads', async () => {
    const env = await seedAndExport();
    expect(env).toHaveProperty('version');
    expect(env.version).toBe(1);
    expect(typeof env.exportedAt).toBe('number');
    expect(env).toHaveProperty('tables');
    expect(typeof env.tables).toBe('object');
  });

  it('writes every table check.py iterates over (even when empty)', async () => {
    const env = await seedAndExport();
    const tables = env.tables as Record<string, unknown>;
    for (const key of [
      'students',
      'sessions',
      'attempts',
      'skillMastery',
      'deviceMeta',
      'bookmarks',
      'sessionTelemetry',
      'hintEvents',
      'misconceptionFlags',
      'progressionStat',
    ]) {
      expect(tables).toHaveProperty(key);
      expect(Array.isArray(tables[key])).toBe(true);
    }
  });

  it('exposes contentVersion via deviceMeta[0] (where check.py reads it)', async () => {
    const env = await seedAndExport();
    const meta = (env.tables as Record<string, unknown[]>).deviceMeta[0] as Record<string, unknown>;
    expect(meta).toBeDefined();
    expect(typeof meta.contentVersion).toBe('string');
    expect((meta.contentVersion as string).length).toBeGreaterThan(0);
    expect(typeof meta.installId).toBe('string');
  });

  it('students carry every key validate_student() requires', async () => {
    const env = await seedAndExport();
    const students = (env.tables as Record<string, unknown[]>).students as Array<
      Record<string, unknown>
    >;
    expect(students.length).toBeGreaterThanOrEqual(1);
    const s = students[0]!;
    for (const key of ['id', 'displayName', 'gradeLevel', 'createdAt', 'lastActiveAt']) {
      expect(s).toHaveProperty(key);
    }
    expect(typeof s.id).toBe('string');
    expect((s.id as string).length).toBeGreaterThan(0);
    expect([0, 1, 2]).toContain(s.gradeLevel);
  });

  it('sessions carry every key validate_sessions() requires (with endedAt and accuracy after close)', async () => {
    const env = await seedAndExport();
    const sessions = (env.tables as Record<string, unknown[]>).sessions as Array<
      Record<string, unknown>
    >;
    expect(sessions.length).toBe(1);
    const s = sessions[0]!;
    for (const key of [
      'id',
      'studentId',
      'activityId',
      'levelNumber',
      'startedAt',
      'endedAt',
      'totalAttempts',
      'correctAttempts',
      'accuracy',
    ]) {
      expect(s).toHaveProperty(key);
    }
    expect(s.levelNumber).toBeGreaterThanOrEqual(1);
    expect(s.levelNumber).toBeLessThanOrEqual(9);
    expect(typeof s.endedAt).toBe('number');
    expect(typeof s.accuracy).toBe('number');
    expect(s.accuracy as number).toBeGreaterThanOrEqual(0);
    expect(s.accuracy as number).toBeLessThanOrEqual(1);
    expect(s.startedAt as number).toBeLessThanOrEqual(s.endedAt as number);
  });

  it('attempts carry every key validate_attempts() requires (with valid outcome enum)', async () => {
    const env = await seedAndExport();
    const attempts = (env.tables as Record<string, unknown[]>).attempts as Array<
      Record<string, unknown>
    >;
    expect(attempts.length).toBe(5);
    for (const a of attempts) {
      for (const key of [
        'sessionId',
        'studentId',
        'questionTemplateId',
        'outcome',
        'responseMs',
        'submittedAt',
      ]) {
        expect(a).toHaveProperty(key);
      }
      expect(VALID_OUTCOMES.has(a.outcome as string)).toBe(true);
      expect(a.responseMs as number).toBeGreaterThanOrEqual(0);
    }
  });

  it('session.totalAttempts agrees with attempt rows (the cross-check that catches data corruption)', async () => {
    const env = await seedAndExport();
    const tables = env.tables as Record<string, unknown[]>;
    const sessions = tables.sessions as Array<Record<string, unknown>>;
    const attempts = tables.attempts as Array<Record<string, unknown>>;
    for (const sess of sessions) {
      const own = attempts.filter((a) => a.sessionId === sess.id);
      expect(sess.totalAttempts).toBe(own.length);
      const correct = own.filter((a) => CORRECT_OUTCOMES.has(a.outcome as string)).length;
      const expectedAccuracy = own.length > 0 ? correct / own.length : 0;
      expect(Math.abs((sess.accuracy as number) - expectedAccuracy)).toBeLessThan(0.001);
    }
  });
});
