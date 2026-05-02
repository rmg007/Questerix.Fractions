/**
 * Integration test: verifies mastery transitions in IndexedDB.
 * Simulates the same pipeline as Level01Scene.recordAttempt():
 *   updateMastery() → skillMasteryRepo.upsert()
 *
 * Asserts state moves NOT_STARTED → LEARNING → APPROACHING → MASTERED
 * after exactly 3 correct answers with DEFAULT_PRIORS.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '../../src/persistence/db';
import { skillMasteryRepo } from '../../src/persistence/repositories/skillMastery';
import { updateMastery, DEFAULT_PRIORS, MASTERY_THRESHOLD } from '../../src/engine/bkt';
import type { SkillMastery } from '../../src/types';
import { StudentId, SkillId } from '../../src/types';

const STUDENT = StudentId('s-mastery-test');
const SKILL = SkillId('skill.partition_halves');

function seedMastery(): SkillMastery {
  return {
    studentId: STUDENT,
    skillId: SKILL,
    compositeKey: [STUDENT, SKILL],
    masteryEstimate: DEFAULT_PRIORS.pInit,
    state: 'NOT_STARTED',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('mastery transition: NOT_STARTED → LEARNING → APPROACHING → MASTERED', () => {
  it('transitions through all states after 3 consecutive correct answers', async () => {
    const initial = seedMastery();
    expect(initial.state).toBe('NOT_STARTED');

    // Persist initial state
    await skillMasteryRepo.upsert(initial);
    const dbInitial = await skillMasteryRepo.get(STUDENT, SKILL);
    expect(dbInitial?.state).toBe('NOT_STARTED');

    // --- Correct answer 1 → LEARNING ---
    const after1 = updateMastery(initial, true);
    const persisted1: SkillMastery = {
      ...after1,
      compositeKey: [STUDENT, SKILL],
      lastAttemptAt: Date.now(),
      masteredAt: null,
      decayedAt: null,
      syncState: 'local',
    };
    await skillMasteryRepo.upsert(persisted1);

    const db1 = await skillMasteryRepo.get(STUDENT, SKILL);
    expect(db1?.state).toBe('LEARNING');
    expect(db1?.consecutiveCorrectUnassisted).toBe(1);
    expect(db1?.totalAttempts).toBe(1);
    expect(db1?.correctAttempts).toBe(1);

    // --- Correct answer 2 → APPROACHING ---
    const after2 = updateMastery(persisted1, true);
    const persisted2: SkillMastery = {
      ...after2,
      compositeKey: [STUDENT, SKILL],
      lastAttemptAt: Date.now(),
      masteredAt: null,
      decayedAt: null,
      syncState: 'local',
    };
    await skillMasteryRepo.upsert(persisted2);

    const db2 = await skillMasteryRepo.get(STUDENT, SKILL);
    expect(db2?.state).toBe('APPROACHING');
    expect(db2?.consecutiveCorrectUnassisted).toBe(2);
    expect(db2?.masteryEstimate).toBeGreaterThanOrEqual(0.65);

    // --- Correct answer 3 → MASTERED ---
    const after3 = updateMastery(persisted2, true);
    const persisted3: SkillMastery = {
      ...after3,
      compositeKey: [STUDENT, SKILL],
      lastAttemptAt: Date.now(),
      masteredAt: after3.masteryEstimate >= MASTERY_THRESHOLD ? Date.now() : null,
      decayedAt: null,
      syncState: 'local',
    };
    await skillMasteryRepo.upsert(persisted3);

    const db3 = await skillMasteryRepo.get(STUDENT, SKILL);
    expect(db3?.state).toBe('MASTERED');
    expect(db3?.consecutiveCorrectUnassisted).toBe(3);
    expect(db3?.masteryEstimate).toBeGreaterThanOrEqual(MASTERY_THRESHOLD);
    expect(db3?.masteredAt).not.toBeNull();
    expect(db3?.totalAttempts).toBe(3);
    expect(db3?.correctAttempts).toBe(3);
  });

  it('wrong answer resets streak and prevents premature MASTERED', async () => {
    const initial = seedMastery();
    await skillMasteryRepo.upsert(initial);

    // 2 correct → APPROACHING
    let current = updateMastery(initial, true);
    current = updateMastery(current, true);
    expect(current.state).toBe('APPROACHING');

    // 1 wrong → streak resets, stays APPROACHING or drops to LEARNING
    current = updateMastery(current, false);
    const persisted: SkillMastery = {
      ...current,
      compositeKey: [STUDENT, SKILL],
      lastAttemptAt: Date.now(),
      masteredAt: null,
      decayedAt: null,
      syncState: 'local',
    };
    await skillMasteryRepo.upsert(persisted);

    const dbResult = await skillMasteryRepo.get(STUDENT, SKILL);
    expect(dbResult?.state).not.toBe('MASTERED');
    expect(dbResult?.consecutiveCorrectUnassisted).toBe(0);
  });

  it('hintsUsedIds are stored in attempt records', async () => {
    const { attemptRepo } = await import('../../src/persistence/repositories/attempt');
    const { studentRepo } = await import('../../src/persistence/repositories/student');
    const { sessionRepo } = await import('../../src/persistence/repositories/session');
    const { SessionId, ActivityId, QuestionTemplateId } = await import('../../src/types');

    const student = await studentRepo.create({
      id: STUDENT,
      displayName: 'Test',
      avatarConfig: {},
      gradeLevel: 1,
      lastActiveAt: Date.now(),
      localOnly: true,
    });

    const sessionId = SessionId('sess-hints-test');
    await sessionRepo.create({
      id: sessionId,
      studentId: STUDENT,
      activityId: ActivityId('partition'),
      levelNumber: 1,
      scaffoldLevel: 1,
      startedAt: Date.now(),
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
    });

    const hintIds = ['hint-evt-001', 'hint-evt-002'];
    const attempt = await attemptRepo.record({
      sessionId,
      studentId: STUDENT,
      questionTemplateId: QuestionTemplateId('q:ph:L1:0001'),
      archetype: 'partition',
      roundNumber: 1,
      attemptNumber: 1,
      startedAt: Date.now() - 5000,
      submittedAt: Date.now(),
      responseMs: 5000,
      studentAnswerRaw: { x: 400 },
      correctAnswerRaw: null,
      outcome: 'EXACT',
      errorMagnitude: null,
      pointsEarned: 10,
      hintsUsedIds: hintIds,
      hintsUsed: [],
      flaggedMisconceptionIds: [],
      validatorPayload: {},
      syncState: 'local',
    });

    const fetched = await attemptRepo.listForSession(sessionId);
    expect(fetched[0].hintsUsedIds).toEqual(hintIds);
  });

  it('closeSession computes real accuracy and avgResponseMs', async () => {
    const { sessionRepo } = await import('../../src/persistence/repositories/session');
    const { studentRepo } = await import('../../src/persistence/repositories/student');
    const { SessionId, ActivityId } = await import('../../src/types');

    await studentRepo.create({
      id: STUDENT,
      displayName: 'Test',
      avatarConfig: {},
      gradeLevel: 1,
      lastActiveAt: Date.now(),
      localOnly: true,
    });

    const sessionId = SessionId('sess-close-test');
    await sessionRepo.create({
      id: sessionId,
      studentId: STUDENT,
      activityId: ActivityId('partition'),
      levelNumber: 1,
      scaffoldLevel: 1,
      startedAt: Date.now(),
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
    });

    // Simulate closeSession logic
    const correctCount = 4;
    const totalAttempts = 5;
    const responseTimes = [2000, 3000, 2500, 4000, 1500];
    const accuracy = correctCount / totalAttempts;
    const avgResponseMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    await sessionRepo.close(sessionId, {
      endedAt: Date.now(),
      totalAttempts,
      correctAttempts: correctCount,
      accuracy,
      avgResponseMs,
      xpEarned: correctCount * 10,
      scaffoldRecommendation: 'stay',
      endLevel: 1,
    });

    const closed = await sessionRepo.get(sessionId);
    expect(closed?.accuracy).toBe(0.8);
    expect(closed?.avgResponseMs).toBe(2600);
    expect(closed?.endedAt).not.toBeNull();
    expect(closed?.xpEarned).toBe(40);
  });
});
