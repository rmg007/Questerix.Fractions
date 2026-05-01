/**
 * levelRouter — single source of truth mapping ArchetypeId → Interaction instance.
 * per activity-archetypes.md §11 (Validator Registry pattern)
 *
 * Validator-keyed variants live in a registry rather than as inline `if`
 * branches so adding a new variant is one row, not a code edit.
 * Per PLANS/code-quality-2026-05-01.md Phase 8.3 (OCP).
 */

import type { ArchetypeId } from '@/types';
import type { Interaction } from '../interactions/types';
import { PartitionInteraction } from '../interactions/PartitionInteraction';
import { IdentifyInteraction } from '../interactions/IdentifyInteraction';
import { LabelInteraction } from '../interactions/LabelInteraction';
import { MakeInteraction } from '../interactions/MakeInteraction';
import { CompareInteraction } from '../interactions/CompareInteraction';
import { BenchmarkInteraction } from '../interactions/BenchmarkInteraction';
import { OrderInteraction } from '../interactions/OrderInteraction';
import { ExplainYourOrderInteraction } from '../interactions/ExplainYourOrderInteraction';
import { SnapMatchInteraction } from '../interactions/SnapMatchInteraction';
import { EqualOrNotInteraction } from '../interactions/EqualOrNotInteraction';
import { PlacementInteraction } from '../interactions/PlacementInteraction';

const interactionRegistry = new Map<ArchetypeId, () => Interaction>([
  ['partition', () => new PartitionInteraction()],
  ['identify', () => new IdentifyInteraction()],
  ['label', () => new LabelInteraction()],
  ['make', () => new MakeInteraction()],
  ['compare', () => new CompareInteraction()],
  ['benchmark', () => new BenchmarkInteraction()],
  ['order', () => new OrderInteraction()],
  ['snap_match', () => new SnapMatchInteraction()],
  ['equal_or_not', () => new EqualOrNotInteraction()],
  ['placement', () => new PlacementInteraction()],
]);

/**
 * A validator-specific Interaction variant — overrides the default
 * archetype factory when a question's `validatorId` matches.
 *
 * Add a new variant by registering it via {@link registerValidatorVariant}.
 */
export interface ValidatorVariant {
  /** Archetype this variant belongs to (defensive — guards against ID typos). */
  readonly archetype: ArchetypeId;
  /** Factory producing a fresh Interaction instance. */
  readonly factory: () => Interaction;
}

/**
 * Lookup table keyed by `validatorId`. Adding a new validator variant
 * is one entry here — no edits to {@link getInteractionForArchetype}.
 */
const validatorVariantRegistry = new Map<string, ValidatorVariant>([
  // Level 9 Capstone: metacognitive "Explain Your Order" variant.
  [
    'validator.order.withRuleExplanation',
    { archetype: 'order', factory: () => new ExplainYourOrderInteraction() },
  ],
]);

/**
 * Register a new validator variant at runtime (used by tests; production
 * variants should be added to the literal above).
 */
export function registerValidatorVariant(validatorId: string, variant: ValidatorVariant): void {
  validatorVariantRegistry.set(validatorId, variant);
}

/** Test-only: remove a previously-registered variant. */
export function unregisterValidatorVariant(validatorId: string): void {
  validatorVariantRegistry.delete(validatorId);
}

/**
 * Returns a fresh Interaction instance for the given archetype and validator.
 * Validator-keyed variants take precedence over the archetype default.
 */
export function getInteractionForArchetype(
  archetype: ArchetypeId,
  validatorId?: string
): Interaction {
  if (validatorId !== undefined) {
    const variant = validatorVariantRegistry.get(validatorId);
    if (variant && variant.archetype === archetype) {
      return variant.factory();
    }
  }

  const factory = interactionRegistry.get(archetype);
  if (!factory) {
    throw new Error(`[levelRouter] No interaction registered for archetype: ${archetype}`);
  }
  return factory();
}
