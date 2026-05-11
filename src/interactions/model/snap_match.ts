/**
 * Pure interaction model for snap_match archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * A single match item (left or right column).
 */
export interface MatchItem {
  id: string;
  label: string;
  numerator?: number;
  denominator?: number;
}

/**
 * A completed pair: leftId → rightId.
 */
export interface MatchPair {
  leftId: string;
  rightId: string;
}

/**
 * The curriculum question shape for snap_match.
 * Extracted from QuestionTemplate.payload.
 */
export interface SnapMatchQuestion {
  /** Left column items (to be dragged) */
  leftItems?: MatchItem[];
  /** Right column items (targets) */
  rightItems?: MatchItem[];
  /** Expected pairs: [[leftId, rightId], ...] */
  expectedPairs?: [string, string][];
  /** Snap distance in pixels (default 90) */
  snapDistance?: number;
}

/**
 * Internal model state for snap_match.
 * Tracks matched pairs and drag state.
 */
export interface SnapMatchState {
  /** Completed pairs */
  matchedPairs: MatchPair[];
  /** Currently dragging item ID */
  draggingItemId: string | undefined;
  /** Whether submitted */
  isSubmitted: boolean;
  /** Left items (cache) */
  leftItems: MatchItem[] | undefined;
  /** Right items (cache) */
  rightItems: MatchItem[] | undefined;
}

/**
 * Event type for snap_match user input.
 */
export type SnapMatchEvent =
  | { type: 'match-pair'; leftId: string; rightId: string }
  | { type: 'unmatch-pair'; leftId: string }
  | { type: 'submit' }
  | { type: 'clear' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/snap_match.ts SnapMatchInput
 */
export interface SnapMatchAnswer {
  studentPairs: [string, string][];
}

/**
 * Pure interaction model for snap_match archetype.
 * Reducer pattern: tracks matched pairs.
 */
export const snapMatchModel: InteractionModel<
  SnapMatchQuestion,
  SnapMatchState,
  SnapMatchEvent,
  SnapMatchAnswer
> = {
  archetype: 'snap_match',

  initialize(question: SnapMatchQuestion): SnapMatchState {
    return {
      matchedPairs: [],
      draggingItemId: undefined,
      isSubmitted: false,
      leftItems: question.leftItems,
      rightItems: question.rightItems,
    };
  },

  reduce(state: SnapMatchState, event: SnapMatchEvent): SnapMatchState {
    switch (event.type) {
      case 'match-pair': {
        // Check if left item already matched
        const existing = state.matchedPairs.find((p) => p.leftId === event.leftId);
        if (existing) {
          // Replace existing match
          return {
            ...state,
            matchedPairs: state.matchedPairs
              .filter((p) => p.leftId !== event.leftId)
              .concat({ leftId: event.leftId, rightId: event.rightId }),
          };
        }
        // Add new pair
        return {
          ...state,
          matchedPairs: [...state.matchedPairs, { leftId: event.leftId, rightId: event.rightId }],
        };
      }
      case 'unmatch-pair': {
        return {
          ...state,
          matchedPairs: state.matchedPairs.filter((p) => p.leftId !== event.leftId),
        };
      }
      case 'submit':
        return { ...state, isSubmitted: true };
      case 'clear':
        return { ...state, matchedPairs: [], isSubmitted: false };
      default:
        return state;
    }
  },

  toAnswer(state: SnapMatchState): SnapMatchAnswer | null {
    if (state.matchedPairs.length === 0) {
      return null;
    }
    return {
      studentPairs: state.matchedPairs.map((p) => [p.leftId, p.rightId]),
    };
  },

  getA11y(state: SnapMatchState): A11yAction[] {
    return [
      {
        role: 'button',
        label: 'Drag items to match',
        key: 'drag-instruction',
        description: 'Drag items from left column to match with right column',
        enabled: true,
      },
      {
        role: 'button',
        label: 'Submit matches',
        key: 'submit-button',
        enabled: state.matchedPairs.length > 0,
      },
    ];
  },

  getTestState(state: SnapMatchState): Record<string, string | number | boolean> {
    return {
      'matched-count': state.matchedPairs.length,
      'is-submitted': state.isSubmitted,
      'matched-pairs': JSON.stringify(state.matchedPairs),
    };
  },
};
