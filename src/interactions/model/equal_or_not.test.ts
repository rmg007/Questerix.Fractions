/**
 * Unit tests for equal_or_not interaction model.
 * Tests pure reducer logic without Phaser, Pixi, or React.
 * Covers: initialization, selection, answer extraction, a11y, test state.
 */

import { describe, it, expect } from 'vitest';
import {
  equalOrNotModel,
  type EqualOrNotQuestion,
  type EqualOrNotEvent,
} from '@/interactions/model';
import {
  applyEvents,
  expectAnswered,
  expectUnanswered,
  expectActionEnabled,
  findAction,
  snapshotTestState,
} from '@/interactions/model/testHarness';

// ──────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────

const questionEqual: EqualOrNotQuestion = {
  leftFraction: { numerator: 2, denominator: 4 },
  rightFraction: { numerator: 1, denominator: 2 },
  correctAnswer: true, // 2/4 = 1/2
};

const questionNotEqual: EqualOrNotQuestion = {
  leftFraction: { numerator: 1, denominator: 3 },
  rightFraction: { numerator: 1, denominator: 4 },
  correctAnswer: false, // 1/3 ≠ 1/4
};

// ──────────────────────────────────────────────────────────────────────────
// Initialization
// ──────────────────────────────────────────────────────────────────────────

describe('equalOrNotModel.initialize', () => {
  it('returns unanswered state', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    expect(state.selectedChoice).toBeNull();
  });

  it('initializes consistently regardless of question', () => {
    const state1 = equalOrNotModel.initialize(questionEqual);
    const state2 = equalOrNotModel.initialize(questionNotEqual);
    expect(state1).toEqual(state2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Reducer: Selection
// ──────────────────────────────────────────────────────────────────────────

describe('equalOrNotModel.reduce — select-equal', () => {
  it('sets selectedChoice to "equal"', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const nextState = equalOrNotModel.reduce(state, { type: 'select-equal' });
    expect(nextState.selectedChoice).toBe('equal');
  });

  it('is idempotent', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const state1 = equalOrNotModel.reduce(state, { type: 'select-equal' });
    const state2 = equalOrNotModel.reduce(state1, { type: 'select-equal' });
    expect(state1).toEqual(state2);
  });

  it('does not mutate input state', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const originalSelection = state.selectedChoice;
    equalOrNotModel.reduce(state, { type: 'select-equal' });
    expect(state.selectedChoice).toBe(originalSelection);
  });
});

describe('equalOrNotModel.reduce — select-not-equal', () => {
  it('sets selectedChoice to "not_equal"', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const nextState = equalOrNotModel.reduce(state, { type: 'select-not-equal' });
    expect(nextState.selectedChoice).toBe('not_equal');
  });

  it('overwrites previous selection', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const state1 = equalOrNotModel.reduce(state, { type: 'select-equal' });
    const state2 = equalOrNotModel.reduce(state1, { type: 'select-not-equal' });
    expect(state2.selectedChoice).toBe('not_equal');
  });
});

describe('equalOrNotModel.reduce — clear-selection', () => {
  it('resets selectedChoice to null', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const state1 = equalOrNotModel.reduce(state, { type: 'select-equal' });
    const state2 = equalOrNotModel.reduce(state1, { type: 'clear-selection' });
    expect(state2.selectedChoice).toBeNull();
  });

  it('has no effect on already-unselected state', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const nextState = equalOrNotModel.reduce(state, { type: 'clear-selection' });
    expect(nextState.selectedChoice).toBeNull();
  });
});

