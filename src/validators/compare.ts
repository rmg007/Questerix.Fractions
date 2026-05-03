/**
 * Validators for the `compare` archetype.
 * per activity-archetypes.md §5 and §11
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export type Relation = '<' | '=' | '>';

// ── compareRelation variant ────────────────────────────────────────────────

export interface CompareInput {
  studentRelation: Relation;
}

export interface CompareExpected {
  leftDecimal: number;
  rightDecimal: number;
  /** Pre-computed true relation; set at authoring time. */
  trueRelation: Relation;
}

// ── compareGreaterThan variant ────────────────────────────────────────────

export interface CompareGreaterThanInput {
  studentChoice: 'A' | 'B' | 'equal';
}

export interface CompareGreaterThanExpected {
  correctChoice: 'A' | 'B' | 'equal';
}

// ── validator.compare.relation ────────────────────────────────────────────
// canonical per activity-archetypes.md §11 row 5

/**
 * Returns EXACT if student relation matches; else WRONG with optional
 * misconception flag for denominator-magnitude confusion (MC-WHB-02).
 * per activity-archetypes.md §5 validator pseudocode
 */
export const compareRelation: ValidatorRegistration<CompareInput, CompareExpected> = {
  id: 'validator.compare.relation',
  archetype: 'compare',
  variant: 'relation',
  fn(input, expected): ValidatorResult {
    const { studentRelation } = input;
    const { trueRelation, leftDecimal, rightDecimal } = expected;

    if (studentRelation === trueRelation) {
      return { outcome: 'correct', score: 1 };
    }

    // Detect MC-WHB-02: student picks larger-denominator as bigger.
    // Signal: true relation is < (left < right) but student said >
    // AND left has larger decimal (student inverted), consistent with
    // "bigger denominator = bigger fraction" pattern.
    // per misconceptions.md §3.1 MC-WHB-02
    const denominatorBias =
      trueRelation === '<' && studentRelation === '>' && leftDecimal < rightDecimal;

    return {
      outcome: 'incorrect',
      score: 0,
      ...(denominatorBias ? { detectedMisconception: 'MC-WHB-02' } : {}),
    };
  },
};

// ── validator.compare.greaterThan ────────────────────────────────────────

/**
 * Returns EXACT if student choice matches correct choice.
 * Choices: 'A' (left is greater), 'B' (right is greater), or 'equal'.
 * per activity-archetypes.md §11 row 5b
 */
export const compareGreaterThan: ValidatorRegistration<
  CompareGreaterThanInput,
  CompareGreaterThanExpected
> = {
  id: 'validator.compare.greaterThan',
  archetype: 'compare',
  variant: 'greaterThan',
  fn(input, expected): ValidatorResult {
    if (input.studentChoice === expected.correctChoice) {
      return { outcome: 'correct', score: 1 };
    }
    return { outcome: 'incorrect', score: 0 };
  },
};

export default [compareRelation, compareGreaterThan];
