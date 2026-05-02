import { log } from './log';
import type {
  StudentId,
  SessionId,
  ActivityId,
  AttemptOutcome,
  SkillId,
  AttemptId,
  ProgressionEvent,
  ValidatorResult,
  QuestionTemplate,
} from '@/types';

export async function openSessionForLevel(
  studentId: StudentId | null,
  levelNumber: number
): Promise<SessionId | null> {
  if (!studentId) return null;
  try {
    const { lastUsedStudent } = await import('@/persistence/lastUsedStudent');
    lastUsedStudent.set(studentId);
    const { sessionRepo } = await import('@/persistence/repositories/session');
    const id = crypto.randomUUID() as SessionId;
    const session = await sessionRepo.create({
      id,
      studentId,
      activityId: `level_${levelNumber}` as ActivityId,
      levelNumber,
      scaffoldLevel: 1,
      startedAt: Date.now(),
      endedAt: null,
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: null,
      avgResponseMs: null,
      xpEarned: 0,
      scaffoldRecommendation: null,
      endLevel: levelNumber,
      device: {
        type: 'unknown',
        viewport: { width: window.innerWidth, height: window.innerHeight },
      },
      syncState: 'local',
    });
    if (session) {
      log.sess('open_ok', { sessionId: session.id, level: levelNumber });
      return session.id as SessionId;
    }
    log.warn('SESS', 'open_quota', { level: levelNumber });
    return null;
  } catch (err) {
    log.warn('SESS', 'open_error', { level: levelNumber, error: String(err) });
    return null;
  }
}

