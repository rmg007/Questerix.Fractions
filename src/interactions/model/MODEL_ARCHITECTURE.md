# Interaction Model Architecture

**Per Phase 4 of the React+PixiJS migration plan.**

## Overview

The interaction model layer is **framework-neutral**: no React, no Phaser, no Pixi, no DOM. It is a pure TypeScript layer that encapsulates the logic of a single archetype interaction.

Each model is tested in isolation via Vitest (no browser). Models are then consumed by both renderers (Pixi visual + DOM action layer) and tests (Playwright E2E).

## Contracts

### `InteractionModel<TQuestion, TState, TEvent, TAnswer>`

The core interface that every archetype implements:

```ts
interface InteractionModel<TQuestion, TState, TEvent, TAnswer> {
  readonly archetype: ArchetypeId;
  initialize(question: TQuestion): TState;
  reduce(state: TState, event: TEvent): TState;
  toAnswer(state: TState): TAnswer | null;
  getA11y(state: TState): A11yAction[];
  getTestState(state: TState): Record<string, string | number | boolean>;
}
```

**Properties:**

- `archetype` — identifies the archetype (immutable).
- `initialize(question)` — boot the model with a curriculum question. Called once when the level loads.
- `reduce(state, event)` — apply a user input event and return new state. Immutable reducer (never mutate input state).
- `toAnswer(state)` — extract a complete answer, or null if incomplete. The answer shape matches the validator contract.
- `getA11y(state)` — expose keyboard/accessibility actions available in this state. Used by the DOM action layer.
- `getTestState(state)` — emit test metadata for Playwright assertions (e.g., `{ 'selected-choice': 'equal', 'is-answered': true }`).

### Answer Payload Contract

The answer returned by `toAnswer()` must match the validator's `TInput` shape. For example:

**equal_or_not:**

```ts
// validator contract
export interface EqualOrNotInput {
  studentAnswer: boolean;
}

// model toAnswer() must return { studentAnswer: boolean } or null
```

**identify:**

```ts
// validator contract
export interface IdentifyInput {
  selectedId: string;
}

// model toAnswer() must return { selectedId: string } or null
```

## Event Flow

### Input → State → Output

```
User pointer/keyboard input
  ↓
Renderer/DOM action layer converts to TEvent
  ↓
model.reduce(state, event) → new state
  ↓
Renderer consumes new state and re-renders
  ↓
When complete: model.toAnswer(state) → answer
  ↓
Engine submits answer to validator
```

### Event → Reducer Mapping

Events are defined per archetype as a union type. The reducer is a pure switch statement:

**equal_or_not example:**

```ts
export type EqualOrNotEvent =
  | { type: 'select-equal' }
  | { type: 'select-not-equal' }
  | { type: 'clear-selection' };

reduce(state: EqualOrNotState, event: EqualOrNotEvent): EqualOrNotState {
  switch (event.type) {
    case 'select-equal':
      return { selectedChoice: 'equal' };
    case 'select-not-equal':
      return { selectedChoice: 'not_equal' };
    case 'clear-selection':
      return { selectedChoice: null };
    default:
      return state;
  }
}
```

## Accessibility Actions

Every model exposes a list of `A11yAction[]` for each state. This allows the DOM action layer to wire keyboard alternatives.

```ts
interface A11yAction {
  role: string; // 'button', 'radio', 'slider', 'spinbutton', etc.
  label: string; // human-readable
  key: string; // unique identifier for event dispatch
  description?: string; // optional screen-reader hint
  enabled?: boolean; // whether this action is currently clickable
}
```

**equal_or_not example:**

```ts
getA11y(state: EqualOrNotState): A11yAction[] {
  return [
    {
      role: 'button',
      label: 'Equal',
      key: 'button-equal',
      description: 'These fractions are equal in area',
      enabled: true,
    },
    {
      role: 'button',
      label: 'Not Equal',
      key: 'button-not-equal',
      description: 'These fractions are not equal in area',
      enabled: true,
    },
  ];
}
```

