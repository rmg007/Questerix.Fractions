// TODO: scaffolded by npm run scaffold:validator. Replace stubs and remove this comment.
/**
 * Validators for the `__ARCHETYPE__` archetype.
 * per activity-archetypes.md §11 (Validator Registry)
 *
 * Pure function — no Phaser, no DOM, no Math.random, no Date.now.
 * Mirror behaviour in `pipeline/validators_py.py` and update the matching
 * fixture in `pipeline/fixtures/parity/__ARCHETYPE___basic.json`.
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

export interface __ARCHETYPE__Input {
  /** TODO: replace with the real input shape supplied by the interaction. */
  value: unknown;
}

export interface __ARCHETYPE__Expected {
  /** TODO: replace with the correctAnswer snapshot from QuestionTemplate. */
  target: unknown;
}

// ── validator.__ARCHETYPE__.basic ────────────────────────────────────────

/**
 * Stub registration — returns `incorrect` until the real comparison lands.
 * Replace the body with the archetype-specific check.
 */
export const __ARCHETYPE__Basic: ValidatorRegistration<__ARCHETYPE__Input, __ARCHETYPE__Expected> = {
  id: 'validator.__ARCHETYPE__.basic',
  archetype: '__ARCHETYPE__',
  variant: 'basic',
  fn(_input, _expected): ValidatorResult {
    // TODO: implement comparison logic.
    return { outcome: 'incorrect', score: 0 };
  },
};

export default [__ARCHETYPE__Basic];
