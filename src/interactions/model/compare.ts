/**
 * Pure interaction model for compare archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * The curriculum question shape for compare.
 * Extracted from QuestionTemplate.payload.
 */
export interface CompareQuestion {
  /** Left fraction numerator */
  leftNumerator?: number;
  /** Left fraction denominator */
  leftDenominator?: number;
  /** Right fraction numerator */
  rightNumerator?: number;
  /** Right fraction denominator */
  rightDenominator?: number;
}

/**
 * Internal model state for compare.
 * Tracks which relation was selected.
 */
export interface CompareState {
  /** Selected relation: 'less' | 'equal' | 'greater' or null */
  selectedRelation: 'less' | 'equal' | 'greater' | null;
  /** Left fraction numerator */
  leftNumerator: number;
  /** Left fraction denominator */
  leftDenominator: number;
  /** Right fraction numerator */
  rightNumerator: number;
  /** Right fraction denominator */
  rightDenominator: number;
}

/**
 * Event type for compare user input.
 */
export type CompareEvent =
  | { type: 'select-relation'; relation: 'less' | 'equal' | 'greater' }
  | { type: 'clear-selection' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/compare.ts CompareInput
 */
export interface CompareAnswer {
  relation: 'less' | 'equal' | 'greater';
}

/**
 * Pure interaction model for compare archetype.
 * Reducer pattern: tracks selected relation.
 */
export const compareModel: InteractionModel<
  CompareQuestion,
  CompareState,
  CompareEvent,
  CompareAnswer
> = {
  archetype: 'compare',

  initialize(question: CompareQuestion): CompareState {
    return {
      selectedRelation: null,
      leftNumerator: question.leftNumerator ?? 1,
      leftDenominator: question.leftDenominator ?? 2,
      rightNumerator: question.rightNumerator ?? 1,
      rightDenominator: question.rightDenominator ?? 4,
    };
  },

  reduce(state: CompareState, event: CompareEvent): CompareState {
    switch (event.type) {
      case 'select-relation':
        return { ...state, selectedRelation: event.relation };
      case 'clear-selection':
        return { ...state, selectedRelation: null };
      default:
        return state;
    }
  },

  toAnswer(state: CompareState): CompareAnswer | null {
    if (state.selectedRelation === null) {
      return null;
    }
    return {
      relation: state.selectedRelation,
    };
  },

  getA11y(_state: CompareState): A11yAction[] {
    return [
      {
        role: 'button',
        label: 'Left is less',
        key: 'button-less',
        description: 'Left fraction is less than right',
        enabled: true,
      },
      {
        role: 'button',
        label: 'Equal',
        key: 'button-equal',
        description: 'Fractions are equal',
        enabled: true,
      },
      {
        role: 'button',
        label: 'Left is greater',
        key: 'button-greater',
        description: 'Left fraction is greater than right',
        enabled: true,
      },
    ];
  },

  getTestState(state: CompareState): Record<string, string | number | boolean> {
    return {
      'selected-relation': state.selectedRelation || 'none',
      'is-answered': state.selectedRelation !== null,
    };
  },
};
