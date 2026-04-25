/**
 * levelRouter — single source of truth mapping ArchetypeId → Interaction instance.
 * per activity-archetypes.md §11 (Validator Registry pattern)
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
import { SnapMatchInteraction } from '../interactions/SnapMatchInteraction';
import { EqualOrNotInteraction } from '../interactions/EqualOrNotInteraction';
import { PlacementInteraction } from '../interactions/PlacementInteraction';

const interactionRegistry = new Map<ArchetypeId, () => Interaction>([
  ['partition',    () => new PartitionInteraction()],
  ['identify',     () => new IdentifyInteraction()],
  ['label',        () => new LabelInteraction()],
  ['make',         () => new MakeInteraction()],
  ['compare',      () => new CompareInteraction()],
  ['benchmark',    () => new BenchmarkInteraction()],
  ['order',        () => new OrderInteraction()],
  ['snap_match',   () => new SnapMatchInteraction()],
  ['equal_or_not', () => new EqualOrNotInteraction()],
  ['placement',    () => new PlacementInteraction()],
]);

/**
 * Returns a fresh Interaction instance for the given archetype.
 * Throws if archetype is not registered.
 */
export function getInteractionForArchetype(archetype: ArchetypeId): Interaction {
  const factory = interactionRegistry.get(archetype);
  if (!factory) {
    throw new Error(`[levelRouter] No interaction registered for archetype: ${archetype}`);
  }
  return factory();
}
