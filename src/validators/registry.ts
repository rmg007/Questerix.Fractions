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
 * Type alias for validator registrations with unknown input/payload types.
 * Used in the registry to accommodate heterogeneous validators while preserving
 * type safety: each validator is strongly typed in its source module, but at
 * the registry level we use unknown. Callers narrow types at the call site
 * based on the archetype or validator ID.
 *
 * See getValidatorEntry() and getValidator() below for safe retrieval.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValidatorRegistration = ValidatorRegistration<any, any>;

/**
 * Type-safe entry returned from validatorRegistry.get().
 * Allows callers to type the validator function without unsafe casts.
 */
export interface ValidatorEntry {
  fn: (input: unknown, payload: unknown) => ValidatorResult;
}

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
];

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
