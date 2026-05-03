---
title: Questerix Fractions — Full-Spectrum Fix, Harden & Enhance
date: 2026-05-03
status: planning
phases: 14
estimated_duration: 60–90 hours
related: ../docs/00-foundation/constraints.md, ../CLAUDE.md
---

# Questerix Fractions — Full-Spectrum Fix, Harden & Enhance Pass

**Objective:** Execute a comprehensive hardening, correctness, and accessibility audit across all 14 layers of the Questerix Fractions codebase, resulting in zero TypeScript errors, zero constraint violations, zero test failures, and zero accessibility defects.

**Scope:** All source code (`src/`), test suites, curriculum pipeline, and persistence layer. Excludes archived work in `_archive/`.

**Constraints:** C1–C10 are locked. No backend, no teacher UI, no Grade 3+ content, no tech stack changes, no localStorage beyond lastUsedStudentId, flat + bright visuals, responsive 360–1024px, linear denominator progression, sessions ≤15 min, validation goal.

---

## Phase Overview

Each phase is a self-contained group of changes with explicit commit boundaries. After each phase:

1. Run `npm run typecheck` → must be 0 errors
2. Run `npm run lint` → must be 0 warnings
3. Run `npm run test:unit` → all pass
4. Run `npm run test:e2e` → all pass (where applicable)
5. Commit with message: `fix(phase-N): <description> (PLANS/claude.full.md)`

---

## Phase 1 — TypeScript Hardening

**Goal:** Zero `any` types, zero `@ts-ignore` without justification, all IDs branded.

**Work:**

### 1.1 Remove All `any` Types
- Search `src/**/*.ts` for `any` (excluding test `.d.ts` files)
- For each `any`, determine the narrowest correct type:
  - Function return types: examine return statements and infer union or intersection
  - Function parameters: examine call sites and infer from callers
  - Object properties: check all assignments and infer object shape
  - If multiple branches suggest different types, use a discriminated union or `type A | type B`
- Create local interfaces for frequently-repeated object shapes (e.g., `HintContext`, `QuestionStats`)
- No type-widening shortcuts (e.g., `Record<string, any>` → `Record<string, SomeKnownType | SomeOtherType>`)

**Audit targets:**
- `src/scenes/**/*.ts` — scene types, user input handlers
- `src/engine/**/*.ts` — BKT inputs, router paths, selection return types
- `src/components/**/*.ts` — GameObject props, callbacks
- `src/persistence/**/*.ts` — Dexie schema, repository methods
- `src/validators/**/*.ts` — input/output shapes
- `src/lib/**/*.ts` — utility return types

### 1.2 Replace All Bare String IDs with Branded Types
- Search for all identifier use: `StudentId`, `SessionId`, `LevelId`, `AttemptId`, `QuestionId`, `HintEventId`
- Replace patterns:
  - `const studentId: string = …` → `const studentId: StudentId = StudentId(…)`
  - `function foo(id: string)` → `function foo(id: StudentId)`
  - `db.students.get(id)` where `id` is untyped → assert it's a `StudentId` or refactor caller
  - Template parameter types: `Array<string>` where the strings are IDs → `Array<StudentId>`
- Verify constructor side-effect safety: `StudentId(uuid)` must be pure and idempotent

**Audit targets:**
- `src/scenes/**/*.ts` — currentStudentId, currentSessionId references
- `src/persistence/**/*.ts` — all repository method signatures
- `src/engine/**/*.ts` — currentLevel, misconceptionMap keys
- Event handlers and log context objects

### 1.3 Resolve All `@ts-ignore` Comments
- Search for every `@ts-ignore` or `@ts-expect-error`
- For each, decide: (a) fix the underlying type error, or (b) keep the suppression with a detailed comment
- Acceptable reasons for suppression:
  - Phaser's public API uses incorrect or overly-broad types (document the Phaser version and issue if known)
  - Third-party type definitions are wrong (cite the package name and version)
  - Legitimate type-system limitation (explain the limitation, not just "ignore")
- Unacceptable suppressions (fix them): silencing error because the type is inconvenient, hiding real bugs, deferring refactoring

**Audit targets:**
- Every `@ts-ignore` comment in `src/`
- Every `as unknown as` cast or `as Type` type assertion — replace with proper typing or suppression

### 1.4 Run Typecheck to Zero
```bash
npm run typecheck
```
Expected outcome: `Found 0 errors in 0 files.`

If errors remain after 1.1–1.3:
- Print the error message exactly
- Determine the root cause (missing type export, circular import, constraint violation)
- Fix the root cause, not the error site

---

## Phase 2 — Engine Correctness

**Goal:** BKT, router, selection, and determinism-critical paths are bulletproof.

### 2.1 BKT Probability Clamping & NaN Guards
**File:** `src/engine/bkt.ts`

After every probability update (guess, slip, transit):
```typescript
// After each update step:
P_L = Math.max(0, Math.min(1, P_L));  // clamp to [0, 1]
P_C = Math.max(0, Math.min(1, P_C));  // clamp to [0, 1]
```

Add input validation before any calculation:
```typescript
if (isNaN(pL) || !isFinite(pL) || isNaN(pC) || !isFinite(pC)) {
  throw new Error(
    `BKT.update() received invalid input: pL=${pL}, pC=${pC}. ` +
    `Expected finite numbers in [0, 1].`
  );
}
```

