/**
 * Level01SessionLifecycle — session open, close, and level-complete checks.
 * Extracted from Level01Scene.ts for testing and reuse.
 */

import { log } from './log';
import type { StudentId, SessionId, ActivityId, ProgressionStat } from '@/types';

/**
 * Create or resume a session for a student.
 * Returns the session ID (created or resumed), or null if student not found.
 */
export async function openSessionOrResume(
  studentId: StudentId | null,
  resume: boolean = false
): Promise<SessionId | null> {
  if (!studentId) return null;

  log.sess('open_start', { studentId, resume });
  try {
    const { lastUsedStudent } = await import('../persistence/lastUsedStudent');
    lastUsedStudent.set(studentId);

    const { studentRepo } = await import('../persistence/repositories/student');
    const student = await studentRepo.get(studentId);
    if (!student) {
      log.warn('SESS', 'student_not_found', { studentId });
      return null;
    }

    if (resume) {
      const { sessionRepo } = await import('../persistence/repositories/session');
      const sessions = await sessionRepo.listForStudent(studentId);

      if (sessions.length > 0) {
        const lastSession = sessions[0]!;
        if (!lastSession.endedAt) {
          log.sess('open_resumed', {
            sessionId: lastSession.id,
            priorAttempts: 0,
          });
          return lastSession.id as SessionId;
        }
      }
    }

    const { sessionRepo } = await import('../persistence/repositories/session');
    const id = crypto.randomUUID() as SessionId;

    const session = await sessionRepo.create({
      id,
      studentId,
      activityId: 'partition_halves' as ActivityId,
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
      device: {
        type: 'unknown',
        viewport: { width: window.innerWidth, height: window.innerHeight },
      },
      syncState: 'local',
    });

    if (session) {
      log.sess('open_ok', { sessionId: session.id, activityId: 'partition_halves' });
      return session.id as SessionId;
    } else {
      log.warn('SESS', 'open_quota', { activityId: 'partition_halves' });
      return null;
    }
  } catch (err) {
    log.error('SESS', 'open_error_initial', { error: String(err) });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { sessionRepo } = await import('../persistence/repositories/session');
      const id = crypto.randomUUID() as SessionId;
      const session = await sessionRepo.create({
        id,
        studentId,
        activityId: 'partition_halves' as ActivityId,
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
        device: {
          type: 'unknown',
          viewport: { width: window.innerWidth, height: window.innerHeight },
        },
        syncState: 'local',
      });
      if (session) {
        log.sess('open_retry_ok', { sessionId: session.id });
        return session.id as SessionId;
      }
    } catch (retryErr) {
      log.error('SESS', 'open_retry_failed', { error: String(retryErr) });
    }
    return null;
  }
}

/**
 * Close a session with summary stats. Computes accuracy, avg response time, scaffold recommendation.
 */
export async function closeSessionWithSummary(
  sessionId: SessionId | null,
  studentId: StudentId | null,
  totalAttempts: number,
  correctAttempts: number,
  responseTimes: number[],
  currentMasteryEstimate: number
): Promise<void> {
  if (!sessionId) return;
  try {
    const { updateStreak } = await import('./streak');
    await updateStreak(studentId);
  } catch {
    // Non-critical
  }
  try {
    const { sessionRepo } = await import('../persistence/repositories/session');

    const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 1;
    const avgResponseMs =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

    const scaffoldRecommendation: 'advance' | 'stay' | 'regress' =
      currentMasteryEstimate >= 0.85
        ? 'advance'
        : currentMasteryEstimate > 0 &&
            responseTimes.length >= 5 &&
            correctAttempts / responseTimes.length < 0.4
          ? 'regress'
          : 'stay';

    const summary = {
      endedAt: Date.now(),
      totalAttempts,
      correctAttempts,
      accuracy,
      avgResponseMs,
      xpEarned: correctAttempts * 10,
      scaffoldRecommendation,
      endLevel: 1,
    };

    log.sess('close', { sessionId, ...summary });
    await sessionRepo.close(sessionId, summary);
  } catch (err) {
    log.warn('SESS', 'close_error', { error: String(err) });
  }
}

/**
 * Write (or update) a ProgressionStat marking Level 1 completed.
 */
export async function persistLevelCompletion(
  studentId: StudentId | null,
  correctCount: number
): Promise<void> {
  if (!studentId) return;
  try {
    const { progressionStatRepo } = await import('../persistence/repositories/progressionStat');
    const { ActivityId } = await import('../types/branded');
    const activityId = ActivityId('level_1');

    const existing = await progressionStatRepo.get(studentId, activityId);
    const now = Date.now();
    const updated: ProgressionStat = {
      studentId,
      activityId,
      currentLevel: 2,
      highestLevelReached: Math.max(2, existing?.highestLevelReached ?? 2),
      sessionsAtCurrentLevel: 0,
      totalSessions: (existing?.totalSessions ?? 0) + 1,
      totalXp: (existing?.totalXp ?? 0) + correctCount * 10,
      lastSessionAt: now,
      consecutiveRegressEvents: existing?.consecutiveRegressEvents ?? 0,
      syncState: 'local',
    };
    await progressionStatRepo.upsert(updated);
    log.scene('progression_stat_upserted', {
      level: 1,
      nextLevel: 2,
      activityId,
      totalSessions: updated.totalSessions,
    });
  } catch (err) {
    log.warn('PROG', 'progression_stat_error', { level: 1, error: String(err) });
  }
}

/**
 * Check if all 9 levels (1–9) are completed by this student.
 */
export async function checkAllLevelsComplete(studentId: StudentId | null): Promise<boolean> {
  try {
    if (!studentId) return false;
    const { levelProgressionRepo } = await import('../persistence/repositories/levelProgression');
    const { StudentId: SID } = await import('../types/branded');
    const completed = await levelProgressionRepo.getCompletedLevels(SID(studentId));
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].every((n) => completed.has(n));
  } catch {
    return false;
  }
}
