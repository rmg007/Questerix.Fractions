/**
 * Pure interaction model for explain_your_order archetype.
 * Two-phase: (1) order fractions, (2) explain the rule used.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

export interface FractionDef {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
}

/**
 * Curriculum question for explain_your_order archetype.
 */
export interface ExplainYourOrderQuestion {
  fractions: FractionDef[];
  direction?: 'asc' | 'desc';
  ruleOptions?: Array<{ id: string; label: string }>;
}

/**
 * Internal state for explain_your_order interaction.
 */
export interface ExplainYourOrderState {
  placedCards: Record<number, string>; // slotIndex -> cardId
  selectedRuleId: string | null;
  submitted: boolean;
}

/**
 * User input events for explain_your_order.
 */
export type ExplainYourOrderEvent =
  | { type: 'move-card'; cardId: string; x: number; y: number }
  | { type: 'place-card'; cardId: string; slotIndex: number }
  | { type: 'select-rule'; ruleId: string }
  | { type: 'submit' };

/**
 * Answer payload matching validator contract.
 */
export interface ExplainYourOrderAnswer {
  explanation: string;
  order: string[];
}

/**
 * Pure explain_your_order interaction model.
 */
export const explainYourOrderModel: InteractionModel<
  ExplainYourOrderQuestion,
  ExplainYourOrderState,
  ExplainYourOrderEvent,
  ExplainYourOrderAnswer
> = {
  archetype: 'explain_your_order',

  initialize(): ExplainYourOrderState {
    return { placedCards: {}, selectedRuleId: null, submitted: false };
  },

  reduce(state: ExplainYourOrderState, event: ExplainYourOrderEvent): ExplainYourOrderState {
    switch (event.type) {
      case 'move-card':
        // Movement is transient (visual only)
        return state;
      case 'place-card':
        return {
          ...state,
          placedCards: { ...state.placedCards, [event.slotIndex]: event.cardId },
        };
      case 'select-rule':
        return { ...state, selectedRuleId: event.ruleId };
      case 'submit':
        return { ...state, submitted: true };
      default:
        return state;
    }
  },

  toAnswer(state: ExplainYourOrderState): ExplainYourOrderAnswer | null {
    if (
      !state.submitted ||
      state.selectedRuleId === null ||
      Object.keys(state.placedCards).length === 0
    ) {
      return null;
    }

    const sequence = Object.keys(state.placedCards)
      .sort((a, b) => Number(a) - Number(b))
      .map((slotIdx) => state.placedCards[Number(slotIdx)])
      .filter((id) => id !== undefined);

    return {
      explanation: state.selectedRuleId,
      order: sequence,
    };
  },

  getA11y(): A11yAction[] {
    return [
      {
        role: 'region',
        label: 'Order fractions and explain',
        key: 'explain-area',
        description: 'Drag to order, then select explanation rule',
      },
    ];
  },

  getTestState(state: ExplainYourOrderState): Record<string, string | number | boolean> {
    return {
      submitted: state.submitted,
      placedCount: Object.keys(state.placedCards).length,
      selectedRule: state.selectedRuleId ?? '',
    };
  },
};