Guard against all-correct and all-wrong streaks:
```typescript
// If all answers correct for > N questions, P_L converges to near-1
// If all answers wrong for > N questions, P_L converges to near-0
// Both are valid; just ensure no NaN propagates
```

Add unit tests in `tests/engine/bkt.test.ts`:
- `P_L = 0, P_C = 0, correct = true` → output bounded and sensible
- `P_L = 1, P_C = 1, correct = false` → output bounded and sensible
- `P_L = 0.5, P_C = 0.5, streak of 10 correct` → P_L should approach 1, not exceed it
- `P_L = 0.5, P_C = 0.5, streak of 10 wrong` → P_L should approach 0, not drop below it
- Input: `NaN`, `Infinity`, `-1`, `1.5` → throw descriptive error for each

### 2.2 Router Level Bounds Guards
**File:** `src/engine/router.ts`

Add explicit assertions:
```typescript
// Regress path:
if (currentLevel > 1) {
  nextLevel = currentLevel - 1;
} else {
  // Cannot go below Level 1. Log and stay at Level 1.
  log.warn(`Router.regress() called at Level 1. Staying at Level 1.`);
  nextLevel = 1;
}

// Promote path:
if (currentLevel < 9) {
  nextLevel = currentLevel + 1;
} else {
  // Cannot go above Level 9. Log and stay at Level 9.
  log.warn(`Router.promote() called at Level 9. Staying at Level 9.`);
  nextLevel = 9;
}
```

Add unit tests in `tests/engine/router.test.ts`:
- `currentLevel = 1, regress()` → stays at 1, does not throw
- `currentLevel = 9, promote()` → stays at 9, does not throw
- `masteryMap = {}` (empty) → router selects from LEVEL_META archetypes, doesn't crash
- `currentLevel = 5, empty masteryMap` → router defaults to first archetype in the level

### 2.3 Replace Direct Random / Date Calls with Ports
**File:** `src/engine/ports.ts`, `src/engine/selection.ts`, and all calling code

Audit for direct calls:
```typescript
// WRONG: Math.random(), Date.now()
const r = Math.random();
const now = Date.now();

// CORRECT: use port-injected versions
const r = ports.random();
const now = ports.now();
```

In `src/engine/ports.ts`, ensure the interface is:
```typescript
export interface EnginePorts {
  random: () => number;          // returns [0, 1)
  now: () => number;             // returns milliseconds since epoch
}
```

Add a determinism test in `tests/engine/selection.test.ts`:
```typescript
test('selection is deterministic when seeded', () => {
  const seedPort: EnginePorts = {
    random: () => 0.5,            // always return 0.5
    now: () => 1000,
  };

  const result1 = selectItem(items, seedPort);
  const result2 = selectItem(items, seedPort);
  expect(result1).toEqual(result2);
});
```

### 2.4 Add Misconception Detector Unit Tests
**File:** `src/engine/misconceptionDetectors.ts`

For each detector (MC-WHB-*, MC-MAG-*, MC-PRX-*), create two tests:

1. **Positive detection**: a student response that should trigger the misconception
2. **False-positive guard**: a correct response that must NOT trigger the misconception

Example:
```typescript
test('MC-WHB-UNEQUAL detects unequal partitions', () => {
  const response = {
    numerator: 1,
    denominator: 3,
    parts: [0.4, 0.3, 0.3],  // unequal
  };
  expect(detectMC_WHB_UNEQUAL(response)).toBe(true);
});

test('MC-WHB-UNEQUAL does NOT fire on equal partitions', () => {
  const response = {
    numerator: 1,
    denominator: 3,
    parts: [0.333, 0.333, 0.334],  // equal (within tolerance)
  };
  expect(detectMC_WHB_UNEQUAL(response)).toBe(false);
});
```

Add tests to `tests/engine/misconceptionDetectors.test.ts`. Minimum: 2 tests per detector (10+ detectors = 20+ new tests).

---

## Phase 3 — Validator Hardening

**Goal:** Every validator is a pure function, registered, and has Python parity.

### 3.1 Ensure Validator Purity
**Files:** `src/validators/**/*.ts`

Audit each validator for side effects:
- No Phaser imports (except types)
- No DB calls, no IndexedDB access
- No console.log (except in tests)
- No external fetch calls
- No mutation of input arguments
- No reading from `window`, `localStorage`, `sessionStorage`

If a validator imports something it shouldn't, refactor the validator to accept the needed data as a parameter:
```typescript
// WRONG: reading from scene state inside the validator
export function validatePartition(response) {
  const masterLevel = currentScene.getMasterLevel();  // ❌ side effect
  return response.parts.length === masterLevel;
}

// CORRECT: accept it as a parameter
export function validatePartition(response, options: { expectedPartCount: number }) {
  return response.parts.length === options.expectedPartCount;
}
```

### 3.2 Register All Validators
**File:** `src/validators/registry.ts`

Ensure every `ActivityArchetype` value has a registered validator:
```typescript
export const validatorRegistry: Record<ActivityArchetype, ValidatorFunction> = {
  partition: validatePartition,
  identify: validateIdentify,
  label: validateLabel,
  make: validateMake,
  compare: validateCompare,
  snap_match: validateSnapMatch,
  benchmark: validateBenchmark,
  placement: validatePlacement,
  order: validateOrder,
  explain_your_order: validateExplainYourOrder,
};

// Add a runtime guard:
export function getValidator(archetype: ActivityArchetype): ValidatorFunction {
  const validator = validatorRegistry[archetype];
  if (!validator) {
    throw new Error(
      `No validator registered for archetype '${archetype}'. ` +
      `Expected one of: ${Object.keys(validatorRegistry).join(', ')}`
    );
  }
  return validator;
}
```

