/**
 * Validators for the `explain_your_order` archetype.
 * Semantically similar to `order`: student arranges fractions from least to
 * greatest (or greatest to least) and provides a verbal justification token.
 * per activity-archetypes.md §7 (ordering) and §11 (Validator Registry)
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';
import { kendallTauDistance } from './utils';

export interface ExplainYourOrderInput {
  /** Fraction IDs in the order the student placed them. */
  studentSequence: string[];
  /**
   * Optional one-word justification the student selected, e.g. "size" | "parts".
   * Absence is allowed — only the sequence is strictly graded.
   */
  justification?: string;
}

export interface ExplainYourOrderExpected {
  /** Correct sorted sequence of fraction IDs. */
  correctSequence: string[];
  /**
   * Accepted justification tokens that count as a correct explanation.
   * If omitted or empty the justification is not scored.
   */
  acceptedJustifications?: string[];
}

// ── validator.explain_your_order.sequence ────────────────────────────────────
// canonical per activity-archetypes.md §11 row 10

/**
 * Returns `correct` when the sequence matches exactly and the justification
 * (if required) is accepted; `partial` when sequence is one swap off OR the
 * sequence is correct but the justification is wrong; `incorrect` otherwise.
 * per activity-archetypes.md §7 validator pseudocode
 */
export const explainYourOrderSequence: ValidatorRegistration<
  ExplainYourOrderInput,
  ExplainYourOrderExpected
> = {
  id: 'validator.explain_your_order.sequence',
  archetype: 'explain_your_order',
  variant: 'sequence',
  fn(input, expected): ValidatorResult {
    const { studentSequence, justification } = input;
    const { correctSequence, acceptedJustifications } = expected;

    if (studentSequence.length !== correctSequence.length) {
      return { outcome: 'incorrect', score: 0, feedback: 'length_mismatch' };
    }

    const swaps = kendallTauDistance(studentSequence, correctSequence);

    // Evaluate justification token if the template provides accepted values.
    const justificationRequired =
      acceptedJustifications !== undefined && acceptedJustifications.length > 0;
    const justificationCorrect =
      !justificationRequired ||
      (justification !== undefined && acceptedJustifications!.includes(justification));

    if (swaps === 0) {
      if (justificationCorrect) {
        return { outcome: 'correct', score: 1 };
      }
      // Sequence perfect but justification wrong → partial credit
      return {
        outcome: 'partial',
        score: 0.7,
        feedback: 'wrong_justification',
        detectedMisconception: 'MC-ORD-01',
      };
    }

    if (swaps === 1) {
      return { outcome: 'partial', score: 0.5, feedback: 'one_swap_off' };
    }

    if (swaps === 2) {
      return { outcome: 'partial', score: 0.25, feedback: 'two_swaps' };
    }

    const maxSwaps = (correctSequence.length * (correctSequence.length - 1)) / 2;
    const score = maxSwaps > 0 ? Math.max(0, 1 - swaps / maxSwaps) : 0;
    return { outcome: 'incorrect', score, feedback: `swaps:${swaps}` };
  },
};

export default [explainYourOrderSequence];
