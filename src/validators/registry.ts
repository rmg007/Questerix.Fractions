/**
 * Validator registry — Map<validatorId, ValidatorRegistration>.
 * per activity-archetypes.md §11 (Validator Registry)
 */
import type { ValidatorRegistration } from '@/types';

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

// Variance escape: registry values are heterogeneous; callers narrow at use site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValidatorRegistration = ValidatorRegistration<any, any>;

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
];

export const validatorRegistry = new Map<string, AnyValidatorRegistration>(
  allValidators.map((v) => [v.id, v])
);

export function getValidator(id: string): AnyValidatorRegistration | undefined {
  return validatorRegistry.get(id);
}

export { allValidators };
export type { AnyValidatorRegistration };
