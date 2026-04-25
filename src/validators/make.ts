/**
 * Validators for the `make` / `fold` archetype.
 * per activity-archetypes.md §4 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';
import { partitionEqualAreas, type PartitionInput, type PartitionPayload } from './partition';

export interface MakeInput extends PartitionInput {
  shadedRegionCount: number;
}

export interface MakeExpected extends PartitionPayload {
  targetNumerator: number;
}

// ── validator.make.foldAndShade ───────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 4 (delegates to partition.equalAreas)

/**
 * Checks partition equality first, then shaded region count.
 * Delegates to partitionEqualAreas per the archetype doc pseudocode.
 * per activity-archetypes.md §4 validator pseudocode (foldAndShade)
 */
export const makeFoldAndShade: ValidatorRegistration<MakeInput, MakeExpected> = {
  id: 'validator.make.foldAndShade',
  archetype: 'make',
  variant: 'foldAndShade',
  fn(input, expected): ValidatorResult {
    const partResult = partitionEqualAreas.fn(
      { regionAreas: input.regionAreas },
      { targetPartitions: expected.targetPartitions, areaTolerance: expected.areaTolerance }
    );
    if (partResult.outcome !== 'correct') return partResult;

    if (input.shadedRegionCount !== expected.targetNumerator) {
      return { outcome: 'incorrect', score: 0, feedback: 'wrong_shade_count' };
    }
    return { outcome: 'correct', score: 1 };
  },
};

// ── validator.make.halvingByLine ───────────────────────────────────────────

export interface HalvingInput { regionAreas: number[] }
export interface HalvingExpected { areaTolerance: number }

/**
 * Specialised halves-only variant with fixed targetPartitions=2.
 * per activity-archetypes.md §4 (L4 make halves)
 */
export const makeHalvingByLine: ValidatorRegistration<HalvingInput, HalvingExpected> = {
  id: 'validator.make.halvingByLine',
  archetype: 'make',
  variant: 'halvingByLine',
  fn(input, expected): ValidatorResult {
    return partitionEqualAreas.fn(
      { regionAreas: input.regionAreas },
      { targetPartitions: 2, areaTolerance: expected.areaTolerance }
    );
  },
};

export default [makeFoldAndShade, makeHalvingByLine];
