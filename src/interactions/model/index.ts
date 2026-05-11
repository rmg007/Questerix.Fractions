/**
 * Interaction model layer — framework-neutral.
 * Exports all model contracts and implementations.
 */

export type { InteractionModel, A11yAction, InteractionEvent, ArchetypeAnswer } from './types';
export { equalOrNotModel } from './equal_or_not';
export type {
  EqualOrNotQuestion,
  EqualOrNotState,
  EqualOrNotEvent,
  EqualOrNotAnswer,
} from './equal_or_not';
export * from './testHarness';
