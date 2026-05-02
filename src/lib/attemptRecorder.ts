/**
 * attemptRecorder — record attempt with BKT mastery update and misconception detection.
 * Extracted from Level01Scene.ts for testability and reuse.
 */

import { log } from './log';
import type {
  StudentId,
  SessionId,
  AttemptOutcome,
  SkillId,
  AttemptId,
  ArchetypeId,
  QuestionTemplateId,
  SkillMastery,
} from '@/types';
import type { PartitionInput } from '@/validators/partition';
import type { ValidatorResult } from '@/types';

/**
 * Record an attempt with BKT mastery update in a single transaction.
 * Returns the updated mastery estimate, or null if transaction failed.
 */
export async function recordAttemptAndMastery(
  studentId: StudentId | null,
  sessionId: SessionId | null,
  questionId: string,
  questionIndex: number,
  wrongCount: number,
  result: ValidatorResult,
  responseMs: number,
  input: PartitionInput,
  hintIds: string[],
  shapeType: string,
  snapMode: string,
  areaTolerance: number
): Promise<number | null> {
  if (!studentId || !sessionId) return null;

  let masteryEstimate: number | null = null;

  try {
    const { db } = await import('../persistence/db');
    const { attemptRepo } = await import('../persistence/repositories/attempt');
    const { hintEventRepo } = await import('../persistence/repositories/hintEvent');
    const { skillMasteryRepo } = await import('../persistence/repositories/skillMastery');
    const { updateMastery, DEFAULT_PRIORS, MASTERY_THRESHOLD } = await import('../engine/bkt');

    const outcome: AttemptOutcome =
      result.outcome === 'correct' ? 'EXACT' : result.outcome === 'partial' ? 'CLOSE' : 'WRONG';
    const attemptId = crypto.randomUUID() as AttemptId;
    const isCorrect = outcome === 'EXACT';
    const skillId = 'skill.partition_halves' as SkillId;

    log.atmp('record_start', {
      attemptId,
      outcome,
      responseMs,
      questionId,
      hintsUsed: hintIds.length,
    });

    await db.transaction('rw', [db.attempts, db.hintEvents, db.skillMastery], async () => {
      await attemptRepo.record({
        id: attemptId,
        sessionId,
        studentId,
        questionTemplateId: questionId as QuestionTemplateId,
        archetype: 'partition' as ArchetypeId,
        roundNumber: questionIndex + 1,
        attemptNumber: Math.min(wrongCount + 1, 4) as 1 | 2 | 3 | 4,
        startedAt: Date.now() - responseMs,
        submittedAt: Date.now(),
        responseMs,
        studentAnswerRaw: input,
        correctAnswerRaw: null,
        outcome,
        errorMagnitude: null,
        pointsEarned: result.score,
        hintsUsedIds: [...hintIds],
        hintsUsed: [],
        flaggedMisconceptionIds: [],
        validatorPayload: result,
        payload: {
          shapeType,
          targetPartitions: 2,
          snapMode,
          areaTolerance,
        },
        syncState: 'local',
      });

      if (hintIds.length > 0) {
        await hintEventRepo.linkToAttempt(hintIds, attemptId);
      }

      const existing = await skillMasteryRepo.get(studentId, skillId);
      const prev: SkillMastery = existing ?? {
        studentId,
        skillId,
        compositeKey: [studentId, skillId],
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

      const updated = updateMastery(prev, isCorrect);
      const withMeta: SkillMastery = {
        ...updated,
        compositeKey: [studentId, skillId],
        lastAttemptAt: Date.now(),
        masteredAt:
          updated.masteryEstimate >= MASTERY_THRESHOLD && !prev.masteredAt
            ? Date.now()
            : (prev.masteredAt ?? null),
        decayedAt: prev.decayedAt ?? null,
        syncState: 'local',
      };

      log.bkt('mastery_update', {
        skill: skillId,
        isCorrect,
        prevEstimate: +prev.masteryEstimate.toFixed(4),
        nextEstimate: +withMeta.masteryEstimate.toFixed(4),
        state: withMeta.state,
        totalAttempts: withMeta.totalAttempts,
        correctAttempts: withMeta.correctAttempts,
        justMastered: !!withMeta.masteredAt && !prev.masteredAt,
      });

      await skillMasteryRepo.upsert(withMeta);
      masteryEstimate = withMeta.masteryEstimate;
    });

    log.atmp('record_ok', { attemptId, outcome, points: result.score });

    // Misconception detection (best-effort, outside transaction)
    try {
      const { db } = await import('../persistence/db');
      const { attemptRepo } = await import('../persistence/repositories/attempt');
      const recentAttempts = await attemptRepo.listForStudent(studentId);
      const limitedAttempts = recentAttempts.slice(-10);
      const { runAllDetectors } = await import('../engine/misconceptionDetectors');
      const { SystemClock, CryptoUuidGenerator, ConsoleEngineLogger } =
        await import('../lib/adapters');

      const flags = await runAllDetectors(limitedAttempts, 1, {
        clock: SystemClock,
        ids: CryptoUuidGenerator,
        logger: ConsoleEngineLogger,
      });

      if (flags.length > 0) {
        const { misconceptionFlagRepo } =
          await import('../persistence/repositories/misconceptionFlag');
        await db.transaction('rw', [db.misconceptionFlags], async () => {
          for (const flag of flags) {
            await misconceptionFlagRepo.upsert(flag);
          }
        });
        log.misc('flags_detected', {
          count: flags.length,
          ids: flags.map((f) => f.misconceptionId),
        });
      } else {
        log.misc('no_flags', { checkedAttempts: 'last10' });
      }
    } catch (err) {
      log.warn('MISC', 'detection_error', { error: String(err) });
    }

    return masteryEstimate;
  } catch (err) {
    log.error('ATMP', 'record_failed', { error: String(err) });
    return null;
  }
}
