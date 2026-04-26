/**
 * Validators for the `partition` archetype.
 * per activity-archetypes.md §1 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';
import { mean } from './utils';

// ── Shared payload types ───────────────────────────────────────────────────

export interface PartitionPayload {
  targetPartitions: number;
  areaTolerance: number; // relative delta threshold e.g. 0.05
}

/** Pre-computed region areas supplied by the Phaser layer. */
export interface PartitionInput {
  regionAreas: number[];
}

// ── validator.partition.equalAreas ─────────────────────────────────────────

/**
 * Returns EXACT if relative area delta <= areaTolerance,
 * CLOSE if <= areaTolerance*2, else WRONG.
 * per activity-archetypes.md §1 validator pseudocode
 */
export const partitionEqualAreas: ValidatorRegistration<PartitionInput, PartitionPayload> = {
  id: 'validator.partition.equalAreas',
  archetype: 'partition',
  variant: 'equalAreas',
  fn(input, expected): ValidatorResult {
    const { regionAreas } = input;
    const { targetPartitions, areaTolerance } = expected;

    if (regionAreas.length !== targetPartitions) {
      return { outcome: 'incorrect', score: 0, feedback: 'wrong_partition_count' };
    }

    const avg = mean(regionAreas);
    if (avg <= 1e-9) return { outcome: 'incorrect', score: 0, feedback: 'degenerate_partition' };

    const maxDelta = Math.max(...regionAreas) - Math.min(...regionAreas);
    const relativeDelta = maxDelta / avg;

    if (relativeDelta <= areaTolerance) {
      return { outcome: 'correct', score: 1, feedback: 'exact' };
    }
    if (relativeDelta <= areaTolerance * 2) {
      return { outcome: 'partial', score: 0.5, feedback: 'close' };
    }
    return { outcome: 'incorrect', score: 0, feedback: 'wrong' };
  },
};

// ── validator.partition.equalCount ─────────────────────────────────────────

export interface EqualCountInput {
  regionCount: number;
}
export interface EqualCountExpected {
  targetPartitions: number;
}

/**
 * Returns EXACT if region count matches target, else WRONG.
 * Simpler check used when area computation is not available.
 */
export const partitionEqualCount: ValidatorRegistration<EqualCountInput, EqualCountExpected> = {
  id: 'validator.partition.equalCount',
  archetype: 'partition',
  variant: 'equalCount',
  fn(input, expected): ValidatorResult {
    if (input.regionCount === expected.targetPartitions) {
      return { outcome: 'correct', score: 1 };
    }
    return { outcome: 'incorrect', score: 0, feedback: 'wrong_partition_count' };
  },
};

export default [partitionEqualAreas, partitionEqualCount];
