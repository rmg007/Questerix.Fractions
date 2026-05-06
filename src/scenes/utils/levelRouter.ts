/**
 * levelRouter — single source of truth mapping ArchetypeId → Interaction instance.
 * per activity-archetypes.md §11 (Validator Registry pattern)
 *
 * Validator-keyed variants live in a registry rather than as inline `if`
 * branches so adding a new variant is one row, not a code edit.
 * Per PLANS/code-quality-2026-05-01.md Phase 8.3 (OCP).
 *
 * Factories return Promise<Interaction> via dynamic import so the API is
 * async-ready (rolldown currently inlines them, but the contract is stable).
 */

import type { ArchetypeId } from '@/types';
import type { Interaction } from '../interactions/types';

const interactionRegistry = new Map<ArchetypeId, () => Promise<Interaction>>([
  [
    'partition',
    () => import('../interactions/PartitionInteraction').then((m) => new m.PartitionInteraction()),
  ],
  [
    'identify',
    () => import('../interactions/IdentifyInteraction').then((m) => new m.IdentifyInteraction()),
  ],
  ['label', () => import('../interactions/LabelInteraction').then((m) => new m.LabelInteraction())],
  ['make', () => import('../interactions/MakeInteraction').then((m) => new m.MakeInteraction())],
  [
    'compare',
    () => import('../interactions/CompareInteraction').then((m) => new m.CompareInteraction()),
  ],
  [
    'benchmark',
    () => import('../interactions/BenchmarkInteraction').then((m) => new m.BenchmarkInteraction()),
  ],
  ['order', () => import('../interactions/OrderInteraction').then((m) => new m.OrderInteraction())],
  [
    'snap_match',
    () => import('../interactions/SnapMatchInteraction').then((m) => new m.SnapMatchInteraction()),
  ],
  [
    'equal_or_not',
    () =>
      import('../interactions/EqualOrNotInteraction').then((m) => new m.EqualOrNotInteraction()),
  ],
  [
    'placement',
    () => import('../interactions/PlacementInteraction').then((m) => new m.PlacementInteraction()),
  ],
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
  readonly factory: () => Promise<Interaction>;
}

/**
 * Lookup table keyed by `validatorId`. Adding a new validator variant
 * is one entry here — no edits to {@link getInteractionForArchetype}.
 */
const validatorVariantRegistry = new Map<string, ValidatorVariant>([
  // Level 9 Capstone: metacognitive "Explain Your Order" variant.
  [
    'validator.order.withRuleExplanation',
    {
      archetype: 'order',
      factory: () =>
        import('../interactions/ExplainYourOrderInteraction').then(
          (m) => new m.ExplainYourOrderInteraction()
        ),
    },
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
export async function getInteractionForArchetype(
  archetype: ArchetypeId,
  validatorId?: string
): Promise<Interaction> {
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
