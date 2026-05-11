/**
 * Pure interaction model for placement archetype.
 * Student drags a fraction marker onto a number line (0..1).
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * Curriculum question for placement archetype.
 */
export interface PlacementQuestion {
  numerator: number;
  denominator: number;
  exactTolerance?: number; // default 0.05
  closeTolerance?: number; // default 0.15
}

/**
 * Internal state for placement interaction.
 */
export interface PlacementState {
  position: number | null; // 0..1 decimal value on number line
  submitted: boolean;
  exactTolerance: number;
  closeTolerance: number;
}

/**
 * User input events for placement.
 */
export type PlacementEvent = { type: 'place-marker'; position: number } | { type: 'submit' };

/**
 * Answer payload matching validator contract.
 */
export interface PlacementAnswer {
  position: number;
  exactTolerance: number;
  closeTolerance: number;
}

/**
 * Pure placement interaction model.
 */
export const placementModel: InteractionModel<
  PlacementQuestion,
  PlacementState,
  PlacementEvent,
  PlacementAnswer
> = {
  archetype: 'placement',

  initialize(question: PlacementQuestion): PlacementState {
    return {
      position: 0.5,
      submitted: false,
      exactTolerance: question.exactTolerance ?? 0.05,
      closeTolerance: question.closeTolerance ?? 0.15,
    };
  },

  reduce(state: PlacementState, event: PlacementEvent): PlacementState {
    switch (event.type) {
      case 'place-marker':
        return { ...state, position: event.position };
      case 'submit':
        return { ...state, submitted: true };
      default:
        return state;
    }
  },

  toAnswer(state: PlacementState): PlacementAnswer | null {
    if (state.position === null || !state.submitted) return null;
    return {
      position: state.position,
      exactTolerance: state.exactTolerance,
      closeTolerance: state.closeTolerance,
    };
  },

  getA11y(): A11yAction[] {
    return [
      {
        role: 'slider',
        label: 'Position on number line',
        key: 'placement-slider',
        description: 'Use arrow keys to adjust, Enter to submit',
      },
    ];
  },

  getTestState(state: PlacementState): Record<string, string | number | boolean> {
    return {
      position: state.position ?? 0,
      submitted: state.submitted,
    };
  },
};
