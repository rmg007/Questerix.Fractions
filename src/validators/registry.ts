/**
 * Validator registry — Map<validatorId, ValidatorRegistration>.
 * per activity-archetypes.md §11 (Validator Registry)
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

// Variance escape: registry values are heterogeneous; callers narrow at use site.
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