Add a test that iterates all archetypes and asserts each has a validator.

### 3.3 Normalize Validator Return Shape
**All validators in `src/validators/**/*.ts`**

Standard return type:
```typescript
export type ValidatorResult = {
  isCorrect: boolean;
  feedback: string;
  misconception?: string;  // optional; only set if a misconception was detected
};
```

Ensure every validator returns this exact shape:
- `isCorrect`: boolean, never undefined
- `feedback`: non-empty string, never undefined or null
- `misconception`: optional; only present if a misconception is detected (cite MC-* ID)

Add a return type annotation to every validator:
```typescript
export function validatePartition(response: PartitionResponse): ValidatorResult {
  // ...
  return {
    isCorrect: true,
    feedback: 'Great! You divided it into equal parts.',
    // misconception omitted = no misconception detected
  };
}
```

### 3.4 Add Python Parity for All Validators
**Files:** `pipeline/validators_py.py`, `tests/validators/parity/*.ts`

For every validator in `src/validators/*.ts` without a Python clone in `pipeline/validators_py.py`:

1. Write the Python equivalent (same logic, same input/output shape)
2. Add a parity fixture file: `tests/validators/parity/<archetype>.fixture.json`:
   ```json
   {
     "testCases": [
       {
         "input": { "numerator": 1, "denominator": 2, ... },
         "expectedOutput": { "isCorrect": true, "feedback": "..." }
       }
     ]
   }
   ```
3. Add a test that runs both TS and Python validators against the fixture, asserting identical outputs:
   ```typescript
   test('partition validator has Python parity', async () => {
     const fixture = loadFixture('partition');
     for (const testCase of fixture.testCases) {
       const tsResult = validatePartition(testCase.input);
       const pyResult = await runPythonValidator('partition', testCase.input);
       expect(tsResult).toEqual(pyResult);
     }
   });
   ```

---

## Phase 4 — Persistence Hardening

**Goal:** Schema migrations are safe and idempotent, writes never fail silently, backups are validated.

### 4.1 Audit Migration Safety
**File:** `src/persistence/db.ts`

For each `.version(N).stores(...)` and `.upgrade()`:

1. Add a comment explaining why the version bump is needed:
   ```typescript
   // v8: restructure hintEvents index from '++id, attemptId' to 'id, attemptId'
   // Reason: allow multiple sessions to contribute to the same hint event
   // Migration: drop old index, recreate with new shape
   db.version(8).stores({
     hintEvents: null,  // Clear the old table
   });

   // v9: recreate hintEvents with new schema
   db.version(9).stores({
     hintEvents: 'id, attemptId',
   });
   ```

2. Verify idempotency: the upgrade should be safe to re-run without data loss
3. Fill any version-number gaps: if current version is 10 but you see versions [1, 2, 4, 7, 10], investigate the gap and add missing versions if needed

### 4.2 Wrap Writes in Try/Catch
**Files:** `src/persistence/repositories/*.ts`

Every Dexie write operation must be wrapped:
```typescript
// WRONG: write without error handling
export async function addAttempt(attempt: Attempt): Promise<void> {
  await db.attempts.add(attempt);
}

// CORRECT: wrap and rethrow with logging
export async function addAttempt(attempt: Attempt): Promise<void> {
  try {
    await db.attempts.add(attempt);
  } catch (error) {
    log.error('Failed to persist attempt', {
      attemptId: attempt.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;  // Re-throw so caller can degrade gracefully
  }
}
```

Affected operations:
- `db.table.add()`
- `db.table.put()`
- `db.table.update()`
- `db.table.delete()`
- `db.table.bulkAdd()`
- `db.transaction()`

### 4.3 Validate Backup Restore
**File:** `src/persistence/schemas.ts`

For every dynamic table accepted by `restoreFromFile()`:

1. Add `.max()` caps to string fields:
   ```typescript
   displayName: z.string().max(64).trim(),
   feedback: z.string().max(512),
   ```

2. Add numeric range guards:
   ```typescript
   masteryEstimate: z.number().min(0).max(1),
   questionIndex: z.number().min(0).max(1000),  // hard cap to prevent memory explosion
   ```

3. Add explicit enum validation:
   ```typescript
   status: z.enum(['pending', 'correct', 'incorrect']),
   ```

4. Reject the entire restore if any row fails validation:
   ```typescript
   export async function restoreFromFile(file: File): Promise<void> {
     const json = JSON.parse(await file.text());
     const validation = restoredBackupSchema.safeParse(json);
     if (!validation.success) {
       throw new Error(
         `Backup restore failed: ${validation.error.message}`
       );
     }
     // Clear and restore
     await db.students.clear();
     await db.students.bulkAdd(validation.data.students);
     // ... repeat for all tables
   }
   ```

### 4.4 Migrate localStorage to Dexie (C5 Compliance)
**Files:** `src/persistence/db.ts`, `src/scenes/MenuScene.ts`, `src/scenes/LevelMapScene.ts`

**Background:** C5 permits only `lastUsedStudentId` in localStorage. Current code also writes `unlockedLevels:<studentId>` and `completedLevels:<studentId>`. Migrate these to Dexie.

