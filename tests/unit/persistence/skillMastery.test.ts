/**
 * Unit tests for skillMasteryRepo and selectLevelMasterySummary.
 * Uses fake-indexeddb (imported in tests/setup.ts) for a real Dexie instance in Node.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/persistence/db';
import {
  skillMasteryRepo,
  selectLevelMasterySummary,
  toChipState,
} from '../../../src/persistence/repositories/skillMastery';
import {
  StudentId,
  SkillId,
  LevelId,
  AttemptId,
  SessionId,
  MisconceptionFlagId,
  MisconceptionId,
} from '../../../src/types/branded';
import type { SkillMastery, Attempt, MisconceptionFlag } from '../../../src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────

const studentId = StudentId('student-uuid-001');
const skillId = SkillId('SK-01');
const otherSkillId = SkillId('SK-02');

function makeSkillMastery(overrides: Partial<SkillMastery> = {}): SkillMastery {
  return {
    studentId,
    skillId,
    compositeKey: [studentId, skillId],
    masteryEstimate: 0.5,
    state: 'LEARNING',
    consecutiveCorrectUnassisted: 0,
    totalAttempts: 1,
    correctAttempts: 1,
    lastAttemptAt: Date.now(),
    masteredAt: null,
    decayedAt: null,
    syncState: 'local',
    ...overrides,
    // Ensure compositeKey is consistent with studentId/skillId if overriding either
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('skillMasteryRepo', () => {
  beforeEach(async () => {
    await db.skillMastery.clear();
  });

  describe('get()', () => {
    it('returns undefined for an unknown (studentId, skillId) pair', async () => {
      const result = await skillMasteryRepo.get(StudentId('nobody'), SkillId('SK-99'));
      expect(result).toBeUndefined();
    });

    it('returns undefined when the student exists but skill does not', async () => {
      await skillMasteryRepo.upsert(
        makeSkillMastery({ skillId, compositeKey: [studentId, skillId] })
      );

      const result = await skillMasteryRepo.get(studentId, SkillId('SK-99'));
      expect(result).toBeUndefined();
    });

    it('returns the mastery row after it has been upserted', async () => {
      const mastery = makeSkillMastery();
      await skillMasteryRepo.upsert(mastery);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result).toBeDefined();
      expect(result?.masteryEstimate).toBe(0.5);
      expect(result?.state).toBe('LEARNING');
    });
  });

  describe('upsert()', () => {
    it('creates a new row if one does not exist', async () => {
      const mastery = makeSkillMastery({ masteryEstimate: 0.3 });
      await skillMasteryRepo.upsert(mastery);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result).toBeDefined();
      expect(result?.masteryEstimate).toBe(0.3);
    });

    it('updates the existing row on a second call (put semantics)', async () => {
      const initial = makeSkillMastery({ masteryEstimate: 0.3, state: 'LEARNING' });
      await skillMasteryRepo.upsert(initial);

      const updated = makeSkillMastery({
        masteryEstimate: 0.85,
        state: 'MASTERED',
        consecutiveCorrectUnassisted: 3,
        totalAttempts: 4,
        correctAttempts: 4,
      });
      await skillMasteryRepo.upsert(updated);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result?.masteryEstimate).toBe(0.85);
      expect(result?.state).toBe('MASTERED');
      expect(result?.consecutiveCorrectUnassisted).toBe(3);
    });

    it('does not create duplicate rows — table size stays at 1 after two upserts for same key', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery({ masteryEstimate: 0.3 }));
      await skillMasteryRepo.upsert(makeSkillMastery({ masteryEstimate: 0.6 }));

      const allRows = await db.skillMastery.toArray();
      expect(allRows).toHaveLength(1);
      expect(allRows[0]!.masteryEstimate).toBe(0.6);
    });

    it('stores separate rows for different skills of the same student', async () => {
      await skillMasteryRepo.upsert(
        makeSkillMastery({
          skillId,
          compositeKey: [studentId, skillId],
          masteryEstimate: 0.4,
        })
      );
      await skillMasteryRepo.upsert(
        makeSkillMastery({
          skillId: otherSkillId,
          compositeKey: [studentId, otherSkillId],
          masteryEstimate: 0.7,
        })
      );

      const r1 = await skillMasteryRepo.get(studentId, skillId);
      const r2 = await skillMasteryRepo.get(studentId, otherSkillId);

      expect(r1?.masteryEstimate).toBe(0.4);
      expect(r2?.masteryEstimate).toBe(0.7);
    });
  });

  describe('getAllForStudent()', () => {
    it('returns all mastery rows for the given student', async () => {
      await skillMasteryRepo.upsert(
        makeSkillMastery({
          skillId,
          compositeKey: [studentId, skillId],
        })
      );
      await skillMasteryRepo.upsert(
        makeSkillMastery({
          skillId: otherSkillId,
          compositeKey: [studentId, otherSkillId],
        })
      );

      const results = await skillMasteryRepo.getAllForStudent(studentId);
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r.studentId).toBe(studentId));
    });

    it('returns an empty array when no mastery rows exist for the student', async () => {
      const results = await skillMasteryRepo.getAllForStudent(StudentId('nobody'));
      expect(results).toEqual([]);
    });
  });

  describe('delete()', () => {
    it('removes the row so get() returns undefined afterwards', async () => {
      await skillMasteryRepo.upsert(makeSkillMastery());
      await skillMasteryRepo.delete(studentId, skillId);

      const result = await skillMasteryRepo.get(studentId, skillId);
      expect(result).toBeUndefined();
    });

    it('is idempotent — deleting a non-existent row does not throw', async () => {
      await expect(
        skillMasteryRepo.delete(StudentId('nobody'), SkillId('SK-99'))
      ).resolves.toBeUndefined();
    });
  });
});

// ── toChipState ───────────────────────────────────────────────────────────────

describe('toChipState', () => {
  it('maps NOT_STARTED to UNSEEN', () => {
    expect(toChipState('NOT_STARTED')).toBe('UNSEEN');
  });
  it('maps DECAYED to UNSEEN', () => {
    expect(toChipState('DECAYED')).toBe('UNSEEN');
  });
  it('maps LEARNING to LEARNING', () => {
    expect(toChipState('LEARNING')).toBe('LEARNING');
  });
  it('maps APPROACHING to LEARNING', () => {
    expect(toChipState('APPROACHING')).toBe('LEARNING');
  });
  it('maps MASTERED to MASTERED', () => {
    expect(toChipState('MASTERED')).toBe('MASTERED');
  });
});

// ── selectLevelMasterySummary ─────────────────────────────────────────────────

const LEVEL_STUDENT = StudentId('summary-student-001');
const LEVEL_1 = 1 as unknown as LevelId;
const SKILL_A = SkillId('SK-01');
const SKILL_B = SkillId('SK-02');

function makeLevelAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: AttemptId(crypto.randomUUID()),
    sessionId: SessionId('sess-summary-001'),
    studentId: LEVEL_STUDENT,
    questionTemplateId: 'q:part:L1:0001' as import('../../../src/types').QuestionTemplateId,
    archetype: 'partition' as import('../../../src/types').ArchetypeId,
    roundNumber: 1,
    attemptNumber: 1,
    startedAt: Date.now() - 5000,
    submittedAt: Date.now(),
    responseMs: 5000,
    studentAnswerRaw: null,
    correctAnswerRaw: null,
    outcome: 'EXACT',
    errorMagnitude: null,
    pointsEarned: 10,
    hintsUsedIds: [],
    hintsUsed: [],
    flaggedMisconceptionIds: [],
    validatorPayload: null,
    syncState: 'local',
    skillIds: [SKILL_A as unknown as string],
    ...overrides,
  };
}

function makeLevelMastery(
  skillId: SkillId,
  state: SkillMastery['state'],
  estimate: number
): SkillMastery {
  return {
    studentId: LEVEL_STUDENT,
    skillId,
    compositeKey: [LEVEL_STUDENT, skillId],
    masteryEstimate: estimate,
    state,
    consecutiveCorrectUnassisted: state === 'MASTERED' ? 3 : 0,
    totalAttempts: 3,
    correctAttempts: state === 'MASTERED' ? 3 : 1,
    lastAttemptAt: Date.now(),
    masteredAt: state === 'MASTERED' ? Date.now() : null,
    decayedAt: null,
    syncState: 'local',
  };
}

describe('selectLevelMasterySummary', () => {
  beforeEach(async () => {
    await db.attempts.where('studentId').equals(LEVEL_STUDENT).delete();
    await db.skillMastery.where('studentId').equals(LEVEL_STUDENT).delete();
    await db.misconceptionFlags
      .where('[studentId+misconceptionId]')
      .between([LEVEL_STUDENT, '\x00'], [LEVEL_STUDENT, '\xFF'])
      .delete();
  });

  it('returns empty summary when no attempts exist', async () => {
    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.questionsAnswered).toBe(0);
    expect(summary.questionsCorrect).toBe(0);
    expect(summary.skills).toHaveLength(0);
  });

  it('counts answered and correct questions from level attempts', async () => {
    await db.attempts.bulkAdd([
      makeLevelAttempt({ outcome: 'EXACT' }),
      makeLevelAttempt({ outcome: 'EXACT' }),
      makeLevelAttempt({ outcome: 'WRONG' }),
    ]);
    await db.skillMastery.put(makeLevelMastery(SKILL_A, 'LEARNING', 0.5));

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.questionsAnswered).toBe(3);
    expect(summary.questionsCorrect).toBe(2);
  });

  it('shows LEARNING chip for partial mastery', async () => {
    await db.attempts.add(makeLevelAttempt({ outcome: 'EXACT' }));
    await db.skillMastery.put(makeLevelMastery(SKILL_A, 'LEARNING', 0.5));

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills[0]!.state).toBe('LEARNING');
  });

  it('shows MASTERED chip when mastery row has MASTERED state', async () => {
    await db.attempts.add(makeLevelAttempt({ outcome: 'EXACT' }));
    await db.skillMastery.put(makeLevelMastery(SKILL_A, 'MASTERED', 0.92));

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills[0]!.state).toBe('MASTERED');
  });

  it('shows UNSEEN when no mastery row exists for a skill', async () => {
    await db.attempts.add(makeLevelAttempt({ outcome: 'EXACT' }));
    // No mastery row inserted

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills[0]!.state).toBe('UNSEEN');
  });

  it('includes corrected misconception in the skill entry', async () => {
    const attemptId = AttemptId(crypto.randomUUID());
    await db.attempts.add(makeLevelAttempt({ id: attemptId, outcome: 'WRONG' }));

    const flag: MisconceptionFlag = {
      id: MisconceptionFlagId(crypto.randomUUID()),
      studentId: LEVEL_STUDENT,
      misconceptionId: MisconceptionId('MC-WHB-01'),
      firstObservedAt: Date.now() - 10000,
      lastObservedAt: Date.now(),
      observationCount: 1,
      resolvedAt: Date.now(), // corrected
      evidenceAttemptIds: [attemptId],
      syncState: 'local',
    };
    await db.misconceptionFlags.add(flag);
    await db.skillMastery.put(makeLevelMastery(SKILL_A, 'LEARNING', 0.4));

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills[0]!.misconceptions).toHaveLength(1);
    expect(summary.skills[0]!.misconceptions[0]!.corrected).toBe(true);
    expect(summary.skills[0]!.misconceptions[0]!.code).toBe('MC-WHB-01');
  });

  it('marks uncorrected misconception as corrected=false', async () => {
    const attemptId = AttemptId(crypto.randomUUID());
    await db.attempts.add(makeLevelAttempt({ id: attemptId, outcome: 'WRONG' }));

    const flag: MisconceptionFlag = {
      id: MisconceptionFlagId(crypto.randomUUID()),
      studentId: LEVEL_STUDENT,
      misconceptionId: MisconceptionId('MC-WHB-01'),
      firstObservedAt: Date.now() - 10000,
      lastObservedAt: Date.now(),
      observationCount: 1,
      resolvedAt: null,
      evidenceAttemptIds: [attemptId],
      syncState: 'local',
    };
    await db.misconceptionFlags.add(flag);

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills[0]!.misconceptions[0]!.corrected).toBe(false);
  });

  it('handles full mastery: two skills both MASTERED', async () => {
    await db.attempts.bulkAdd([
      makeLevelAttempt({ outcome: 'EXACT', skillIds: [SKILL_A as unknown as string] }),
      makeLevelAttempt({
        questionTemplateId: 'q:part:L1:0002' as import('../../../src/types').QuestionTemplateId,
        outcome: 'EXACT',
        skillIds: [SKILL_B as unknown as string],
      }),
    ]);
    await db.skillMastery.bulkPut([
      makeLevelMastery(SKILL_A, 'MASTERED', 0.92),
      makeLevelMastery(SKILL_B, 'MASTERED', 0.88),
    ]);

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills).toHaveLength(2);
    expect(summary.skills.every((s) => s.state === 'MASTERED')).toBe(true);
    expect(summary.questionsCorrect).toBe(2);
  });

  it('computes assistedCount from attempts with hintsUsed', async () => {
    await db.attempts.bulkAdd([
      makeLevelAttempt({ outcome: 'EXACT', hintsUsed: ['verbal'] }),
      makeLevelAttempt({ outcome: 'EXACT', hintsUsed: [] }),
    ]);
    await db.skillMastery.put(makeLevelMastery(SKILL_A, 'LEARNING', 0.6));

    const summary = await selectLevelMasterySummary(LEVEL_STUDENT, LEVEL_1);
    expect(summary.skills[0]!.assistedCount).toBe(1);
  });
});
