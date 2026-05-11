/**
 * Pure interaction model for order archetype.
 * Student drags fraction cards into ordered slots.
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
 * Curriculum question for order archetype.
 */
export interface OrderQuestion {
  fractions: FractionDef[];
  direction?: 'asc' | 'desc';
}

/**
 * Internal state for order interaction.
 */
export interface OrderState {
  placedCards: Record<number, string>; // slotIndex -> cardId
  submitted: boolean;
}

/**
 * User input events for order.
 */
export type OrderEvent =
  | { type: 'move-card'; cardId: string; x: number; y: number }
  | { type: 'place-card'; cardId: string; slotIndex: number }
  | { type: 'submit' };

/**
 * Answer payload matching validator contract.
 */
export interface OrderAnswer {
  sequence: string[];
}

/**
 * Pure order interaction model.
 */
export const orderModel: InteractionModel<OrderQuestion, OrderState, OrderEvent, OrderAnswer> = {
  archetype: 'order',

  initialize(): OrderState {
    return { placedCards: {}, submitted: false };
  },

  reduce(state: OrderState, event: OrderEvent): OrderState {
    switch (event.type) {
      case 'move-card':
        // Movement is transient (visual only), no state change needed
        return state;
      case 'place-card':
        return {
          ...state,
          placedCards: { ...state.placedCards, [event.slotIndex]: event.cardId },
        };
      case 'submit':
        return { ...state, submitted: true };
      default:
        return state;
    }
  },

  toAnswer(state: OrderState): OrderAnswer | null {
    if (!state.submitted || Object.keys(state.placedCards).length === 0) {
      return null;
    }
    // Extract sequence from placed slots
    const sequence = Object.keys(state.placedCards)
      .sort((a, b) => Number(a) - Number(b))
      .map((slotIdx) => state.placedCards[Number(slotIdx)])
      .filter((id) => id !== undefined);

    return { sequence };
  },

  getA11y(): A11yAction[] {
    return [
      {
        role: 'region',
        label: 'Fraction ordering area',
        key: 'order-area',
        description: 'Drag cards to slots, then submit',
      },
    ];
  },

  getTestState(state: OrderState): Record<string, string | number | boolean> {
    return {
      submitted: state.submitted,
      placedCount: Object.keys(state.placedCards).length,
    };
  },
};
