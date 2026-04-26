/**
 * Calibration round — Q19 fix.
 *
 * Implements the retention-calibration mode required by learning-hypotheses.md H-04:
 * "the engine must serve a calibration round of 5 items targeting the specific
 * prior-session skill before adaptive routing resumes."
 *
 * Calibration freezes adaptive routing for the first 5 attempts of a session
 * so that H-04 retention measurements are always on the same skill the prior
 * session targeted — preventing data pollution from opportunistic re-routing.
 *
 * // Q19 fix — per learning-hypotheses.md H-04 retention measurement calibration
 */

import type { SessionId, SkillId, StudentId } from '@/types';
import type { Session } from '@/types';

// Simple logger to avoid dependency bloat
const logger = {
  warn: (msg: string) => console.warn(`[calibration] ${msg}`),
};

// ── Constants ─────────────────────────────────────────────────────────────

/** Number of calibration attempts before adaptive routing resumes. */
export const CALIBRATION_ITEMS = 5;

// ── Types ─────────────────────────────────────────────────────────────────

export interface CalibrationState {
  studentId: StudentId;
  sessionId: SessionId;
  /** Skills targeted by this calibration round (from prior session). */
  targetSkillIds: SkillId[];
  /** Number of calibration attempts still to serve. Counts down to 0. */
  remaining: number;
}

// ── Exports ───────────────────────────────────────────────────────────────

/**
 * Create a calibration state for the new session, or return null on first session.
 *
 * Returns null if prevSession is null (first session ever — nothing to calibrate).
 * Otherwise initialises remaining=5 targeting the skills from the previous session.
 *
 * The caller must supply the skillIds that were active in prevSession — these
 * come from the QuestionTemplates served in that session, not from the session
 * row itself (which only stores activityId/levelNumber).
 *
 * // Q19 fix
 */
export function startCalibration(
  prevSession: Session | null,
  prevSessionSkillIds: SkillId[],
  currentSessionId: SessionId,
): CalibrationState | null {
  // First session ever — nothing to calibrate, per H-04 spec
  if (prevSession === null) return null;

  // If prior session had no resolvable skills (edge case), skip calibration
  if (prevSessionSkillIds.length === 0) {
    logger.warn(`Calibration skipped: no skills found in prior session ${prevSession.id}`);
    return null;
  }

  return {
    studentId: prevSession.studentId,
    sessionId: currentSessionId,
    targetSkillIds: prevSessionSkillIds,
    remaining: CALIBRATION_ITEMS,
  };
}

/**
 * Decrement remaining by 1 after each calibration attempt.
 * Returns a new immutable CalibrationState.
 */
export function recordCalibrationAttempt(state: CalibrationState): CalibrationState {
  return {
    ...state,
    remaining: Math.max(0, state.remaining - 1),
  };
}

/**
 * True when remaining hits 0 — calibration round is done.
 * After this, adaptive routing may resume.
 *
 * // Q19 fix
 */
export function isCalibrationComplete(state: CalibrationState): boolean {
  return state.remaining <= 0;
}

/**
 * True when the engine should use calibration mode for this attempt.
 * Returns false when state is null (first session or calibration not required).
 *
 * // Q19 fix — per learning-hypotheses.md H-04
 */
export function shouldUseCalibration(state: CalibrationState | null): boolean {
  if (state === null) return false;
  return !isCalibrationComplete(state);
}
