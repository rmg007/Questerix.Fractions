/**
 * Test utilities for interaction models.
 * Helpers to run model unit tests without Playwright or browser APIs.
 * per React+PixiJS migration plan §4
 */

import type { InteractionModel, A11yAction } from './types';

/**
 * Simulate a sequence of events and return final state.
 * Useful for test setup: apply a series of user inputs and snapshot the result.
 */
export function applyEvents<TQuestion, TState, TEvent, TAnswer>(
  model: InteractionModel<TQuestion, TState, TEvent, TAnswer>,
  question: TQuestion,
  events: TEvent[]
): TState {
  let state = model.initialize(question);
  for (const event of events) {
    state = model.reduce(state, event);
  }
  return state;
}

/**
 * Assert that a model reaches an answered state.
 * Throws if toAnswer() returns null.
 */
export function expectAnswered<TQuestion, TState, TEvent, TAnswer>(
  model: InteractionModel<TQuestion, TState, TEvent, TAnswer>,
  state: TState
): TAnswer {
  const answer = model.toAnswer(state);
  if (!answer) throw new Error('Expected state to produce an answer, but got null');
  return answer;
}

/**
 * Assert that a model is unanswered.
 * Throws if toAnswer() returns a non-null answer.
 */
export function expectUnanswered<TQuestion, TState, TEvent, TAnswer>(
  model: InteractionModel<TQuestion, TState, TEvent, TAnswer>,
  state: TState
): void {
  const answer = model.toAnswer(state);
  if (answer !== null)
    throw new Error(`Expected state to be unanswered, but got answer: ${JSON.stringify(answer)}`);
}

/**
 * Find an accessible action by key.
 * Returns the action or throws if not found.
 */
export function findAction(actions: A11yAction[], key: string): A11yAction {
  const action = actions.find((a) => a.key === key);
  if (!action)
    throw new Error(
      `Action not found: "${key}". Available: ${actions.map((a) => a.key).join(', ')}`
    );
  return action;
}

/**
 * Assert that a specific action is available.
 * Throws if the action is not in the list or is disabled.
 */
export function expectActionEnabled(actions: A11yAction[], key: string): void {
  const action = findAction(actions, key);
  if (action.enabled === false)
    throw new Error(`Expected action "${key}" to be enabled, but it was disabled`);
}

/**
 * Assert that a specific action is disabled.
 */
export function expectActionDisabled(actions: A11yAction[], key: string): void {
  const action = findAction(actions, key);
  if (action.enabled !== false)
    throw new Error(`Expected action "${key}" to be disabled, but it was enabled`);
}

/**
 * Helper: convert test state record to an object for snapshot or assertion.
 * Useful for comparing model state in tests.
 */
export function snapshotTestState<TQuestion, TState, TEvent, TAnswer>(
  model: InteractionModel<TQuestion, TState, TEvent, TAnswer>,
  state: TState
): Record<string, string | number | boolean> {
  return model.getTestState(state);
}
