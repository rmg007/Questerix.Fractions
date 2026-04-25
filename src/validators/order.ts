/**
 * Validators for the `order` archetype.
 * per activity-archetypes.md §7 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';
import { kendallTauDistance } from './utils';

export interface OrderInput { studentSequence: string[] }

export interface OrderExpected {
  /** Correct sorted sequence of fraction IDs. */
  correctSequence: string[];
}

// ── validator.order.sequence ──────────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 7

/**
 * Returns EXACT if sequence matches; CLOSE if Kendall tau distance = 1;
 * else WRONG with errorMagnitude = swap count.
 * per activity-archetypes.md §7 validator pseudocode
 */
export const orderSequence: ValidatorRegistration<OrderInput, OrderExpected> = {
  id: 'validator.order.sequence',
  archetype: 'order',
  variant: 'sequence',
  fn(input, expected): ValidatorResult {
    const { studentSequence } = input;
    const { correctSequence } = expected;

    if (studentSequence.length !== correctSequence.length) {
      return { outcome: 'incorrect', score: 0, feedback: 'length_mismatch' };
    }

    const swaps = kendallTauDistance(studentSequence, correctSequence);

    if (swaps === 0) return { outcome: 'correct', score: 1 };
    if (swaps === 1) return { outcome: 'partial', score: 0.5, feedback: 'one_swap_off' };

    const maxSwaps = (correctSequence.length * (correctSequence.length - 1)) / 2;
    const score = maxSwaps > 0 ? Math.max(0, 1 - swaps / maxSwaps) : 0;
    return { outcome: 'incorrect', score, feedback: `swaps:${swaps}` };
  },
};

export default [orderSequence];
