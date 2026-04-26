/**
 * Validators for the `equal_or_not` archetype.
 * per activity-archetypes.md §9 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface EqualOrNotInput {
  studentAnswer: boolean;
}

export interface EqualOrNotExpected {
  /**
   * Pre-computed at authoring time using ±2% area rule.
   * per activity-archetypes.md §9 validator pseudocode
   */
  correctAnswer: boolean;
  /**
   * Optional: if this template specifically traps a misconception
   * when student gives wrong answer.
   */
  misconceptionOnWrong?: string;
}

// ── validator.equal_or_not.areaTolerance ──────────────────────────────────

/**
 * Binary validator: EXACT if studentAnswer === correctAnswer, else WRONG.
 * correctAnswer is pre-computed upstream (±2% area rule, per doc §9).
 * per activity-archetypes.md §9 validator pseudocode
 */
export const equalOrNotAreaTolerance: ValidatorRegistration<EqualOrNotInput, EqualOrNotExpected> = {
  id: 'validator.equal_or_not.areaTolerance',
  archetype: 'equal_or_not',
  variant: 'areaTolerance',
  fn(input, expected): ValidatorResult {
    if (input.studentAnswer === expected.correctAnswer) {
      return { outcome: 'correct', score: 1 };
    }

    // Detect MC-EOL-01: "any two pieces = halves" — student says equal when not.
    // per misconceptions.md §3.2 MC-EOL-01
    const mc =
      expected.misconceptionOnWrong ??
      (input.studentAnswer === true && expected.correctAnswer === false ? 'MC-EOL-01' : undefined);

    return {
      outcome: 'incorrect',
      score: 0,
      ...(mc !== undefined ? { detectedMisconception: mc } : {}),
    };
  },
};

export default [equalOrNotAreaTolerance];
