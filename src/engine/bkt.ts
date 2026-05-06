/**
 * Bayesian Knowledge Tracing — pure math layer.
 * No Dexie, no Phaser, no side effects.
 *
 * Formulas per standard BKT (Corbett & Anderson 1994).
 * BktParams field names match data-schema.md §2.3 / entities.ts.
 */

import type { BktParams, SkillMastery } from '@/types';

// ── Default priors ─────────────────────────────────────────────────────────

export const DEFAULT_PRIORS: BktParams = {
  pInit: 0.1,
  pTransit: 0.1,
  pSlip: 0.1,
  pGuess: 0.2,
};

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate BKT parameters are in valid ranges.
 * @throws Error if any parameter is invalid
 */
export function validateBktParams(params: BktParams): void {
  if (!Number.isFinite(params.pInit) || params.pInit < 0 || params.pInit > 1) {
    throw new Error(`Invalid pInit ${params.pInit}: must be a finite number in [0, 1]`);
  }
  if (!Number.isFinite(params.pTransit) || params.pTransit < 0 || params.pTransit > 1) {
    throw new Error(`Invalid pTransit ${params.pTransit}: must be a finite number in [0, 1]`);
  }
  if (params.pGuess <= 0 || params.pGuess >= 1) {
    throw new Error(`Invalid pGuess ${params.pGuess}: must be in (0, 1)`);
  }
  if (params.pSlip <= 0 || params.pSlip >= 1) {
    throw new Error(`Invalid pSlip ${params.pSlip}: must be in (0, 1)`);
  }
}

// ── Mastery threshold ──────────────────────────────────────────────────────

/**
 * P_known must reach this value for a skill to be considered mastered.
 * Threshold value per runtime-architecture.md §4.3 / data-schema.md §3.6.
 */
export const MASTERY_THRESHOLD = 0.85;

// ── Core BKT update ────────────────────────────────────────────────────────

/**
 * Compute the posterior P(L_t | observation) given the prior and the
 * outcome of a single attempt.
 *
 * Standard BKT two-step:
 *   Step 1  — update posterior given evidence (correct/incorrect)
 *   Step 2  — project forward one transit step
 *
 * @param pKnown  Current P(L_{t-1}): probability student already knows skill
 * @param correct Whether the student answered correctly
 * @param params  BKT parameters for this skill
 * @returns       Updated P(L_t) clamped to [0, 1]
 */
export function updatePKnown(pKnown: number, correct: boolean, params: BktParams): number {
  if (!Number.isFinite(pKnown) || pKnown < 0 || pKnown > 1) {
    throw new Error(`pKnown must be a finite number in [0, 1], got ${pKnown}`);
  }
  validateBktParams(params);
  const { pSlip, pGuess, pTransit } = params;

  // Step 1: P(L | observation)
  let pLGivenObs: number;
  if (correct) {
    // P(L_t | correct) = P(L) * (1 - P_slip) / [P(L)*(1-P_slip) + (1-P(L))*P_guess]
    const numerator = pKnown * (1 - pSlip);
    const denominator = numerator + (1 - pKnown) * pGuess;
    pLGivenObs = denominator === 0 ? pKnown : numerator / denominator;
  } else {
    // P(L_t | incorrect) = P(L) * P_slip / [P(L)*P_slip + (1-P(L))*(1-P_guess)]
    const numerator = pKnown * pSlip;
    const denominator = numerator + (1 - pKnown) * (1 - pGuess);
    pLGivenObs = denominator === 0 ? pKnown : numerator / denominator;
  }

  // Step 2: apply transit — P(L_t | obs) + (1 - P(L_t | obs)) * P_transit
  const updated = pLGivenObs + (1 - pLGivenObs) * pTransit;

  // Clamp to [0, 1] to guard against floating-point drift
  return Math.max(0, Math.min(1, updated));
}

/**
 * Options for updateMastery.
 */
export interface UpdateMasteryOptions {
  /**
   * When true, the attempt is an assisted correct answer (student watched the
   * worked-example demo first). The BKT posterior still updates normally, but
   * `consecutiveCorrectUnassisted` is reset to 0 instead of incremented.
   * This prevents a student from reaching MASTERED by copying demo solutions.
   * per PLANS/2026-05-04-worked-example-flow.md §Phase 4
   */
  assisted?: boolean;
}

/**
 * Update a full SkillMastery record after one attempt.
 * Returns a new immutable record; does not mutate the input.
 *
 * @param prev    Current skill mastery record.
 * @param correct Whether the student answered correctly.
 * @param params  BKT parameters (defaults to DEFAULT_PRIORS).
 * @param options Optional flags (e.g. assisted for demo-watched attempts).
 */
export function updateMastery(
  prev: SkillMastery,
  correct: boolean,
  params: BktParams = DEFAULT_PRIORS,
  options: UpdateMasteryOptions = {}
): SkillMastery {
  const newEstimate = updatePKnown(prev.masteryEstimate, correct, params);

  // Assisted correct answers do NOT advance the unassisted streak — the student
  // watched the solution and must prove they can do it independently.
  const nextConsecutiveCorrect =
    correct && !options.assisted ? prev.consecutiveCorrectUnassisted + 1 : 0;

  const newState = deriveState(newEstimate, nextConsecutiveCorrect);

  return {
    ...prev,
    masteryEstimate: newEstimate,
    state: newState,
    consecutiveCorrectUnassisted: nextConsecutiveCorrect,
    totalAttempts: prev.totalAttempts + 1,
    correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
  };
}

/**
 * Predict P(correct | current mastery state).
 * P(correct) = P(L) * (1 - P_slip) + (1 - P(L)) * P_guess
 */
export function predictCorrect(
  masteryEstimate: number,
  params: BktParams = DEFAULT_PRIORS
): number {
  const { pSlip, pGuess } = params;
  return masteryEstimate * (1 - pSlip) + (1 - masteryEstimate) * pGuess;
}

/**
 * Derive qualitative state from quantitative estimate.
 * Thresholds chosen to align with the three-session mastery arc (C9).
 */
export function deriveState(estimate: number, consecutiveCorrect: number): SkillMastery['state'] {
  if (estimate >= MASTERY_THRESHOLD && consecutiveCorrect >= 3) return 'MASTERED';
  if (estimate >= 0.65) return 'APPROACHING';
  if (estimate > 0) return 'LEARNING';
  return 'NOT_STARTED';
}

/**
 * Convenience predicate — true when P_known >= MASTERY_THRESHOLD.
 */
export function isMastered(mastery: SkillMastery): boolean {
  return mastery.masteryEstimate >= MASTERY_THRESHOLD;
}
