/**
 * Validators for the `label` archetype.
 * per activity-archetypes.md §3 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface LabelMapping {
  labelId: string;
  regionId: string;
}

export interface LabelInput {
  studentMappings: LabelMapping[];
}

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

    // Build map of region → labelIds (detect duplicates)
    const studentRegionMap = new Map<string, string[]>();
    for (const { labelId, regionId } of studentMappings) {
      if (!studentRegionMap.has(regionId)) {
        studentRegionMap.set(regionId, []);
      }
      studentRegionMap.get(regionId)!.push(labelId);
    }

    let wrong = 0;
    for (const regionId of regionIds) {
      const labels = studentRegionMap.get(regionId) || [];
      const expected_label = expectedLabelForRegion[regionId];
      // Count as wrong if: no label, multiple labels, or wrong label
      if (labels.length !== 1 || labels[0] !== expected_label) {
        wrong++;
      }
    }

    if (wrong === 0) return { outcome: 'correct', score: 1 };
    const score = total > 0 ? Math.max(0, (total - wrong) / total) : 0;
    return { outcome: 'incorrect', score, feedback: `wrong_mappings:${wrong}` };
  },
};

export default [labelMatchTarget];