The DOM action layer:

1. Reads the actions from `getA11y()`.
2. Creates focusable `<button>` elements with the labels and descriptions.
3. Wires keyboard event listeners that dispatch `{ type: 'select-equal' }` events to the reducer.
4. Uses the key for Playwright assertions (e.g., `await page.click('[data-test-key="button-equal"]')`).

## Test State (Playwright)

`getTestState()` emits stable, human-readable metadata for Playwright assertions. This is **not** arbitrary debug info — it's part of the test contract.

**equal_or_not example:**

```ts
getTestState(state: EqualOrNotState): Record<string, string | number | boolean> {
  return {
    'selected-choice': state.selectedChoice || 'none',
    'is-answered': state.selectedChoice !== null,
  };
}

// Playwright assertion example:
const testState = await page.locator('[data-test-state]').getAttribute('data-test-state');
expect(testState).toContain('is-answered: true');
```

**Naming conventions:**

- Use kebab-case keys (`selected-choice`, not `selectedChoice`).
- Use simple string/number/boolean values (no objects or arrays).
- Keys should be stable (not random IDs or timestamps).
- Return only values that matter for assertions (not every internal field).

## Testing Strategy

### Unit Tests (Vitest)

Test the model in isolation using `testHarness.ts` utilities:

```ts
import { equalOrNotModel, applyEvents, expectAnswered } from '@/interactions/model';

describe('equal_or_not reducer', () => {
  const question = {
    leftFraction: { numerator: 2, denominator: 4 },
    rightFraction: { numerator: 1, denominator: 2 },
    correctAnswer: true,
  };

  it('selects equal when user taps equal button', () => {
    const state = applyEvents(equalOrNotModel, question, [{ type: 'select-equal' }]);
    const answer = expectAnswered(equalOrNotModel, state);
    expect(answer.studentAnswer).toBe(true);
  });
});
```

### E2E Tests (Playwright)

Test the full flow: question load → renderer display → user interaction → answer submission.

```ts
test('equal_or_not: correct answer', async ({ page }) => {
  // Load level
  await page.goto('/level/1');
  await page.waitForSelector('[data-archetype="equal_or_not"]');

  // User selects "Equal"
  await page.click('[data-test-key="button-equal"]');

  // Assert renderer shows selection
  const testState = await page.locator('[data-test-state]').getAttribute('data-test-state');
  expect(testState).toContain('is-answered: true');

  // Submit and verify progression
  await page.click('[data-test-key="submit"]');
  await page.waitForSelector('[data-progression-updated]');
});
```

## Archetype Checklist

Every archetype model must have:

- [ ] `TQuestion` interface (extracted from curriculum question).
- [ ] `TState` interface (immutable state shape).
- [ ] `TEvent` union type (all possible user inputs).
- [ ] `TAnswer` interface matching validator contract.
- [ ] `InteractionModel` implementation with all five methods.
- [ ] Unit tests covering: initialization, reducer, answer extraction, a11y, test state.
- [ ] Test fixtures for correct, incorrect, edge, and assisted/hint cases.
- [ ] Vitest all-green before renderer work starts.

## Iterating on Models

If a model test fails, **fix it in the model**, not by changing the validator or test harness. The model is the source of truth for interaction logic.

If a test reveals a misconception in the original validator, document it and file a separate fix — do not change the model to match a broken validator.

## Anti-Patterns

❌ **Do NOT:**

- Import React, Phaser, Pixi, or any DOM APIs.
- Call `Math.random()` or `Date.now()` directly (route through `src/engine/ports.ts` if needed).
- Mutate input state in the reducer.
- Return `undefined` from `toAnswer()` instead of `null`.
- Hardcode correct/incorrect logic (leave that to validators).
- Emit answer payloads that don't match the validator contract.

✅ **Do:**

- Keep the model pure and deterministic.
- Test without a browser.
- Document event types with JSDoc.
- Use the test harness for common assertions.
- Snapshot test state keys for regression detection.
