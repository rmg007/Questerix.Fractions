/**
 * Framework-neutral interaction model contract.
 * Each archetype implements this interface to decouple logic from rendering.
 * per React+PixiJS migration plan §4 (InteractionModel Contract)
 */

import type { ArchetypeId } from '@/types';

/**
 * Keyboard or accessibility action that the DOM should expose.
 * Used for keyboard alternatives to pointer/drag interactions.
 */
export interface A11yAction {
  /** e.g. 'button', 'radio', 'slider', 'spinbutton' */
  role: string;
  /** Human-readable label for the action */
  label: string;
  /** Unique key for Playwright assertions and event dispatch */
  key: string;
  /** Optional description for screen readers */
  description?: string;
  /** Whether this action is currently enabled */
  enabled?: boolean;
}

/**
 * Framework-neutral interaction model.
 * TQuestion: the curriculum question shape (varies per archetype)
 * TState: internal model state (immutable reducer pattern)
 * TEvent: user input events (pointer, keyboard, etc.)
 * TAnswer: the answer payload submitted to the validator
 *
 * Properties:
 * - No React, Phaser, or Pixi imports
 * - Deterministic: same input → same output, always
 * - Testable: unit tests run without browser/canvas APIs
 * - Answerized: toAnswer() produces a payload matching the validator contract
 * - Accessible: getA11y() exposes keyboard alternatives
 */
export interface InteractionModel<TQuestion, TState, TEvent, TAnswer> {
  readonly archetype: ArchetypeId;

  /**
   * Initialize model state from a curriculum question.
   * Called once when the question is loaded.
   */
  initialize(question: TQuestion): TState;

  /**
   * Reducer: apply an event to state and return new state.
   * Immutable: never mutate input state.
   */
  reduce(state: TState, event: TEvent): TState;

  /**
   * Extract a complete answer from state.
   * Returns null if state is incomplete or unanswered.
   */
  toAnswer(state: TState): TAnswer | null;

  /**
   * Expose keyboard/accessibility actions for this state.
   * Used by the DOM action layer to wire keyboard alternatives.
   * Return empty array if no actions are currently active.
   */
  getA11y(state: TState): A11yAction[];

  /**
   * Extract test-state for Playwright assertions.
   * Keys/values should be human-readable and stable (not random IDs).
   * Example: { 'selected-left': 'true', 'selected-right': 'false' }
   */
  getTestState(state: TState): Record<string, string | number | boolean>;
}

/**
 * Event types that feed the reducer.
 * Extend this union per archetype.
 */
export type InteractionEvent = { type: string; [key: string]: unknown };

/**
 * Answer payload for a given archetype.
 * Must match the validator's TInput shape.
 */
export type ArchetypeAnswer<T extends ArchetypeId> = T extends 'equal_or_not'
  ? { studentAnswer: boolean }
  : T extends 'identify'
    ? { selectedId: string }
    : T extends 'label'
      ? { mapping: Record<string, string> }
      : T extends 'make'
        ? { numShaded: number; numTotal: number }
        : T extends 'partition'
          ? { partitionLines: number[] }
          : T extends 'compare'
            ? { relation: 'less' | 'equal' | 'greater' }
            : T extends 'benchmark'
              ? { categorized: Record<string, string[]> }
              : T extends 'snap_match'
                ? { pairs: Array<[string, string]> }
                : T extends 'placement'
                  ? { position: number }
                  : T extends 'order'
                    ? { sequence: string[] }
                    : T extends 'explain_your_order'
                      ? { explanation: string; order: string[] }
                      : never;
