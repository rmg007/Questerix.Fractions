/**
 * Pure interaction model for partition archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * The curriculum question shape for partition.
 * Extracted from QuestionTemplate.payload.
 */
export interface PartitionQuestion {
  /** Target number of equal parts (2, 3, or 4) */
  targetPartitions: number;
  /** Shape type: 'rectangle' | 'circle' | 'chocolate_bar' */
  shapeType?: 'rectangle' | 'circle' | 'chocolate_bar';
  /** Snap mode: 'axis' (easy) | 'free' (medium/hard) */
  snapMode?: 'axis' | 'free';
  /** Relative area tolerance threshold (e.g. 0.05) */
  areaTolerance?: number;
}

/**
 * Internal model state for partition.
 * Tracks the divider position and whether submission is ready.
 */
export interface PartitionState {
  /** Divider position as X coordinate (pixel), or null if not initialized */
  dividerX: number | null;
  /** Whether the student has made a commitment (pointerup/dragend) */
  isCommitted: boolean;
  /** Computed region areas from divider position */
  regionAreas: number[];
}

/**
 * Event type for partition user input.
 */
export type PartitionEvent =
  | { type: 'drag-start'; x: number }
  | { type: 'drag-move'; x: number }
  | { type: 'drag-end'; x: number }
  | { type: 'submit' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/partition.ts PartitionInput
 */
export interface PartitionAnswer {
  regionAreas: number[];
}

/**
 * Pure interaction model for partition archetype.
 * Reducer pattern: tracks divider position and computes region areas.
 */
export const partitionModel: InteractionModel<
  PartitionQuestion,
  PartitionState,
  PartitionEvent,
  PartitionAnswer
> = {
  archetype: 'partition',

  initialize(_question: PartitionQuestion): PartitionState {
    return {
      dividerX: null,
      isCommitted: false,
      regionAreas: [],
    };
  },

  reduce(state: PartitionState, event: PartitionEvent): PartitionState {
    switch (event.type) {
      case 'drag-start':
      case 'drag-move': {
        // Update divider position; compute areas from current position
        // Areas are computed as relative widths assuming fixed shape width
        const dividerX = event.x;
        // Placeholder area computation: will be updated by renderer with real geometry
        const regionAreas = [dividerX, 1 - dividerX]; // Normalized to 0..1
        return {
          ...state,
          dividerX,
          regionAreas,
          isCommitted: false,
        };
      }
      case 'drag-end': {
        return {
          ...state,
          dividerX: event.x,
          isCommitted: true,
        };
      }
      case 'submit': {
        return {
          ...state,
          isCommitted: true,
        };
      }
      default:
        return state;
    }
  },

  toAnswer(state: PartitionState): PartitionAnswer | null {
    if (!state.isCommitted || state.dividerX === null) return null;
    return {
      regionAreas: state.regionAreas,
    };
  },

  getA11y(state: PartitionState): A11yAction[] {
    return [
      {
        role: 'slider',
        label: 'Partition divider',
        key: 'divider-slider',
        description: 'Drag to divide the shape into equal parts',
        enabled: true,
      },
      {
        role: 'button',
        label: 'Submit partition',
        key: 'partition-submit',
        description: 'Submit your partition answer',
        enabled: state.dividerX !== null,
      },
    ];
  },

  getTestState(state: PartitionState): Record<string, string | number | boolean> {
    return {
      'divider-position': state.dividerX !== null ? Math.round(state.dividerX) : 'unset',
      'is-committed': state.isCommitted,
      'region-count': state.regionAreas.length,
    };
  },
};
