/**
 * Validators for the `benchmark` / `benchmark_sort` archetype.
 * per activity-archetypes.md §6 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export type BenchmarkZone = 'zero' | 'half' | 'one';

export interface BenchmarkInput {
  /** fracId → student-chosen zone */
  studentPlacements: Map<string, BenchmarkZone>;
}

export interface BenchmarkExpected {
  /** fracId → correct zone */
  correctPlacements: Map<string, BenchmarkZone>;
}

// ── validator.benchmark.sortToZone ────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 6

/**
 * Returns EXACT if 0 errors; CLOSE if ≤25% wrong; else WRONG.
 * per activity-archetypes.md §6 validator pseudocode (sortToZone)
 */
export const benchmarkSortToZone: ValidatorRegistration<BenchmarkInput, BenchmarkExpected> = {
  id: 'validator.benchmark.sortToZone',
  archetype: 'benchmark',
  variant: 'sortToZone',
  fn(input, expected): ValidatorResult {
    const { studentPlacements } = input;
    const { correctPlacements } = expected;
    const total = correctPlacements.size;
    if (total === 0) return { outcome: 'correct', score: 1 };

    let errors = 0;
    for (const [fracId, correctZone] of correctPlacements) {
      if (studentPlacements.get(fracId) !== correctZone) errors++;
    }

    if (errors === 0) return { outcome: 'correct', score: 1 };
    const errorRate = errors / total;
    if (errorRate <= 0.25) {
      return { outcome: 'partial', score: 1 - errorRate, feedback: 'close' };
    }
    return { outcome: 'incorrect', score: 1 - errorRate, feedback: `errors:${errors}/${total}` };
  },
};

export default [benchmarkSortToZone];
