/**
 * Validators for the `snap_match` archetype.
 * per activity-archetypes.md §8 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

// ── allPairs variant ──────────────────────────────────────────────────────

export interface SnapMatchAllPairsInput {
  /** Array of [leftId, rightId] pairs the student matched (allPairs variant). */
  studentPairs: Array<[string, string]>;
}

export interface SnapMatchAllPairsExpected {
  expectedPairs: Array<[string, string]>;
}

// ── helpers ────────────────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  // Canonical sort for deterministic pair lookup
  const sorted = [a, b].sort();
  return `${sorted[0]}||${sorted[1]}`;
}

// ── validator.snap_match.allPairs ─────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 8

/**
 * Returns EXACT if all pairs match expected set (order-insensitive within pair).
 * per activity-archetypes.md §8 validator pseudocode (allPairs)
 */
export const snapMatchAllPairs: ValidatorRegistration<
  SnapMatchAllPairsInput,
  SnapMatchAllPairsExpected
> = {
  id: 'validator.snap_match.allPairs',
  archetype: 'snap_match',
  variant: 'allPairs',
  fn(input, expected): ValidatorResult {
    const { studentPairs } = input;
    const { expectedPairs } = expected;

    if (studentPairs.length !== expectedPairs.length) {
      return { outcome: 'incorrect', score: 0, feedback: 'incomplete' };
    }

    const expectedKeys = new Set(expectedPairs.map(([a, b]) => pairKey(a, b)));

    for (const [a, b] of studentPairs) {
      const k = pairKey(a, b);
      if (!expectedKeys.has(k)) {
        return { outcome: 'incorrect', score: 0 };
      }
    }
    return { outcome: 'correct', score: 1 };
  },
};

// ── validator.snap_match.equivalence ──────────────────────────────────────

/**
 * Returns EXACT if snapped fraction decimal == target decimal within 1e-9 tolerance.
 * per activity-archetypes.md §8 equivalence variant
 */
export interface SnapMatchEquivalenceInput {
  snappedDecimal: number;
}

export interface SnapMatchEquivalenceExpected {
  targetDecimal: number;
}

export const snapMatchEquivalence: ValidatorRegistration<
  SnapMatchEquivalenceInput,
  SnapMatchEquivalenceExpected
> = {
  id: 'validator.snap_match.equivalence',
  archetype: 'snap_match',
  variant: 'equivalence',
  fn(input, expected): ValidatorResult {
    const { snappedDecimal } = input;
    const { targetDecimal } = expected;
    if (Math.abs(snappedDecimal - targetDecimal) <= 1e-9) {
      return { outcome: 'correct', score: 1 };
    }
    return { outcome: 'incorrect', score: 0 };
  },
};

export default [snapMatchEquivalence, snapMatchAllPairs];