**Plan:**

1. Add a `progressionStat` table to Dexie schema:
   ```typescript
   db.version(N).stores({
     progressionStat: 'studentId',  // one row per student
   });

   interface ProgressionStat {
     studentId: StudentId;
     unlockedLevels: number[];      // [2, 3, 4, ...] (level numbers)
     completedLevels: number[];
     lastPlayed: number;            // timestamp
   }
   ```

2. In `MenuScene.ts` and `LevelMapScene.ts`, replace:
   ```typescript
   // OLD: localStorage
   const unlockedStr = localStorage.getItem(`unlockedLevels:${studentId}`);

   // NEW: Dexie
   const stat = await progressionStatRepo.get(studentId);
   const unlockedLevels = stat?.unlockedLevels ?? [];
   ```

3. On `restoreFromFile()`, migrate old localStorage keys to Dexie:
   ```typescript
   export function migrateLocalStorageProgressToIndexedDB() {
     const studentId = localStorage.getItem('lastUsedStudentId');
     if (!studentId) return;

     const unlockedStr = localStorage.getItem(`unlockedLevels:${studentId}`);
     const completedStr = localStorage.getItem(`completedLevels:${studentId}`);

     if (unlockedStr || completedStr) {
       const stat: ProgressionStat = {
         studentId: StudentId(studentId),
         unlockedLevels: unlockedStr ? JSON.parse(unlockedStr) : [],
         completedLevels: completedStr ? JSON.parse(completedStr) : [],
         lastPlayed: Date.now(),
       };
       db.progressionStat.put(stat);
       localStorage.removeItem(`unlockedLevels:${studentId}`);
       localStorage.removeItem(`completedLevels:${studentId}`);
     }
   }
   ```

4. Call `migrateLocalStorageProgressToIndexedDB()` at boot (in `BootScene.create()`)

---

## Phase 5 — Scene & Session Lifecycle

**Goal:** No out-of-bounds access, no state leaks between sessions, no orphaned tweens/timers.

### 5.1 Template Pool Bounds Check
**Files:** `src/scenes/LevelScene.ts`, `src/scenes/Level01Scene.ts`

Before accessing `templatePool[questionIndex]`:
```typescript
if (questionIndex >= templatePool.length) {
  log.error('Template pool exhausted', {
    questionIndex,
    poolSize: templatePool.length,
    sessionId: currentSessionId,
  });
  // Option A: Reshuffle pool
  shufflePoolAndResume();
  // Option B: Close session gracefully
  return this.completeSession();
}
const template = templatePool[questionIndex];
```

Add a test that deliberately exhausts a small pool and verifies no crash.

### 5.2 Play Again Reset
**Files:** `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts`

In `init()` (called before `create()`), reset every session-state field:
```typescript
init(data: LevelSceneData) {
  this.questionIndex = 0;
  this.attemptCount = 0;
  this.wrongCount = 0;
  this.correctCount = 0;
  this.correctStreak = 0;
  this.responseTimes = [];
  this.currentQuestionHintIds = [];
  this.activeInteraction = null;
  this.inputLocked = false;
  this.sessionStartTime = Date.now();
  // ... any other mutable state
}
```

Verify `create()` does not rely on prior instance state — all setup must be via `this.data` or `init()`.

### 5.3 Tween & Timer Cleanup
**All scene files**

In `shutdown()` or `destroy()`:
```typescript
shutdown() {
  // Stop all tweens
  this.tweens.killAll();

  // Remove all timer events
  this.time.removeAllEvents();

  // Reset input lock so re-entry doesn't inherit it
  this.inputLocked = false;

  // Clean up any interaction-specific state
  if (this.activeInteraction) {
    this.activeInteraction.destroy?.();
    this.activeInteraction = null;
  }
}
```

### 5.4 BootScene Double-Advance Guard
**File:** `src/scenes/BootScene.ts`

Ensure `_advanced` flag prevents double-advance:
```typescript
private _advanced = false;

advanceToPreload() {
  if (this._advanced) {
    log.warn('BootScene.advanceToPreload() called twice. Ignoring.');
    return;
  }
  this._advanced = true;

  // Check if lastStudentId exists in DB; if not, clear it
  const lastStudentId = localStorage.getItem('lastUsedStudentId');
  if (lastStudentId) {
    db.students.get(StudentId(lastStudentId)).then((student) => {
      if (!student) {
        localStorage.removeItem('lastUsedStudentId');
        log.warn('lastUsedStudentId exists but student not in DB; cleared.');
      }
    });
  }

  this.scene.start('PreloadScene');
}
```

---

## Phase 6 — Interaction Layer

**Goal:** All listeners cleaned up, no double-submits, pointer state is correct.

### 6.1 Implement / Audit destroy() Methods
**Files:** `src/scenes/interactions/*.ts`

Every interaction must expose a `destroy()` method:
```typescript
export class PartitionInteraction {
  private listeners: Array<{
    object: Phaser.GameObjects.GameObject | Phaser.Input.InputPlugin;
    event: string;
    handler: Function;
  }> = [];

  constructor(scene: Phaser.Scene, ...) {
    // Track all listeners
    scene.input.on('pointerdown', this.onPointerDown, this);
    this.listeners.push({
      object: scene.input,
      event: 'pointerdown',
      handler: this.onPointerDown,
    });
  }

  destroy() {
    // Remove all tracked listeners
    for (const listener of this.listeners) {
      listener.object.off(listener.event, listener.handler);
    }
    this.listeners = [];
  }
}
```

