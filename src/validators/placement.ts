/**
 * Validators for the `placement` archetype.
 * per activity-archetypes.md §10 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface PlacementInput {
  studentPlacedDecimal: number;
}

export interface PlacementExpected {
  targetDecimal: number;
  exactTolerance: number; // typically 0.05
  closeTolerance: number; // typically 0.15
}

// ── shared placement check ────────────────────────────────────────────────

function runPlacement(input: PlacementInput, expected: PlacementExpected): ValidatorResult {
  const errorMagnitude = Math.abs(input.studentPlacedDecimal - expected.targetDecimal);

  if (errorMagnitude <= expected.exactTolerance) {
    return { outcome: 'correct', score: 1, feedback: `error:${errorMagnitude.toFixed(4)}` };
  }
  if (errorMagnitude <= expected.closeTolerance) {
    const score = Math.max(0, 1 - errorMagnitude / expected.closeTolerance);
    return { outcome: 'partial', score, feedback: `error:${errorMagnitude.toFixed(4)}` };
  }

  // Detect MC-PRX-02: "all fractions < 0.5" — student places >0.5 target below 0.5.
  // per misconceptions.md §3.4 MC-PRX-02
  const prx02 = expected.targetDecimal > 0.5 && input.studentPlacedDecimal < 0.5;

  return {
    outcome: 'incorrect',
    score: 0,
    feedback: `error:${errorMagnitude.toFixed(4)}`,
    ...(prx02 ? { detectedMisconception: 'MC-PRX-02' } : {}),
  };
}

// ── validator.placement.snapTolerance ────────────────────────────────────

/**
 * General tolerance-based number-line placement.
 * per activity-archetypes.md §10 and §11 (validator.placement.snapTolerance)
 */
export const placementSnapTolerance: ValidatorRegistration<PlacementInput, PlacementExpected> = {
  id: 'validator.placement.snapTolerance',
  archetype: 'placement',
  variant: 'snapTolerance',
  fn: runPlacement,
};

// ── validator.placement.snap8 ────────────────────────────────────────────

/**
 * Eighths-denominator variant; exactTolerance = 0.0625 (half of 1/8).
 * Overrides payload tolerances with eighths-calibrated values.
 * per activity-archetypes.md §11 (validator.placement.snap8)
 */
export const placementSnap8: ValidatorRegistration<PlacementInput, PlacementExpected> = {
  id: 'validator.placement.snap8',
  archetype: 'placement',
  variant: 'snap8',
  fn(input, expected): ValidatorResult {
    return runPlacement(input, {
      ...expected,
      exactTolerance: 0.0625,
      closeTolerance: expected.closeTolerance,
    });
  },
};

export default [placementSnapTolerance, placementSnap8];