describe('equalOrNotModel.reduce — unknown event', () => {
  it('returns state unchanged', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const nextState = equalOrNotModel.reduce(state, {
      type: 'unknown-event',
    } as unknown as EqualOrNotEvent);
    expect(nextState).toEqual(state);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Answer Extraction
// ──────────────────────────────────────────────────────────────────────────

describe('equalOrNotModel.toAnswer', () => {
  it('returns null when unanswered', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const answer = equalOrNotModel.toAnswer(state);
    expect(answer).toBeNull();
  });

  it('returns studentAnswer=true when "equal" selected', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const state1 = equalOrNotModel.reduce(state, { type: 'select-equal' });
    const answer = expectAnswered(equalOrNotModel, state1);
    expect(answer.studentAnswer).toBe(true);
  });

  it('returns studentAnswer=false when "not_equal" selected', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const state1 = equalOrNotModel.reduce(state, { type: 'select-not-equal' });
    const answer = expectAnswered(equalOrNotModel, state1);
    expect(answer.studentAnswer).toBe(false);
  });

  it('produces a payload matching validator contract', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-equal' }]);
    const answer = equalOrNotModel.toAnswer(state);
    expect(answer).toHaveProperty('studentAnswer');
    expect(typeof answer?.studentAnswer).toBe('boolean');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Accessibility Actions
// ──────────────────────────────────────────────────────────────────────────

describe('equalOrNotModel.getA11y', () => {
  it('returns two actions', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const actions = equalOrNotModel.getA11y(state);
    expect(actions).toHaveLength(2);
  });

  it('includes "equal" button action', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const actions = equalOrNotModel.getA11y(state);
    const action = findAction(actions, 'button-equal');
    expect(action.role).toBe('button');
    expect(action.label).toBe('Equal');
  });

  it('includes "not_equal" button action', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const actions = equalOrNotModel.getA11y(state);
    const action = findAction(actions, 'button-not-equal');
    expect(action.role).toBe('button');
    expect(action.label).toBe('Not Equal');
  });

  it('both actions are enabled', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const actions = equalOrNotModel.getA11y(state);
    expectActionEnabled(actions, 'button-equal');
    expectActionEnabled(actions, 'button-not-equal');
  });

  it('actions are available regardless of selection state', () => {
    const state1 = equalOrNotModel.initialize(questionEqual);
    const state2 = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-equal' }]);
    const state3 = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-not-equal' }]);

    for (const state of [state1, state2, state3]) {
      const actions = equalOrNotModel.getA11y(state);
      expect(actions).toHaveLength(2);
      expectActionEnabled(actions, 'button-equal');
      expectActionEnabled(actions, 'button-not-equal');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Test State (for Playwright)
// ──────────────────────────────────────────────────────────────────────────

describe('equalOrNotModel.getTestState', () => {
  it('returns an object', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState).toBeInstanceOf(Object);
  });

  it('includes "selected-choice" key', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState).toHaveProperty('selected-choice');
  });

  it('includes "is-answered" key', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState).toHaveProperty('is-answered');
  });

  it('reports "none" when unanswered', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState['selected-choice']).toBe('none');
    expect(testState['is-answered']).toBe(false);
  });

  it('reports "equal" when equal selected', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-equal' }]);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState['selected-choice']).toBe('equal');
    expect(testState['is-answered']).toBe(true);
  });

  it('reports "not_equal" when not_equal selected', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-not-equal' }]);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState['selected-choice']).toBe('not_equal');
    expect(testState['is-answered']).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Integration: Test Harness Utilities
// ──────────────────────────────────────────────────────────────────────────

describe('applyEvents', () => {
  it('applies a sequence of events', () => {
    const events: EqualOrNotEvent[] = [
      { type: 'select-equal' },
      { type: 'select-not-equal' },
      { type: 'select-equal' },
    ];
    const state = applyEvents(equalOrNotModel, questionEqual, events);
    expect(state.selectedChoice).toBe('equal');
  });

  it('works with empty event list', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, []);
    expectUnanswered(equalOrNotModel, state);
  });
});

describe('expectAnswered / expectUnanswered', () => {
  it('expectAnswered throws when state is unanswered', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    expect(() => expectAnswered(equalOrNotModel, state)).toThrow();
  });

  it('expectAnswered returns answer when state is answered', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-equal' }]);
    const answer = expectAnswered(equalOrNotModel, state);
    expect(answer.studentAnswer).toBe(true);
  });

  it('expectUnanswered throws when state is answered', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-equal' }]);
    expect(() => expectUnanswered(equalOrNotModel, state)).toThrow();
  });

  it('expectUnanswered succeeds when state is unanswered', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    expect(() => expectUnanswered(equalOrNotModel, state)).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Workflow Scenarios
// ──────────────────────────────────────────────────────────────────────────

describe('realistic workflow', () => {
  it('supports full answer journey: select → answer', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    expectUnanswered(equalOrNotModel, state);

    const state1 = equalOrNotModel.reduce(state, { type: 'select-equal' });
    const answer = expectAnswered(equalOrNotModel, state1);

    expect(answer.studentAnswer).toBe(true);
  });

  it('supports changing mind before submission', () => {
    const state = equalOrNotModel.initialize(questionEqual);
    const state1 = equalOrNotModel.reduce(state, { type: 'select-equal' });
    const state2 = equalOrNotModel.reduce(state1, { type: 'select-not-equal' });

    const answer = expectAnswered(equalOrNotModel, state2);
    expect(answer.studentAnswer).toBe(false);
  });

  it('supports clearing and re-answering', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [
      { type: 'select-equal' },
      { type: 'clear-selection' },
      { type: 'select-not-equal' },
    ]);

    expectAnswered(equalOrNotModel, state);
    const testState = equalOrNotModel.getTestState(state);
    expect(testState['selected-choice']).toBe('not_equal');
  });

  it('test state snapshots are deterministic', () => {
    const state = applyEvents(equalOrNotModel, questionEqual, [{ type: 'select-equal' }]);
    const snap1 = snapshotTestState(equalOrNotModel, state);
    const snap2 = snapshotTestState(equalOrNotModel, state);

    expect(snap1).toEqual(snap2);
  });
});