Verify `destroy()` is called in the scene's shutdown or when the interaction completes.

### 6.2 Fix Pointer Capture Leaks
**Files:** `src/scenes/interactions/*.ts` (drag interactions)

For every drag interaction that calls `pointer.setCapture()`:
```typescript
onPointerDown(pointer) {
  pointer.setCapture(this.dragObject);
}

onPointerMove(pointer) {
  if (!pointer.isDown) {
    pointer.releasePointerCapture();
    return;
  }
  // Update position
}

onPointerUp(pointer) {
  pointer.releasePointerCapture();
}

onPointerCancel(pointer) {
  pointer.releasePointerCapture();  // ← IMPORTANT: must release on cancel
}
```

Add a test that simulates `pointercancel` and verifies pointer is released.

### 6.3 Prevent Double-Submit
**All interactions**

Add a submission guard:
```typescript
private submitted = false;

onSubmit() {
  if (this.submitted) {
    log.warn('Interaction already submitted; ignoring duplicate submit.');
    return;
  }
  this.submitted = true;

  const result = this.validate();
  this.resultCallback(result);
}
```

Test: trigger submit twice rapidly; verify callback fires once.

---

## Phase 7 — Component Hardening

**Goal:** All tweens respect reduced motion, no stalling, no orphaned DOM elements.

### 7.1 Mascot Reduced-Motion Gating
**File:** `src/components/Mascot.ts`

Wrap every tween in a reduced-motion check:
```typescript
setState(state: MascotState) {
  const reduceMotion = checkReduceMotion();

  if (reduceMotion) {
    // Apply final state directly; skip tween
    this.sprite.setFrame(this.frameForState(state));
    this.currentState = state;
    return;
  }

  // Normal tween path
  this.tweens.add({
    targets: this.sprite,
    alpha: stateProps[state].alpha,
    duration: 300,
    onComplete: () => {
      this.setState('idle');  // ← Always end in idle
    },
  });
}
```

Ensure every tween's `onComplete` callback ends in `setState('idle')`.

### 7.2 HintLadder Tier Clamping
**File:** `src/components/HintLadder.ts`

```typescript
next(): HintTier {
  if (this.currentTier >= 3) {
    // Already at last tier; stay there
    return 3;
  }
  this.currentTier++;
  return this.currentTier;
}

// Test:
test('HintLadder.next() clamps to tier 3', () => {
  ladder.next(); // 1
  ladder.next(); // 2
  ladder.next(); // 3
  const result = ladder.next(); // 3 again
  expect(result).toBe(3);
});
```

### 7.3 A11yLayer Element Cleanup
**File:** `src/components/A11yLayer.ts`

Maintain a registry and clean up on destroy:
```typescript
private elements: Map<string, HTMLElement> = new Map();

addLabel(id: string, text: string, ariaLabel: string) {
  const element = document.createElement('div');
  element.setAttribute('aria-label', ariaLabel);
  element.textContent = text;
  this.elements.set(id, element);
  document.body.appendChild(element);
}

destroy() {
  for (const element of this.elements.values()) {
    element.remove();
  }
  this.elements.clear();
}

// Test:
test('A11yLayer cleanup removes all elements', () => {
  const layer = new A11yLayer(scene);
  layer.addLabel('q1', 'Question 1', 'Question 1 text');
  layer.addLabel('q2', 'Question 2', 'Question 2 text');
  expect(document.querySelectorAll('[aria-label]').length).toBe(2);
  layer.destroy();
  expect(document.querySelectorAll('[aria-label]').length).toBe(0);
});
```

### 7.4 FeedbackOverlay Input Blocking
**File:** `src/components/FeedbackOverlay.ts`

While overlay is visible, block pointer input:
```typescript
show(message: string) {
  this.scene.input.enabled = false;
  this.overlay.setVisible(true);
  this.overlay.setAlpha(1);
}

hide() {
  this.scene.input.enabled = true;
  this.overlay.setVisible(false);
}
```

Verify z-depth is above all interactive objects:
```typescript
constructor(scene, x, y) {
  this.overlay = scene.add.rectangle(x, y, 800, 600, 0x000000, 0.8);
  this.overlay.setDepth(9999);  // Highest depth in the game
  scene.add.text(...).setDepth(10000);  // Overlay text is above that
}
```

---

## Phase 8 — Accessibility

**Goal:** WCAG 2.1 AA compliance: labels, touch targets, reduced-motion, keyboard navigation.

### 8.1 Audit Interactive Elements
**All interactive GameObjects in scenes**

For every `Phaser.GameObjects.Image`, `Graphics`, `Container` that is interactive:
```typescript
// WRONG: no label
const button = scene.add.image(x, y, 'button-texture');
button.setInteractive();

// CORRECT: add A11y entry
const button = scene.add.image(x, y, 'button-texture');
button.setInteractive();
a11yLayer.addLabel('button-next', 'Next', 'Next question button');
```

Audit targets: buttons, draggable objects, menu items, response areas.

### 8.2 Wrap Cosmetic Tweens with Motion Guards
**All scenes with animations**

