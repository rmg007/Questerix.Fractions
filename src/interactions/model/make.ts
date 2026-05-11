/**
 * Pure interaction model for make archetype.
 * No React, Phaser, or Pixi imports.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * The curriculum question shape for make.
 * Extracted from QuestionTemplate.payload.
 */
export interface MakeQuestion {
  /** Shape type: 'rectangle' or 'circle' */
  shapeType?: 'rectangle' | 'circle';
  /** Target number of partitions (denominator) */
  targetPartitions?: number;
  /** Number of partitions to shade (numerator) */
  targetNumerator?: number;
  /** Snap mode: 'axis' (snaps to center) or 'free' */
  snapMode?: 'axis' | 'free';
  /** Area tolerance for equal parts (0..1, default 0.05) */
  areaTolerance?: number;
}

/**
 * Internal model state for make.
 * Tracks fold-line position and shaded regions.
 */
export interface MakeState {
  /** Current phase: 'partition' (folding) or 'shade' (shading regions) */
  phase: 'partition' | 'shade';
  /** Fold line position as normalized 0..1 (left to right) */
  foldPosition: number;
  /** Regions shaded: 'left', 'right', or both */
  shadedRegions: string[];
  /** Target number to shade */
  targetShaded?: number;
  /** Left items for snap matching (if applicable) */
  leftItems?: Array<{ id: string; label: string }>;
  /** Right items for snap matching (if applicable) */
  rightItems?: Array<{ id: string; label: string }>;
}

/**
 * Event type for make user input.
 */
export type MakeEvent =
  | { type: 'move-fold-line'; delta: number }
  | { type: 'confirm-fold' }
  | { type: 'toggle-shade'; regionId: string }
  | { type: 'submit' }
  | { type: 'cancel' };

/**
 * Answer payload matching the validator contract.
 * per src/validators/make.ts MakeInput
 */
export interface MakeAnswer {
  numShaded: number;
  numTotal: number;
}

/**
 * Pure interaction model for make archetype.
 * Reducer pattern: tracks partition + shading state.
 */
export const makeModel: InteractionModel<MakeQuestion, MakeState, MakeEvent, MakeAnswer> = {
  archetype: 'make',

  initialize(question: MakeQuestion): MakeState {
    return {
      phase: 'partition',
      foldPosition: 0.5,
      shadedRegions: [],
      targetShaded: question.targetNumerator ?? 1,
      leftItems: [],
      rightItems: [],
    };
  },

  reduce(state: MakeState, event: MakeEvent): MakeState {
    switch (event.type) {
      case 'move-fold-line': {
        const newPos = Math.max(0.1, Math.min(0.9, state.foldPosition + event.delta * 0.01));
        return { ...state, foldPosition: newPos };
      }
      case 'confirm-fold': {
        if (state.phase === 'partition') {
          return { ...state, phase: 'shade', shadedRegions: [] };
        }
        return state;
      }
      case 'toggle-shade': {
        const regionId = event.regionId;
        const newShaded = state.shadedRegions.includes(regionId)
          ? state.shadedRegions.filter((r) => r !== regionId)
          : [...state.shadedRegions, regionId];
        return { ...state, shadedRegions: newShaded };
      }
      case 'submit':
      case 'cancel':
        return state;
      default:
        return state;
    }
  },

  toAnswer(state: MakeState): MakeAnswer | null {
    if (state.phase !== 'shade' || state.shadedRegions.length === 0) {
      return null;
    }
    return {
      numShaded: state.shadedRegions.length,
      numTotal: 2, // Binary fold (left/right)
    };
  },

  getA11y(state: MakeState): A11yAction[] {
    return [
      {
        role: 'slider',
        label: 'Fold line position',
        key: 'fold-slider',
        description: 'Drag to adjust the fold line',
        enabled: state.phase === 'partition',
      },
      {
        role: 'button',
        label: state.phase === 'partition' ? 'Confirm Fold' : 'Submit Answer',
        key: 'action-button',
        enabled: true,
      },
    ];
  },

  getTestState(state: MakeState): Record<string, string | number | boolean> {
    return {
      'current-phase': state.phase,
      'fold-position': Math.round(state.foldPosition * 100),
      'shaded-regions': state.shadedRegions.length,
      'is-complete': state.phase === 'shade' && state.shadedRegions.length > 0,
    };
  },
};
