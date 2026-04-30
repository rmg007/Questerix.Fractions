/**
 * Validators for the `order` archetype.
 * per activity-archetypes.md §7 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';
import { kendallTauDistance } from './utils';

export interface OrderInput {
  studentSequence: string[];
}

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

    // Explicit tier mapping: 0 swaps → 1.0, 1 swap → 0.5, 2+ swaps → score from Kendall normalization
    if (swaps === 0) return { outcome: 'correct', score: 1 };
    if (swaps === 1) return { outcome: 'partial', score: 0.5, feedback: 'one_swap_off' };
    if (swaps === 2) return { outcome: 'partial', score: 0.5, feedback: 'two_swaps' };

    const maxSwaps = (correctSequence.length * (correctSequence.length - 1)) / 2;
    const score = maxSwaps > 0 ? Math.max(0, 1 - swaps / maxSwaps) : 0;
    return { outcome: 'incorrect', score, feedback: `swaps:${swaps}` };
  },
};

export interface OrderAcceptablePayload {
  /** Array of valid sequences (fraction ID arrays) */
  acceptableOrders: string[][];
}

/**
 * Validates against a set of acceptable orders.
 * Used when multiple orders are mathematically equivalent.
 */
export const orderAcceptable: ValidatorRegistration<OrderInput, OrderAcceptablePayload> = {
  id: 'validator.order.acceptableOrders',
  archetype: 'order',
  variant: 'acceptable',
  fn(input, payload): ValidatorResult {
    const { studentSequence } = input;
    const { acceptableOrders } = payload;

    for (const order of acceptableOrders) {
      if (studentSequence.length === order.length && studentSequence.every((id, i) => id === order[i])) {
        return { outcome: 'correct', score: 1 };
      }
    }

    // Partial credit: if we find the "best" match among acceptable orders
    let bestSwaps = Infinity;
    for (const order of acceptableOrders) {
      if (studentSequence.length === order.length) {
        const swaps = kendallTauDistance(studentSequence, order);
        if (swaps < bestSwaps) bestSwaps = swaps;
      }
    }

    if (bestSwaps === 1) return { outcome: 'partial', score: 0.5, feedback: 'one_swap_off' };
    if (bestSwaps === 2) return { outcome: 'partial', score: 0.5, feedback: 'two_swaps' };

    return { outcome: 'incorrect', score: 0, feedback: 'no_match' };
  },
};

export interface OrderWithRuleInput {
  sequence: string[];
  rule: string;
}

export interface OrderWithRulePayload {
  acceptableOrders: string[][];
  postStep: {
    correctRule: string;
  };
}

/**
 * Validates both the order and the metacognitive explanation.
 */
export const orderWithRule: ValidatorRegistration<OrderWithRuleInput, OrderWithRulePayload> = {
  id: 'validator.order.withRuleExplanation',
  archetype: 'order',
  variant: 'explanation',
  fn(input, payload): ValidatorResult {
    const { sequence, rule } = input;
    const { acceptableOrders, postStep } = payload;

    // 1. Check order
    let orderCorrect = false;
    for (const order of acceptableOrders) {
      if (sequence.length === order.length && sequence.every((id, i) => id === order[i])) {
        orderCorrect = true;
        break;
      }
    }

    if (!orderCorrect) {
      return { outcome: 'incorrect', score: 0, feedback: 'order_incorrect' };
    }

    // 2. Check rule
    if (rule === postStep.correctRule) {
      return { outcome: 'correct', score: 1 };
    }

    return { outcome: 'partial', score: 0.5, feedback: 'rule_incorrect' };
  },
};

export default [orderSequence, orderAcceptable, orderWithRule];
