/**
 * Pure interaction model for label archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * The curriculum question shape for label.
 * Extracted from QuestionTemplate.payload.
 */
export interface LabelQuestion {
  /** Label tiles: id and text */
  labels?: Array<{ id: string; text: string }>;
  /** Regions to label: id and accessibility label */
  regions?: Array<{ id: string; alt?: string }>;
  /** Expected mapping: regionId → labelId */
  expectedLabelForRegion?: Record<string, string>;
  /** Snap distance in pixels for magnetic snap (default 90) */
  snapDistance?: number;
}

/**
 * A single label-to-region mapping.
 */
export interface LabelMapping {
  labelId: string;
  regionId: string;
}

/**
 * Internal model state for label.
 * Tracks which labels are placed on which regions.
 */
export interface LabelState {
  /** Current label placements: labelId → regionId */
  placements: Record<string, string>;
  /** Label currently being dragged, or null */
  draggingLabelId: string | null;
  /** Position of dragging label (x, y) */
  dragPosition: { x: number; y: number } | null;
  /** Whether submission is ready */
  isSubmitted: boolean;
}

/**
 * Event type for label user input.
 */
export type LabelEvent =
  | { type: 'drag-start'; labelId: string; x: number; y: number }
  | { type: 'drag-move'; x: number; y: number }
  | { type: 'drag-end'; x: number; y: number; regionId?: string }
  | { type: 'place-label'; labelId: string; regionId: string }
  | { type: 'submit' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/label.ts LabelInput
 */
export interface LabelAnswer {
  studentMappings: LabelMapping[];
}

/**
 * Pure interaction model for label archetype.
 * Reducer pattern: tracks drag state and label-region placements.
 */
export const labelModel: InteractionModel<LabelQuestion, LabelState, LabelEvent, LabelAnswer> = {
  archetype: 'label',

  initialize(_question: LabelQuestion): LabelState {
    return {
      placements: {},
      draggingLabelId: null,
      dragPosition: null,
      isSubmitted: false,
    };
  },

  reduce(state: LabelState, event: LabelEvent): LabelState {
    switch (event.type) {
      case 'drag-start': {
        return {
          ...state,
          draggingLabelId: event.labelId,
          dragPosition: { x: event.x, y: event.y },
        };
      }
      case 'drag-move': {
        if (state.draggingLabelId === null) return state;
        return {
          ...state,
          dragPosition: { x: event.x, y: event.y },
        };
      }
      case 'drag-end': {
        if (state.draggingLabelId === null) return state;
        // If regionId provided (snapped), place the label
        if (event.regionId !== undefined) {
          return {
            ...state,
            placements: {
              ...state.placements,
              [state.draggingLabelId]: event.regionId,
            },
            draggingLabelId: null,
            dragPosition: null,
          };
        }
        // Otherwise, just clear drag state
        return {
          ...state,
          draggingLabelId: null,
          dragPosition: null,
        };
      }
      case 'place-label': {
        return {
          ...state,
          placements: {
            ...state.placements,
            [event.labelId]: event.regionId,
          },
        };
      }
      case 'submit': {
        return {
          ...state,
          isSubmitted: true,
        };
      }
      default:
        return state;
    }
  },

  toAnswer(state: LabelState): LabelAnswer | null {
    if (!state.isSubmitted) return null;
    const studentMappings: LabelMapping[] = Object.entries(state.placements).map(
      ([labelId, regionId]) => ({
        labelId,
        regionId,
      })
    );
    return {
      studentMappings,
    };
  },

  getA11y(state: LabelState): A11yAction[] {
    return [
      {
        role: 'button',
        label: 'Submit label placements',
        key: 'label-submit',
        description: 'Submit your label-to-region mappings',
        enabled: Object.keys(state.placements).length > 0,
      },
    ];
  },

  getTestState(state: LabelState): Record<string, string | number | boolean> {
    return {
      'placement-count': Object.keys(state.placements).length,
      'is-dragging': state.draggingLabelId !== null,
      'is-submitted': state.isSubmitted,
      placements: JSON.stringify(state.placements),
    };
  },
};
