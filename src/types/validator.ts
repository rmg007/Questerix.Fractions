/**
 * Validator function signatures and registration meta.
 * Validators are pure TypeScript functions in src/validators/.
 * per activity-archetypes.md §11 (Validator Registry)
 */

import type { ArchetypeId } from './archetype';

/**
 * Three-value outcome aligned with data-schema.md §3.3 Attempt.outcome.
 * Note: Attempt.outcome also has 'ASSISTED' and 'ABANDONED'; those are
 * session-layer concerns set by the engine, not by validators directly.
 */
export type Outcome = 'correct' | 'partial' | 'incorrect';

export interface ValidatorResult {
  outcome: Outcome;
  /** Normalised 0..1 correctness score. */
  score: number;
  /** Optional human-readable feedback (never student-facing verbatim; see interaction-model §5.1). */
  feedback?: string;
  /** MC-XXX-NN pattern; set when a misconception is detected. per data-schema.md §2.8 */
  detectedMisconception?: string;
}

/**
 * Generic validator function signature.
 * TInput shape varies by archetype (per activity-archetypes.md §11).
 * TExpected is the correctAnswer snapshot from QuestionTemplate.
 */
export type ValidatorFn<TInput = unknown, TExpected = unknown> = (
  input: TInput,
  expected: TExpected,
  config?: Record<string, unknown>
) => ValidatorResult;

/**
 * Metadata record for registering a validator in the engine registry.
 * id format: 'validator.<archetype>.<variant>' e.g. 'validator.placement.snapTolerance'
 * per activity-archetypes.md §11
 */
export interface ValidatorRegistration<TInput = unknown, TExpected = unknown> {
  /** e.g. 'validator.partition.equalAreas' */
  id: string;
  archetype: ArchetypeId;
  /** e.g. 'equalAreas', 'snapTolerance', 'snap8' */
  variant: string;
  fn: ValidatorFn<TInput, TExpected>;
}