Distinguish state-driving tweens from cosmetic tweens:
```typescript
// STATE-DRIVING: apply immediately when reduced motion is on
if (!checkReduceMotion()) {
  this.tweens.add({
    targets: this.fraction,
    y: targetY,
    duration: 500,
    onComplete: () => {
      this.fraction.y = targetY;  // Ensure final state
      this.showFeedback();  // Next step depends on position being correct
    },
  });
} else {
  this.fraction.y = targetY;
  this.showFeedback();
}

// COSMETIC: skip entirely when reduced motion is on
if (!checkReduceMotion()) {
  this.tweens.add({
    targets: this.mascot,
    scale: 1.1,
    duration: 200,
    yoyo: true,
  });
}
```

### 8.3 Verify AccessibilityAnnouncer Calls
**All scenes**

Ensure announcements at critical junctures:
- Question load: `announcer.announce('Question 1 of 5: Partition the shape')`
- Correct answer: `announcer.announce('Correct!')`
- Wrong answer: `announcer.announce('Not quite. Try again.')`
- Hint display: `announcer.announce('Hint: Look at how many equal parts...')`
- Session complete: `announcer.announce('Great job! You completed Level 3.')`

Add these to the relevant event handlers.

### 8.4 Audit Hit Areas
**All interactive objects**

For every pointer-interactive GameObject smaller than 44×44 CSS px:
```typescript
const hitArea = new Phaser.Geom.Rectangle(0, 0, 44, 44);
gameObject.setInteractive({ hitArea, useHandCursor: true });
```

Or ensure the visual size is at least 44×44:
```typescript
// CORRECT: visual button is large enough
const button = scene.add.rectangle(x, y, 50, 50, 0x0099ff);
button.setInteractive();
```

---

## Phase 9 — Audio

**Goal:** Safe initialization, enabled state respected, cleanup on exit.

### 9.1 AudioContext Initialization Safety
**File:** `src/lib/audio/AudioContext.ts` (or equivalent)

Wrap creation in try/catch:
```typescript
let audioContext: AudioContext | null = null;

export async function initAudio(): Promise<void> {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Resume after user gesture
    document.addEventListener('pointerdown', async () => {
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
    });
  } catch (error) {
    log.error('Failed to initialize AudioContext', { error: String(error) });
    audioContext = null;
  }
}

export function getAudioContext(): AudioContext | null {
  return audioContext;
}
```

### 9.2 TTS Enabled State Check
**File:** `src/lib/audio/TTSService.ts`

Before speaking:
```typescript
async speak(text: string): Promise<void> {
  const ttsEnabled = await deviceMetaRepo.get(studentId).then(m => m?.ttsEnabled);
  if (!ttsEnabled) {
    // Cancel any in-flight utterance
    if (this.currentUtterance) {
      speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  this.currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}
```

### 9.3 SFX Cleanup
**File:** `src/lib/audio/SFXService.ts`

Expose a destroy method and call it at game destruction:
```typescript
export class SFXService {
  destroy() {
    const audioContext = getAudioContext();
    if (audioContext) {
      audioContext.close().catch(err => {
        log.error('Failed to close AudioContext', { error: String(err) });
      });
    }
  }
}

// In main.ts or game shutdown:
game.events.on('shutdown', () => {
  sfxService.destroy();
});
```

---

## Phase 10 — i18n & Copy

**Goal:** No hardcoded English strings, all keys present, missing keys fail loudly.

### 10.1 Migrate Hardcoded Strings to Catalog
**All scenes and components**

Identify all hardcoded English strings:
```typescript
// WRONG: hardcoded
this.add.text(x, y, 'Partition the shape into equal parts');

// CORRECT: use catalog
this.add.text(x, y, catalog.get('instructions.partition'));
```

Add keys to the appropriate catalog file (e.g., `src/lib/i18n/catalogs/en.json`).

Audit targets:
- `src/scenes/**/*.ts`
- `src/components/**/*.ts`
- `src/validators/**/*.ts` (feedback messages)

### 10.2 Make catalog.get() Fail on Missing Keys
**File:** `src/lib/i18n/catalog.ts`

```typescript
export function get(key: string): string {
  const value = catalogData[key];
  if (!value) {
    const error = `Missing i18n key: '${key}'`;
    log.error(error);
    throw new Error(error);  // Fail fast in development
  }
  return value;
}
```

In production (if desired), you could return a fallback, but throwing is preferred for finding missing keys.

### 10.3 Verify Catalog Registration
**File:** `src/lib/i18n/index.ts`

Ensure the catalog is imported before BootScene runs:
```typescript
// src/lib/i18n/index.ts — side-effect import
import './catalogs/en.json';
import './catalogs/es.json';  // if applicable

// src/main.ts
import './lib/i18n';  // Side-effect import must happen before game init
```

---

## Phase 11 — Observability & Security

**Goal:** No error stacks in DOM, no XSS, no eval, no remote calls without env vars.

### 11.1 Error Banner Hardening
**File:** `src/main.ts` (or error boundary)

```typescript
// WRONG: exposes stack trace to user
errorBanner.textContent = error.stack;

// CORRECT: only show message
errorBanner.textContent = error.message || 'An error occurred';
```

### 11.2 Audit i18n for XSS
**All catalog files and injection points**

Never use `innerHTML`:
```typescript
// WRONG: XSS vector
container.innerHTML = catalog.get('feedback');

// CORRECT: textContent is safe
container.textContent = catalog.get('feedback');

// OR: use a safe DOM builder
container.replaceChildren();
container.appendChild(
  document.createTextNode(catalog.get('feedback'))
);
```

