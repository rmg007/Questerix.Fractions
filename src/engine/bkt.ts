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
export function updatePKnown(
  pKnown: number,
  correct: boolean,
  params: BktParams,
): number {
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
 * Update a full SkillMastery record after one attempt.
 * Returns a new immutable record; does not mutate the input.
 */
export function updateMastery(
  prev: SkillMastery,
  correct: boolean,
  params: BktParams = DEFAULT_PRIORS,
): SkillMastery {
  const newEstimate = updatePKnown(prev.masteryEstimate, correct, params);

  const nextConsecutiveCorrect = correct
    ? prev.consecutiveCorrectUnassisted + 1
    : 0;

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
  params: BktParams = DEFAULT_PRIORS,
): number {
  const { pSlip, pGuess } = params;
  return masteryEstimate * (1 - pSlip) + (1 - masteryEstimate) * pGuess;
}

/**
 * Derive qualitative state from quantitative estimate.
 * Thresholds chosen to align with the three-session mastery arc (C9).
 */
export function deriveState(
  estimate: number,
  consecutiveCorrect: number,
): SkillMastery['state'] {
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
