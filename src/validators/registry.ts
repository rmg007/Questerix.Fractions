/**
 * Validator registry — Map<validatorId, ValidatorRegistration>.
 * per activity-archetypes.md §11 (Validator Registry)
 *
 * Validators are heterogeneous (different input/payload shapes per archetype),
 * but all conform to the same registration and result types. This module provides
 * unified storage while allowing type narrowing at call sites.
 */
import type { ValidatorRegistration, ValidatorResult } from '@/types';

import partitionValidators from './partition';
import identifyValidators from './identify';
import labelValidators from './label';
import makeValidators from './make';
import compareValidators from './compare';
import benchmarkValidators from './benchmark';
import orderValidators from './order';
import snapMatchValidators from './snap_match';
import equalOrNotValidators from './equal_or_not';
import placementValidators from './placement';
import explainYourOrderValidators from './explain_your_order';

/**
 * Type alias for validator registrations held in the registry map.
 * The registry stores heterogeneous validators (each strongly typed in its own
 * module). At the registry boundary the fn signature must accept unknown so
 * callers can call any validator without a concrete type; the ValidatorFn
 * parameters are contravariant, so we wrap with an explicit `unknown` fn shape
 * rather than narrowing to ValidatorRegistration<unknown, unknown> (which would
 * conflict with the concrete input types on each module's export).
 *
 * The approach: store as `Omit<ValidatorRegistration, 'fn'> & { fn: (i: unknown, p: unknown) => ValidatorResult }`
 * to keep all metadata fields typed while erasing the generic input types at
 * the registry level. Callers that need the concrete types retrieve them via
 * getValidatorEntry() which exposes only the erased fn signature.
 */
type AnyValidatorRegistration = Omit<ValidatorRegistration, 'fn'> & {
  fn: (input: unknown, payload: unknown) => ValidatorResult;
};

/**
 * Type-safe entry returned from validatorRegistry.get().
 * Allows callers to type the validator function without unsafe casts.
 */
export interface ValidatorEntry {
  fn: (input: unknown, payload: unknown) => ValidatorResult;
}

// Each individual validator module is strongly typed (e.g. ValidatorRegistration<EqualCountInput, EqualCountExpected>).
// At the registry boundary we erase the generic parameters: ValidatorFn is contravariant in TInput/TExpected,
// so a strongly-typed fn is NOT directly assignable to (unknown, unknown) => ValidatorResult.
// The cast below is safe: callers always access the erased fn via getValidatorEntry() and are
// responsible for passing the correct payload shape (enforced by the archetype→validator mapping).
const allValidators: AnyValidatorRegistration[] = [
  ...partitionValidators,
  ...identifyValidators,
  ...labelValidators,
  ...makeValidators,
  ...compareValidators,
  ...benchmarkValidators,
  ...orderValidators,
  ...snapMatchValidators,
  ...equalOrNotValidators,
  ...placementValidators,
  ...explainYourOrderValidators,
] as AnyValidatorRegistration[];

export const validatorRegistry = new Map<string, AnyValidatorRegistration>(
  allValidators.map((v) => [v.id, v])
);

/**
 * Safely retrieve a validator entry by ID. Returns undefined if not found.
 * Callers can safely access the .fn property without unsafe casts.
 */
export function getValidatorEntry(id: string): ValidatorEntry | undefined {
  const reg = validatorRegistry.get(id);
  return reg ? { fn: reg.fn } : undefined;
}

export function getValidator(id: string): AnyValidatorRegistration | undefined {
  return validatorRegistry.get(id);
}

export { allValidators };
export type { AnyValidatorRegistration };