### 11.3 Remove eval / new Function / innerHTML
**Search across `src/`**

```bash
grep -r "eval\|new Function\|innerHTML" src/ --include="*.ts" --include="*.tsx"
```

For each hit:
- If it's a test or a legitimate use (e.g., Phaser internals), document it
- Otherwise, replace with a safer equivalent

### 11.4 Verify Tracer & ErrorReporter Are Dormant
**Files:** `src/lib/observability/tracer.ts`, `src/lib/observability/errorReporter.ts`

Both must be no-ops when their activation env vars / DSN are absent:
```typescript
// tracer.ts
export const tracer = {
  trace: (name, fn) => {
    if (!process.env.VITE_OTLP_URL) {
      return fn();  // No-op: just run the function
    }
    // ... actual tracing
  },
};

// errorReporter.ts
export function initErrorReporter(dsn?: string) {
  if (!dsn) {
    return {
      captureException: () => {},  // No-op
      captureMessage: () => {},
    };
  }
  // ... actual error reporting
}
```

Add a test:
```typescript
test('tracer makes no fetch calls when VITE_OTLP_URL is undefined', () => {
  delete process.env.VITE_OTLP_URL;
  const spy = jest.spyOn(global, 'fetch');
  tracer.trace('test', () => { /* ... */ });
  expect(spy).not.toHaveBeenCalled();
});
```

---

## Phase 12 — Curriculum Pipeline Integrity

**Goal:** Bundle files always match, offline fallback works, corrupted templates rejected.

### 12.1 Add Pre-Commit SHA Check
**File:** `.husky/pre-commit` (new hook) or CI step**

```bash
#!/bin/bash
set -e

HASH1=$(sha256sum public/curriculum/v1.json | awk '{print $1}')
HASH2=$(sha256sum src/curriculum/bundle.json | awk '{print $1}')

if [ "$HASH1" != "$HASH2" ]; then
  echo "ERROR: Curriculum files are out of sync!"
  echo "  public/curriculum/v1.json: $HASH1"
  echo "  src/curriculum/bundle.json: $HASH2"
  echo "Run: npm run build:curriculum"
  exit 1
fi
```

### 12.2 Offline Fallback in Loader
**File:** `src/scenes/PreloadScene.ts` or curriculum loader**

```typescript
async function loadCurriculum(): Promise<Curriculum> {
  try {
    const response = await fetch('/curriculum/v1.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    log.warn('Network load failed; using bundled curriculum', { error });
    return import('../curriculum/bundle.json').then(m => m.default);
  }
}
```

Never throw an uncaught error; always fall back to the bundle.

### 12.3 Validate Seeded Templates
**File:** `src/persistence/seed.ts` or equivalent**

Before writing to Dexie:
```typescript
import { templateSchema } from '../types/entities';

export async function seedTemplates(json: unknown): Promise<void> {
  if (!Array.isArray(json)) {
    throw new Error('Seeded curriculum must be an array');
  }

  const validTemplates = [];
  for (const row of json) {
    const result = templateSchema.safeParse(row);
    if (!result.success) {
      log.error('Skipping malformed template', {
        row,
        error: result.error.message,
      });
      continue;
    }
    validTemplates.push(result.data);
  }

  await db.templates.bulkAdd(validTemplates);
}
```

---

## Phase 13 — Performance

**Goal:** No main-thread jank, lazy loading, bundle under 1 MB gzipped.

### 13.1 Move Sync Dexie Calls Out of create()
**All scenes**

Identify synchronous Dexie calls in `create()`:
```typescript
// WRONG: blocks scene initialization
create() {
  const student = db.students.get(this.studentId);  // ← sync
  this.displayName = student.displayName;
}

// CORRECT: async helper, fire-and-forget
create() {
  this.loadStudentData();
}

private async loadStudentData() {
  const student = await db.students.get(this.studentId);
  this.displayName = student.displayName;
  // Update UI
}
```

Or use a Phaser loader step.

### 13.2 Lazy-Import Observability
**File:** `src/main.ts`**

```typescript
// WRONG: always imported, even if disabled
import tracer from './lib/observability/tracer';

// CORRECT: dynamic import
let tracer: Tracer | null = null;

(async () => {
  if (process.env.VITE_OTLP_URL) {
    const mod = await import('./lib/observability/tracer');
    tracer = mod.default;
  }
})();
```

This removes observability from the critical-path chunk if not activated.

### 13.3 Measure Bundle
**After all changes:**

```bash
npm run measure-bundle
```

Expected output: gzipped JS ≤ 1 MB.

If exceeds:
- Identify largest modules via source-map explorer
- Code-split large modules (e.g., separate curriculum loader chunk)
- Remove unused dependencies

---

## Phase 14 — Test Coverage

**Goal:** Every file has tests, every test asserts behavior, E2E covers critical paths.

### 14.1 Ensure Every src File Has Tests
**All files in `src/`**

For every file with no corresponding `*.test.ts`:
- Create a minimal test file covering the exported functions
- Test the happy path and error path

Example:
```typescript
// src/engine/bkt.ts → tests/engine/bkt.test.ts
describe('BKT', () => {
  test('update() clamps P_L to [0, 1]', () => {
    const result = bkt.update({ pL: 0, pC: 0, correct: true });
    expect(result.pL).toBeGreaterThanOrEqual(0);
    expect(result.pL).toBeLessThanOrEqual(1);
  });
});
```

