/**
 * Pure interaction model for benchmark archetype.
 * Student categorizes fraction as closer to 0, 1/2, or 1.
 * per React+PixiJS migration plan §4 + §5.1
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * Curriculum question for benchmark archetype.
 */
export interface BenchmarkQuestion {
  numerator: number;
  denominator: number;
}

/**
 * Internal state for benchmark interaction.
 */
export interface BenchmarkState {
  selectedZone: 'zero' | 'half' | 'one' | null;
  submitted: boolean;
}

/**
 * User input events for benchmark.
 */
export type BenchmarkEvent =
  | { type: 'select-zone'; zone: 'zero' | 'half' | 'one' }
  | { type: 'submit' };

/**
 * Answer payload matching validator contract.
 */
export interface BenchmarkAnswer {
  zone: 'zero' | 'half' | 'one';
}

/**
 * Pure benchmark interaction model.
 */
export const benchmarkModel: InteractionModel<
  BenchmarkQuestion,
  BenchmarkState,
  BenchmarkEvent,
  BenchmarkAnswer
> = {
  archetype: 'benchmark',

  initialize(): BenchmarkState {
    return { selectedZone: null, submitted: false };
  },

  reduce(state: BenchmarkState, event: BenchmarkEvent): BenchmarkState {
    switch (event.type) {
      case 'select-zone':
        return { ...state, selectedZone: event.zone };
      case 'submit':
        return { ...state, submitted: true };
      default:
        return state;
    }
  },

  toAnswer(state: BenchmarkState): BenchmarkAnswer | null {
    if (state.selectedZone === null || !state.submitted) return null;
    return { zone: state.selectedZone };
  },

  getA11y(): A11yAction[] {
    return [
      {
        role: 'radiogroup',
        label: 'Benchmark zone',
        key: 'benchmark-zones',
        description: 'Use arrow keys to select zone, Enter to submit',
      },
    ];
  },

  getTestState(state: BenchmarkState): Record<string, string | number | boolean> {
    return {
      selectedZone: state.selectedZone ?? '',
      submitted: state.submitted,
    };
  },
};
