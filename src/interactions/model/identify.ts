/**
 * Pure interaction model for identify archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * The curriculum question shape for identify.
 * Extracted from QuestionTemplate.payload.
 */
export interface IdentifyQuestion {
  /** Target option index (0-based) */
  targetIndex: number;
  /** Number of options (2-4) */
  optionCount?: number;
  /** Option labels for accessibility */
  optionLabels?: string[];
}

/**
 * Internal model state for identify.
 * Tracks which option is selected and whether submit is ready.
 */
export interface IdentifyState {
  /** Currently selected option index, or null if unanswered */
  selectedIndex: number | null;
  /** Whether the student has confirmed the selection */
  isSubmitted: boolean;
}

/**
 * Event type for identify user input.
 */
export type IdentifyEvent =
  | { type: 'select-option'; index: number }
  | { type: 'submit' }
  | { type: 'clear-selection' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/identify.ts IdentifyInput
 */
export interface IdentifyAnswer {
  selectedIndex: number;
}

/**
 * Pure interaction model for identify archetype.
 * Reducer pattern: tracks selection and submission state.
 */
export const identifyModel: InteractionModel<
  IdentifyQuestion,
  IdentifyState,
  IdentifyEvent,
  IdentifyAnswer
> = {
  archetype: 'identify',

  initialize(_question: IdentifyQuestion): IdentifyState {
    return {
      selectedIndex: null,
      isSubmitted: false,
    };
  },

  reduce(state: IdentifyState, event: IdentifyEvent): IdentifyState {
    switch (event.type) {
      case 'select-option': {
        return {
          ...state,
          selectedIndex: event.index,
          isSubmitted: false,
        };
      }
      case 'submit': {
        if (state.selectedIndex === null) return state; // Can't submit without selection
        return {
          ...state,
          isSubmitted: true,
        };
      }
      case 'clear-selection': {
        return {
          ...state,
          selectedIndex: null,
          isSubmitted: false,
        };
      }
      default:
        return state;
    }
  },

  toAnswer(state: IdentifyState): IdentifyAnswer | null {
    if (state.selectedIndex === null || !state.isSubmitted) return null;
    return {
      selectedIndex: state.selectedIndex,
    };
  },

  getA11y(state: IdentifyState): A11yAction[] {
    const actions: A11yAction[] = [
      {
        role: 'button',
        label: 'Submit selection',
        key: 'identify-submit',
        description: 'Submit your selected option',
        enabled: state.selectedIndex !== null,
      },
    ];
    return actions;
  },

  getTestState(state: IdentifyState): Record<string, string | number | boolean> {
    return {
      'selected-index': state.selectedIndex !== null ? state.selectedIndex : 'none',
      'is-submitted': state.isSubmitted,
    };
  },
};
