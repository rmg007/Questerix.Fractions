/**
 * Unlock-gate helpers — Phase 2a (D-1).
 *
 * The gate decides whether finishing a session should unlock the next level.
 * Three independent paths can open it:
 *
 *   1. The student answered ≥ 3 of 5 questions correctly (60% raw score).
 *   2. The student has just failed 3 sessions in a row at this level — the
 *      "never-stuck" escape hatch unlocks the next level silently.
 *   3. The researcher toggle (`unlockGateBypass` device preference) is on.
 *
 * Side effects: on a passing gate the failed-session counter resets to 0;
 * on a failing gate it increments by one.
 */

import { StudentId } from '../types';
import { levelProgressionRepo } from '../persistence/repositories/levelProgression';
import { isUnlockGateBypassEnabled } from './preferences';

/** Minimum correct answers required to unlock the next level. */
export const UNLOCK_CORRECT_THRESHOLD = 3;
/** After this many failed sessions in a row, the gate opens silently. */
export const UNLOCK_NEVER_STUCK_LIMIT = 3;

export interface UnlockGateInput {
  /** Raw student id (or null for anonymous play); branded internally. */
  studentId: string | null;
  levelNumber: number;
  correctCount: number;
}

export interface UnlockGateResult {
  /** True when the next level should be marked unlocked. */
  passed: boolean;
  /** Why the gate passed (or 'failed' if it didn't). */
  reason: 'threshold' | 'never_stuck' | 'researcher_bypass' | 'failed';
  /** Updated failed-session counter for the level after the side effect. */
  consecutiveFailedSessions: number;
}

/**
 * Evaluate the gate and persist the resulting failed-session-counter change.
 * Safe to call with `studentId === null` (anonymous play): the gate then
 * still passes purely on the in-memory `correctCount` and the researcher
 * toggle, with no persistence side effect.
 */
export async function evaluateUnlockGate(input: UnlockGateInput): Promise<UnlockGateResult> {
  const { studentId, levelNumber, correctCount } = input;
  const sid = studentId ? StudentId(studentId) : null;

  if (isUnlockGateBypassEnabled()) {
    if (sid) await levelProgressionRepo.resetFailedSessions(sid, levelNumber);
    return { passed: true, reason: 'researcher_bypass', consecutiveFailedSessions: 0 };
  }

  if (correctCount >= UNLOCK_CORRECT_THRESHOLD) {
    if (sid) await levelProgressionRepo.resetFailedSessions(sid, levelNumber);
    return { passed: true, reason: 'threshold', consecutiveFailedSessions: 0 };
  }

  // Below threshold — increment the counter and check the never-stuck cap.
  if (!sid) {
    return { passed: false, reason: 'failed', consecutiveFailedSessions: 0 };
  }

  const next = await levelProgressionRepo.incrementFailedSession(sid, levelNumber);
  if (next >= UNLOCK_NEVER_STUCK_LIMIT) {
    await levelProgressionRepo.resetFailedSessions(sid, levelNumber);
    return { passed: true, reason: 'never_stuck', consecutiveFailedSessions: 0 };
  }
  return { passed: false, reason: 'failed', consecutiveFailedSessions: next };
}
