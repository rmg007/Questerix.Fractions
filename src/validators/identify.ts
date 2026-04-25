/**
 * Validators for the `identify` archetype.
 * per activity-archetypes.md §2 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface IdentifyInput { selectedIndex: number }

export interface IdentifyExpected {
  targetIndex: number;
  /** Optional misconception IDs keyed by distractor index. */
  distractorMisconceptions?: Record<number, string>;
}

// ── validator.identify.exactIndex ─────────────────────────────────────────

/**
 * Returns EXACT if selectedIndex === targetIndex, else WRONG.
 * Flags misconception if distractor mapping exists.
 * per activity-archetypes.md §2 validator pseudocode
 */
export const identifyExactIndex: ValidatorRegistration<IdentifyInput, IdentifyExpected> = {
  id: 'validator.identify.exactIndex',
  archetype: 'identify',
  variant: 'exactIndex',
  fn(input, expected): ValidatorResult {
    if (input.selectedIndex === expected.targetIndex) {
      return { outcome: 'correct', score: 1 };
    }

    const mc = expected.distractorMisconceptions?.[input.selectedIndex];
    return {
      outcome: 'incorrect',
      score: 0,
      ...(mc !== undefined ? { detectedMisconception: mc } : {}),
    };
  },
};

export default [identifyExactIndex];
