/**
 * Validators for the `snap_match` archetype.
 * per activity-archetypes.md §8 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface SnapMatchInput {
  /** Array of [leftId, rightId] pairs the student matched. */
  studentPairs: Array<[string, string]>;
}

export interface SnapMatchExpected {
  expectedPairs: Array<[string, string]>;
}

// ── helpers ────────────────────────────────────────────────────────────────

function pairKey(a: string, b: string): string { return `${a}||${b}`; }

// ── validator.snap_match.allPairs ─────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 8

/**
 * Returns EXACT if all pairs match expected set (order-insensitive within pair).
 * per activity-archetypes.md §8 validator pseudocode (allPairs)
 */
export const snapMatchAllPairs: ValidatorRegistration<SnapMatchInput, SnapMatchExpected> = {
  id: 'validator.snap_match.allPairs',
  archetype: 'snap_match',
  variant: 'allPairs',
  fn(input, expected): ValidatorResult {
    const { studentPairs } = input;
    const { expectedPairs } = expected;

    if (studentPairs.length !== expectedPairs.length) {
      return { outcome: 'incorrect', score: 0, feedback: 'incomplete' };
    }

    const expectedKeys = new Set(
      expectedPairs.map(([a, b]) => pairKey(a, b))
    );
    // also accept reversed pairs
    const expectedKeysRev = new Set(
      expectedPairs.map(([a, b]) => pairKey(b, a))
    );

    for (const [a, b] of studentPairs) {
      const k = pairKey(a, b);
      if (!expectedKeys.has(k) && !expectedKeysRev.has(k)) {
        return { outcome: 'incorrect', score: 0 };
      }
    }
    return { outcome: 'correct', score: 1 };
  },
};

export default [snapMatchAllPairs];