### 14.2 Replace Smoke Tests with Real Assertions
**All test files**

Find and replace:
```typescript
// WRONG: smoke assertion
test('it works', () => {
  expect(true).toBe(true);
});

// CORRECT: behavioral assertion
test('validatePartition returns correct when parts are equal', () => {
  const result = validatePartition({
    numerator: 1,
    denominator: 2,
    parts: [0.5, 0.5],
  });
  expect(result.isCorrect).toBe(true);
});
```

### 14.3 Add E2E Playwright Tests
**File:** `tests/e2e/*.spec.ts`**

Add tests for critical user journeys:

1. **Complete a 5-question session:**
   ```typescript
   test('student completes a 5-question session', async ({ page }) => {
     await page.goto('http://localhost:5000');
     // Select student
     // Select level
     // Answer 5 questions correctly
     // Verify session complete screen
   });
   ```

2. **Trigger all 3 hint tiers:**
   ```typescript
   test('student can trigger all 3 hint tiers', async ({ page }) => {
     // ... setup
     // Click hint button 3 times
     // Verify tier 1, 2, 3 appear
   });
   ```

3. **Play Again flow:**
   ```typescript
   test('Play Again resets session and allows restart', async ({ page }) => {
     // ... complete a session
     // Click "Play Again"
     // Verify session state is reset
     // Answer first question
   });
   ```

4. **Offline curriculum fallback:**
   ```typescript
   test('app loads bundled curriculum when network is offline', async ({ page, context }) => {
     // Simulate offline
     await context.setOffline(true);
     await page.goto('http://localhost:5000');
     // Verify curriculum loads from bundle
   });
   ```

---

## Completion Gate

### Pre-PR Checklist

Before opening the PR:

- [ ] `npm run typecheck` → **0 errors**
- [ ] `npm run lint` → **0 warnings**
- [ ] `npm run test:unit` → **all pass**
- [ ] `npm run test:e2e` → **all pass**
- [ ] `npm run measure-bundle` → **≤ 1 MB gzipped JS**
- [ ] `npm run validate:curriculum` → **valid**
- [ ] No new localStorage keys outside C5 + documented deviations
- [ ] All phases committed (14 commits, one per phase)
- [ ] No constraint violations (C1–C10 respected)

### Post-Merge Validation

After merging to `main`:
- [ ] CI passes on main
- [ ] Manual smoke test: open http://localhost:5000 and complete a 5-question session
- [ ] Verify all levels (1–9) are playable
- [ ] Test on mobile (iOS Safari, Android Chrome) if possible

---

## Git Workflow

Each phase = one commit on a feature branch. Branch name format:
```
fix/2026-05-03-full-spectrum-hardening
```

Commit message template:
```
fix(phase-N): <descriptor>

This phase addresses:
- Item 1
- Item 2
- ...

Verification:
✓ npm run typecheck
✓ npm run test:unit
✓ <any phase-specific test>
```

Example:
```
fix(phase-1): remove all `any` types and brand all ID strings

This phase audits every `any` and bare string ID in src/, replacing them
with narrowest correct types and branded ID constructors from branded.ts.

Verification:
✓ npm run typecheck (0 errors)
✓ npm run test:unit (all pass)
```

After all 14 phases are committed locally:
```bash
git push -u origin fix/2026-05-03-full-spectrum-hardening
gh pr create --title "fix: full-spectrum hardening (14 phases)" \
  --body "Addresses TypeScript correctness, engine robustness, accessibility, \
persistence safety, and test coverage across the entire codebase."
```

---

## Rollback Plan

If a phase introduces a regression:
1. Identify the failing test
2. Revert the phase commit: `git revert <commit-hash>`
3. Diagnose the root cause
4. Fix in a new branch
5. Recommit

---

## Success Criteria

This effort is complete and successful when:

1. **0 TypeScript errors** — `npm run typecheck` is clean
2. **0 constraint violations** — C1–C10 are all respected
3. **100% test pass rate** — unit + E2E + A11y
4. **1.0 MB gzipped JS budget** — confirmed via `npm run measure-bundle`
5. **Zero critical accessibility defects** — WCAG 2.1 AA pass
6. **Zero data-loss scenarios** — persistence is safe and idempotent
7. **All session state reset on re-entry** — no state leaks
8. **All layers have tests** — 14 phases + E2E coverage

---

## Estimated Effort

- Phase 1 (TypeScript): 8–10 hours
- Phase 2 (Engine): 6–8 hours
- Phase 3 (Validators): 4–6 hours
- Phase 4 (Persistence): 6–8 hours
- Phase 5 (Lifecycle): 4–6 hours
- Phase 6 (Interactions): 4–6 hours
- Phase 7 (Components): 4–6 hours
- Phase 8 (Accessibility): 6–8 hours
- Phase 9 (Audio): 2–3 hours
- Phase 10 (i18n): 3–4 hours
- Phase 11 (Observability): 3–4 hours
- Phase 12 (Curriculum): 2–3 hours
- Phase 13 (Performance): 4–6 hours
- Phase 14 (Tests): 8–10 hours

**Total: ~65–95 hours** (2–3 weeks at full-time focus, 4–6 weeks at part-time)

---

## Document History

| Date       | Revision | Author | Notes |
|------------|----------|--------|-------|
| 2026-05-03 | v1.0     | Senior Eng | Initial comprehensive plan |
