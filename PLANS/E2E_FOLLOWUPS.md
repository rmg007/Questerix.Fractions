# E2E follow-ups

**Created:** 2026-05-02 (during PR closing the pre-existing CI `test`-job red.)
**Owner:** next agent on Phase 5.
**Tracker scope:** specs `test.skip`'d in `tests/e2e/**` whose root cause is
feature drift, not infrastructure. Each entry names the spec/file, the symptom,
and the most-likely fix path.

The fixture-level fixes that landed alongside this tracker (TEST_HOOKS_PARAM
key, deviceMeta lazy-create honors legacy onboarding flag) restored boot +
menu + map navigation for every spec. The remaining failures are real
behavior drift in the deeper screens.

---

## Cluster A — Mascot reaction sentinels (T27)

**File:** `tests/e2e/mascot-reactions.spec.ts`
**Skipped:** entire `Mascot reactions (T27) — e2e smoke` describe block (8 tests).
**Symptom:** `[data-testid="mascot-state"]` does not transition to `cheer`,
`cheer-big`, or `think` on the asserted triggers. The "Mascot on MenuScene"
describe (`wave` → `idle` after greeting) still passes.

**Likely cause:** Phase 3/4 mascot rework — Mascot.ts speech bubbles + idle
escalation now drive state transitions through a different pipeline. The
sentinel is mounted but the data-state attribute isn't updated on the same
event path the spec hooks into.

**Fix path:** audit `Mascot.setState()` in `src/components/Mascot.ts` against
the events the spec triggers (correct answer, hint button, wrong answer,
session complete). Either reattach the sentinel writer to the new pipeline or
rewrite the asserts to track the new state names.

---

## Cluster B — Quest voice-line catalog (T28)

**File:** `tests/e2e/quest-wiring.spec.ts`
**Skipped:** entire `Quest voice wiring (T28) — e2e smoke` describe block (2 tests).
**Symptom:** ARIA-live region's first announcement is the level/question
header (`"Level 6, question 1 of 5. Which is greater: 1/2 or 1/4?"`) instead
of the quest catalog line (`"Try again. The parts are not equal."`). The
catalog line never reaches the live region.

**Likely cause:** the `announce()` flow in `LevelScene.ts` now leads with the
header and the wrong-answer Quest line either fires too late or isn't
announced via the polite live region.

**Fix path:** unit-cover the catalog wiring with `tests/unit/i18n/questWiring.test.ts`
first to confirm the catalog is intact, then trace the wrong-answer path in
`src/lib/levelSceneOutcomeFlow.ts` and confirm the announce() call.

---

## Cluster C — L6 / L7 menu shortcuts

**File:** `tests/e2e/levels-2-9.spec.ts`
**Skipped:** L6 + L7 smoke tests (`level-card-L6`, `level-card-L7`).
**Symptom:** clicking the interactive overlay no longer mounts the
`level-scene` sentinel — the click likely intercepts the new chrome layer
or the click handler routes elsewhere.

**Likely cause:** Phase 4.7 chrome-extraction in `LevelScene.ts` (PR #66) may
have shifted z-index or sentinel mount order. MenuScene line 188+ still mounts
the L6 / L7 interactive overlays, but downstream the level-scene sentinel
isn't reached within the spec's timeout.

**Fix path:** confirm `level-scene` sentinel is still mounted in
`LevelScene.ts:233`, then trace the click handler from
`fadeAndStart(this, 'LevelScene', { levelNumber: 6 })` through to scene
create. Likely a small timing tweak.

---

## Cluster D — 5-attempt session flow flake

**Files:** `tests/e2e/level01.spec.ts:11`, `tests/e2e/happy-path.spec.ts:11`,
`tests/e2e/happy-path.spec.ts:101`.
**Skipped:** the three multi-attempt flow tests.
**Symptom:** when the suite runs sequentially (default), these tests time out
mid-session even though each one passes in isolation (`npx playwright test
tests/e2e/level01.spec.ts` → all green).

**Likely cause:** shared IndexedDB state across tests in the same Playwright
worker. Earlier tests leave a `session` row open, so the 5-attempt iteration
either picks up the stale session or hits a guard.

**Fix path:** add a `test.beforeEach` that clears IndexedDB, or bump
`workers: 'fullyParallel'` so each test gets a fresh context. Both options
documented in Playwright docs for storage isolation.

---

## Cluster E — ProgressBar a11y-snap-center

**File:** `tests/e2e/progress-bar.spec.ts:32`
**Skipped:** the single `aria-valuenow equals 1 after submitting one correct answer` test.
**Symptom:** clicking `[data-testid="a11y-snap-center"]` (programmatically,
because the button is SR-only / clipped) and then `partition-target` does not
increment the progress bar's `aria-valuenow` to 1.

**Likely cause:** the snap-center A11y button click no longer routes through
the same submit pathway that increments progress. Possibly a regression from
the PartitionInteraction snap-juice work in Phase 3 Round 2c.

**Fix path:** trace the a11y-snap-center handler in
`src/components/A11yLayer.ts` ↔ `src/scenes/interactions/PartitionInteraction.ts`,
confirm it still triggers `onSubmit` and that submission increments
`attemptCount` for the progress bar.

---

## Acceptance criteria (when this tracker can be deleted)

- All currently-skipped tests are either:
  - re-enabled and passing (preferred), or
  - deleted because the asserted behavior is no longer a product requirement.
- `tests/e2e/_fixture.ts` no longer needs the legacy onboarding flag once a
  cleaner pre-seed mechanism (e.g. a fixture-level `beforeEach` that writes
  `deviceMeta` directly via `page.evaluate`) lands.
