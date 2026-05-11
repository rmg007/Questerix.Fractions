/**
 * Interaction model layer — framework-neutral.
 * Exports all model contracts and implementations.
 */

export type { InteractionModel, A11yAction, InteractionEvent, ArchetypeAnswer } from './types';

// Phase 5 (EqualOrNot)
export { equalOrNotModel } from './equal_or_not';
export type {
  EqualOrNotQuestion,
  EqualOrNotState,
  EqualOrNotEvent,
  EqualOrNotAnswer,
} from './equal_or_not';

// Phase 6 Team A (Partition, Identify, Label)
export { partitionModel } from './partition';
export type {
  PartitionQuestion,
  PartitionState,
  PartitionEvent,
  PartitionAnswer,
} from './partition';

export { identifyModel } from './identify';
export type { IdentifyQuestion, IdentifyState, IdentifyEvent, IdentifyAnswer } from './identify';

export { labelModel } from './label';
export type { LabelQuestion, LabelState, LabelEvent, LabelAnswer, LabelMapping } from './label';

// Phase 6 Team B (Make, Compare, SnapMatch)
export { makeModel } from './make';
export type { MakeQuestion, MakeState, MakeEvent, MakeAnswer } from './make';

export { compareModel } from './compare';
export type { CompareQuestion, CompareState, CompareEvent, CompareAnswer } from './compare';

export { snapMatchModel } from './snap_match';
export type {
  SnapMatchQuestion,
  SnapMatchState,
  SnapMatchEvent,
  SnapMatchAnswer,
} from './snap_match';

// Phase 6 Team C (Benchmark, Placement, Order, ExplainYourOrder)
export { benchmarkModel } from './benchmark';
export type {
  BenchmarkQuestion,
  BenchmarkState,
  BenchmarkEvent,
  BenchmarkAnswer,
} from './benchmark';

export { placementModel } from './placement';
export type {
  PlacementQuestion,
  PlacementState,
  PlacementEvent,
  PlacementAnswer,
} from './placement';

export { orderModel } from './order';
export type { OrderQuestion, OrderState, OrderEvent, OrderAnswer, FractionDef } from './order';

export { explainYourOrderModel } from './explain_your_order';
export type {
  ExplainYourOrderQuestion,
  ExplainYourOrderState,
  ExplainYourOrderEvent,
  ExplainYourOrderAnswer,
} from './explain_your_order';

export * from './testHarness';
