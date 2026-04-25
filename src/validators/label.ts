/**
 * Validators for the `label` archetype.
 * per activity-archetypes.md §3 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface LabelMapping { labelId: string; regionId: string }

export interface LabelInput { studentMappings: LabelMapping[] }

export interface LabelExpected {
  /** regionId → expected labelId */
  expectedLabelForRegion: Record<string, string>;
}

// ── validator.label.matchTarget ───────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 3

/**
 * Returns EXACT if all label→region mappings match expected, else WRONG.
 * score reflects proportion correct.
 * per activity-archetypes.md §3 validator pseudocode (matchTarget variant)
 */
export const labelMatchTarget: ValidatorRegistration<LabelInput, LabelExpected> = {
  id: 'validator.label.matchTarget',
  archetype: 'label',
  variant: 'matchTarget',
  fn(input, expected): ValidatorResult {
    const { studentMappings } = input;
    const { expectedLabelForRegion } = expected;
    const regionIds = Object.keys(expectedLabelForRegion);
    const total = regionIds.length;

    let wrong = 0;
    for (const { labelId, regionId } of studentMappings) {
      if (expectedLabelForRegion[regionId] !== labelId) wrong++;
    }
    for (const regionId of regionIds) {
      if (!studentMappings.some(m => m.regionId === regionId)) wrong++;
    }

    if (wrong === 0) return { outcome: 'correct', score: 1 };
    const score = total > 0 ? Math.max(0, (total - wrong) / total) : 0;
    return { outcome: 'incorrect', score, feedback: `wrong_mappings:${wrong}` };
  },
};

export default [labelMatchTarget];
