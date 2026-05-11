/**
 * Pure interaction model for equal_or_not archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * The curriculum question shape for equal_or_not.
 * Extracted from QuestionTemplate.payload and QuestionTemplate.correctAnswer.
 */
export interface EqualOrNotQuestion {
  /** Left fraction numerator and denominator */
  leftFraction: { numerator: number; denominator: number };
  /** Right fraction numerator and denominator */
  rightFraction: { numerator: number; denominator: number };
  /** Pre-computed correct answer (±2% area rule) */
  correctAnswer: boolean;
}

/**
 * Internal model state for equal_or_not.
 * Tracks which button the student selected.
 */
export interface EqualOrNotState {
  /** 'equal' | 'not_equal' | null if unanswered */
  selectedChoice: 'equal' | 'not_equal' | null;
}

/**
 * Event type for equal_or_not user input.
 */
export type EqualOrNotEvent =
  | { type: 'select-equal' }
  | { type: 'select-not-equal' }
  | { type: 'clear-selection' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/equal_or_not.ts EqualOrNotInput
 */
export interface EqualOrNotAnswer {
  studentAnswer: boolean;
}

/**
 * Pure interaction model for equal_or_not archetype.
 * Reducer pattern: initialize once, reduce on each event, extract answer when ready.
 */
export const equalOrNotModel: InteractionModel<
  EqualOrNotQuestion,
  EqualOrNotState,
  EqualOrNotEvent,
  EqualOrNotAnswer
> = {
  archetype: 'equal_or_not',

  initialize(): EqualOrNotState {
    return { selectedChoice: null };
  },

  reduce(state: EqualOrNotState, event: EqualOrNotEvent): EqualOrNotState {
    switch (event.type) {
      case 'select-equal':
        return { selectedChoice: 'equal' };
      case 'select-not-equal':
        return { selectedChoice: 'not_equal' };
      case 'clear-selection':
        return { selectedChoice: null };
      default:
        // Unknown event type; return state unchanged
        return state;
    }
  },

  toAnswer(state: EqualOrNotState): EqualOrNotAnswer | null {
    if (state.selectedChoice === null) return null;
    return {
      studentAnswer: state.selectedChoice === 'equal',
    };
  },

  getA11y(_state: EqualOrNotState): A11yAction[] {
    return [
      {
        role: 'button',
        label: 'Equal',
        key: 'button-equal',
        description: 'These fractions are equal in area',
        enabled: true,
      },
      {
        role: 'button',
        label: 'Not Equal',
        key: 'button-not-equal',
        description: 'These fractions are not equal in area',
        enabled: true,
      },
    ];
  },

  getTestState(state: EqualOrNotState): Record<string, string | number | boolean> {
    return {
      'selected-choice': state.selectedChoice || 'none',
      'is-answered': state.selectedChoice !== null,
    };
  },
};