export async function recordAttemptAndMasteryForLevel(
  studentId: StudentId | null,
  sessionId: SessionId | null,
  levelNumber: number,
  currentTemplate: QuestionTemplate,
  questionIndex: number,
  wrongCount: number,
  result: ValidatorResult,
  responseMs: number,
  lastPayload: unknown,
  currentQuestionHintIds: string[],
  currentRoundEvents: ProgressionEvent[]
): Promise<number | null> {
  if (!studentId || !sessionId) return null;
  const studentIdTyped = studentId as StudentId;
  const sessionIdTyped = sessionId as SessionId;
  let masteryEstimate: number | null = null;
  try {
    const { db } = await import('@/persistence/db');
    const { attemptRepo } = await import('@/persistence/repositories/attempt');
    const { skillMasteryRepo } = await import('@/persistence/repositories/skillMastery');
    const { updateMastery, DEFAULT_PRIORS, MASTERY_THRESHOLD } = await import('@/engine/bkt');
    const outcome: AttemptOutcome =
      result.outcome === 'correct' ? 'EXACT' : result.outcome === 'partial' ? 'CLOSE' : 'WRONG';
    const isCorrect = outcome === 'EXACT';
    const skillIds = currentTemplate.skillIds ?? [];
    const skillId = (skillIds[0] ?? `skill.level_${levelNumber}`) as SkillId;
    log.atmp('record_start', {
      attemptId: crypto.randomUUID(),
      outcome,
      responseMs,
      questionId: currentTemplate.id,
      hintsUsed: currentQuestionHintIds.length,
    });
    const attemptId = crypto.randomUUID() as AttemptId;
    await db.transaction('rw', [db.attempts, db.skillMastery], async () => {
      await attemptRepo.record({
        id: attemptId,
        sessionId: sessionIdTyped,
        studentId: studentIdTyped,
        questionTemplateId: currentTemplate.id,
        archetype: currentTemplate.archetype,
        roundNumber: questionIndex + 1,
        attemptNumber: Math.min(wrongCount + 1, 4) as 1 | 2 | 3 | 4,
        startedAt: Date.now() - responseMs,
        submittedAt: Date.now(),
        responseMs,
        studentAnswerRaw: lastPayload,
        correctAnswerRaw: null,
        outcome,
        errorMagnitude: null,
        pointsEarned: result.score,
        hintsUsedIds: [...currentQuestionHintIds],
        hintsUsed: [],
        roundEvents: [...currentRoundEvents],
        flaggedMisconceptionIds: [],
        validatorPayload: result,
        syncState: 'local',
      });
      const existing = await skillMasteryRepo.get(studentIdTyped, skillId);
      const prev: import('@/types').SkillMastery = existing ?? {
        studentId: studentIdTyped,
        skillId,
        compositeKey: [studentIdTyped, skillId],
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
      const withMeta: import('@/types').SkillMastery = {
        ...updated,
        compositeKey: [studentIdTyped, skillId],
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
    try {
      const { db: db2 } = await import('@/persistence/db');
      const { attemptRepo: attemptRepo2 } = await import('@/persistence/repositories/attempt');
      const recentAttempts = await attemptRepo2.listForStudent(studentIdTyped);
      const { runAllDetectors } = await import('@/engine/misconceptionDetectors');
      const { SystemClock, CryptoUuidGenerator, ConsoleEngineLogger } =
        await import('@/lib/adapters');
      const flags = await runAllDetectors(recentAttempts.slice(-10), levelNumber, {
        clock: SystemClock,
        ids: CryptoUuidGenerator,
        logger: ConsoleEngineLogger,
      });
      if (flags.length > 0) {
        const { misconceptionFlagRepo } =
          await import('@/persistence/repositories/misconceptionFlag');
        await db2.transaction('rw', [db2.misconceptionFlags], async () => {
          for (const flag of flags) {
            await misconceptionFlagRepo.upsert(flag);
          }
        });
        log.misc('flags_detected', {
          count: flags.length,
          ids: flags.map((f: any) => f.misconceptionId),
        });
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

export async function closeSessionForLevel(
  sessionId: SessionId | null,
  levelNumber: number,
  attemptCount: number,
  correctCount: number,
  responseTimes: number[]
): Promise<void> {
  if (!sessionId) return;
  try {
    const { sessionRepo } = await import('@/persistence/repositories/session');
    const accuracy = attemptCount > 0 ? correctCount / attemptCount : 1;
    const avgResponseMs =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;
    const scaffoldRecommendation: 'advance' | 'stay' | 'regress' =
      accuracy >= 0.85 ? 'advance' : accuracy < 0.4 && levelNumber > 1 ? 'regress' : 'stay';
    const summary = {
      endedAt: Date.now(),
      totalAttempts: responseTimes.length,
      correctAttempts: correctCount,
      accuracy,
      avgResponseMs,
      xpEarned: correctCount * 10,
      scaffoldRecommendation,
      endLevel: levelNumber,
    };
    log.sess('close', { sessionId, level: levelNumber, ...summary });
    await sessionRepo.close(sessionId as SessionId, summary);
  } catch (err) {
    log.warn('SESS', 'close_error', { level: levelNumber, error: String(err) });
  }
}

export async function persistLevelCompletionForLevel(
  studentId: StudentId | null,
  levelNumber: number,
  correctCount: number
): Promise<void> {
  if (!studentId) return;
  try {
    const { progressionStatRepo } = await import('@/persistence/repositories/progressionStat');
    const { ActivityId } = await import('@/types/branded');
    const activityId = ActivityId(`level_${levelNumber}`);
    const existing = await progressionStatRepo.get(studentId, activityId);
    const nextLevel = levelNumber + 1;
    const updated: import('@/types').ProgressionStat = {
      studentId,
      activityId,
      currentLevel: nextLevel,
      highestLevelReached: Math.max(nextLevel, existing?.highestLevelReached ?? nextLevel),
      sessionsAtCurrentLevel: 0,
      totalSessions: (existing?.totalSessions ?? 0) + 1,
      totalXp: (existing?.totalXp ?? 0) + correctCount * 10,
      lastSessionAt: Date.now(),
      consecutiveRegressEvents: existing?.consecutiveRegressEvents ?? 0,
      syncState: 'local',
    };
    await progressionStatRepo.upsert(updated);
    log.scene('progression_stat_upserted', { level: levelNumber, nextLevel, activityId });
  } catch (err) {
    log.warn('PROG', 'progression_stat_error', { level: levelNumber, error: String(err) });
  }
}
