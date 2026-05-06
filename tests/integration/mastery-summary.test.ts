/**
 * Integration test: verifies selectLevelMasterySummary returns correct
 * skill states given a scripted L1 run with a planted misconception.
 *
 * Covers Phase 4 of PLANS/2026-05-04-progression-mastery-display.md.
 * Uses fake-indexeddb for a real Dexie instance in Node (no browser needed).
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '../../src/persistence/db';
import {
  skillMasteryRepo,
  selectLevelMasterySummary,
} from '../../src/persistence/repositories/skillMastery';
import {
  StudentId,
  SkillId,
  LevelId,
  AttemptId,
  SessionId,
  MisconceptionId,
  MisconceptionFlagId,
  QuestionTemplateId,
} from '../../src/types/branded';
import type { SkillMastery, MisconceptionFlag } from '../../src/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STUDENT = StudentId('summary-integration-student-001');
const LEVEL_1 = LevelId(1);
const SKILL_A = SkillId('SK-01');
const SKILL_B = SkillId('SK-02');
const SESSION_ID = SessionId('sess-summary-integration-001');

function makeAttempt(
  id: string,
  skillIds: string[],
  outcome: 'EXACT' | 'WRONG' | 'CLOSE' | 'ASSISTED',
  hintsUsed: string[] = []
) {
  return {
    id: AttemptId(id),
    sessionId: SESSION_ID,
    studentId: STUDENT,
    questionTemplateId: QuestionTemplateId('q:part:L1:0001'),
    archetype: 'partition' as const,
    roundNumber: 1,
    attemptNumber: 1 as const,
    startedAt: Date.now() - 5000,
    submittedAt: Date.now(),
    responseMs: 5000,
    studentAnswerRaw: null,
    correctAnswerRaw: null,
    outcome,
    errorMagnitude: null,
    pointsEarned: outcome === 'EXACT' || outcome === 'CLOSE' ? 10 : 0,
    hintsUsedIds: [],
    hintsUsed: hintsUsed as import('../../src/types/hint').HintTier[],
    flaggedMisconceptionIds: [],
    validatorPayload: null,
    syncState: 'local' as const,
    skillIds,
  };
}

function makeMasteryRow(
  skillId: SkillId,
  state: SkillMastery['state'],
  estimate: number
): SkillMastery {
  return {
    studentId: STUDENT,
    skillId,
    compositeKey: [STUDENT, skillId],
    masteryEstimate: estimate,
    state,
    consecutiveCorrectUnassisted: state === 'MASTERED' ? 3 : 1,
    totalAttempts: 3,
    correctAttempts: state === 'MASTERED' ? 3 : 1,
    lastAttemptAt: Date.now(),
    masteredAt: state === 'MASTERED' ? Date.now() : null,
    decayedAt: null,
    syncState: 'local',
  };
}

function makeMisconceptionFlag(
  id: string,
  evidenceAttemptIds: string[],
  resolvedAt: number | null
): MisconceptionFlag {
  return {
    id: MisconceptionFlagId(id),
    studentId: STUDENT,
    misconceptionId: MisconceptionId('MC-WHB-01'),
    firstObservedAt: Date.now() - 10000,
    lastObservedAt: Date.now(),
    observationCount: 1,
    resolvedAt,
    evidenceAttemptIds: evidenceAttemptIds.map(AttemptId),
    syncState: 'local',
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

// ── Integration tests ─────────────────────────────────────────────────────────

describe('selectLevelMasterySummary — integration', () => {
  it('returns empty summary when no attempts exist for the level', async () => {
    const summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    expect(summary.questionsAnswered).toBe(0);
    expect(summary.questionsCorrect).toBe(0);
    expect(summary.skills).toHaveLength(0);
  });

  it('full L1 run: two skills, both MASTERED, counts match', async () => {
    // Seed five attempts split across two skills
    const attempts = [
      makeAttempt('a-001', [SKILL_A as unknown as string], 'EXACT'),
      makeAttempt('a-002', [SKILL_A as unknown as string], 'EXACT'),
      makeAttempt('a-003', [SKILL_B as unknown as string], 'EXACT'),
      makeAttempt('a-004', [SKILL_B as unknown as string], 'WRONG'),
      makeAttempt('a-005', [SKILL_B as unknown as string], 'EXACT'),
    ];
    await db.attempts.bulkAdd(attempts);
    await db.skillMastery.bulkPut([
      makeMasteryRow(SKILL_A, 'MASTERED', 0.92),
      makeMasteryRow(SKILL_B, 'MASTERED', 0.85),
    ]);

    const summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    expect(summary.questionsAnswered).toBe(5);
    expect(summary.questionsCorrect).toBe(4); // 4 EXACT
    expect(summary.skills).toHaveLength(2);
    expect(summary.skills.every((s) => s.state === 'MASTERED')).toBe(true);
  });

  it('partial mastery: one skill LEARNING, one UNSEEN (no mastery row)', async () => {
    await db.attempts.bulkAdd([
      makeAttempt('b-001', [SKILL_A as unknown as string], 'EXACT'),
      makeAttempt('b-002', [SKILL_B as unknown as string], 'WRONG'),
    ]);
    await db.skillMastery.put(makeMasteryRow(SKILL_A, 'LEARNING', 0.5));
    // SKILL_B: no mastery row → should be UNSEEN

    const summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    const skillA = summary.skills.find((s) => (s.skillId as unknown as string) === SKILL_A);
    const skillB = summary.skills.find((s) => (s.skillId as unknown as string) === SKILL_B);

    expect(skillA?.state).toBe('LEARNING');
    expect(skillB?.state).toBe('UNSEEN');
  });

  it('planted misconception MC-WHB-01: corrected flag appears in summary', async () => {
    // First attempt: WRONG, misconception triggered
    const firstId = 'mc-attempt-wrong-001';
    await db.attempts.add(makeAttempt(firstId, [SKILL_A as unknown as string], 'WRONG'));

    // Plant the misconception flag (corrected)
    await db.misconceptionFlags.add(makeMisconceptionFlag('mc-flag-001', [firstId], Date.now()));

    // Follow-up EXACT attempt — student corrected the misconception
    await db.attempts.add(
      makeAttempt('mc-attempt-correct-001', [SKILL_A as unknown as string], 'EXACT')
    );
    await db.skillMastery.put(makeMasteryRow(SKILL_A, 'LEARNING', 0.55));

    const summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    const skill = summary.skills[0];
    expect(skill).toBeDefined();
    expect(skill!.misconceptions).toHaveLength(1);
    expect(skill!.misconceptions[0]!.code).toBe('MC-WHB-01');
    expect(skill!.misconceptions[0]!.corrected).toBe(true);
  });

  it('uncorrected misconception MC-WHB-01: corrected=false in summary', async () => {
    const attemptId = 'mc-uncorrected-001';
    await db.attempts.add(makeAttempt(attemptId, [SKILL_A as unknown as string], 'WRONG'));
    await db.misconceptionFlags.add(
      makeMisconceptionFlag('mc-flag-uncorrected-001', [attemptId], null)
    );
    await db.skillMastery.put(makeMasteryRow(SKILL_A, 'LEARNING', 0.35));

    const summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    expect(summary.skills[0]!.misconceptions[0]!.corrected).toBe(false);
  });

  it('assistedCount reflects hintsUsed on attempts for a skill', async () => {
    await db.attempts.bulkAdd([
      makeAttempt('hint-001', [SKILL_A as unknown as string], 'EXACT', ['verbal']),
      makeAttempt('hint-002', [SKILL_A as unknown as string], 'EXACT', ['visual_overlay']),
      makeAttempt('hint-003', [SKILL_A as unknown as string], 'EXACT', []),
    ]);
    await db.skillMastery.put(makeMasteryRow(SKILL_A, 'APPROACHING', 0.72));

    const summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    expect(summary.skills[0]!.assistedCount).toBe(2);
  });

  it('skillMastery repo round-trip: upsert then verify selectLevelMasterySummary reflects it', async () => {
    await db.attempts.add(makeAttempt('rt-001', [SKILL_A as unknown as string], 'EXACT'));

    // Start as LEARNING
    const learning = makeMasteryRow(SKILL_A, 'LEARNING', 0.55);
    await skillMasteryRepo.upsert(learning);

    let summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    expect(summary.skills[0]!.state).toBe('LEARNING');

    // Promote to MASTERED
    const mastered = makeMasteryRow(SKILL_A, 'MASTERED', 0.91);
    await skillMasteryRepo.upsert(mastered);

    summary = await selectLevelMasterySummary(STUDENT, LEVEL_1);
    expect(summary.skills[0]!.state).toBe('MASTERED');
  });
});
