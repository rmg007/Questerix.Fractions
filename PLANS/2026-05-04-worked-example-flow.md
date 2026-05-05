# Plan: Implement "Show Me How" Worked-Example Flow

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-worked-example-flow`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 3 (Pedagogy). Runs after plan 7 (misconception-and-hint-system) so the demo CTA can rely on the hardened `hintLadder.state.exhausted` signal and the deepened tier 1–3 copy. All demo animations use the `tween()` wrapper, `Duration.*`, and `Ease.*` tokens from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md); reduced-motion is therefore inherited, not re-implemented per archetype. The demo CTA visuals consume `State.pressed` / `State.disabled` (during playback) from the same plan.

## Dependencies & blockers

| Plan | Relationship | Why |
|---|---|---|
| [interaction-and-motion-system](2026-05-04-interaction-and-motion-system.md) | Hard prerequisite | Demo animations call `tween()` from `motion.ts` and consume `Duration.*` / `Ease.*`; pressed/disabled states from `states.ts`. |
| [misconception-and-hint-system](2026-05-04-misconception-and-hint-system.md) | Hard prerequisite | The CTA gate depends on `hintLadder.state.exhausted` after that plan hardens it. |
| [button-hit-regions](2026-05-04-button-hit-regions.md) | Soft prerequisite | The CTA uses the padded hit-area helper if it has landed; otherwise applies the pattern locally. |
| [touchscreen-a11y-audit](2026-05-04-touchscreen-a11y-audit.md) | Coordinates | CTA included in touch-size and A11yLayer checks. |
| [visual-audit-and-cleanup](2026-05-04-visual-audit-and-cleanup.md) | Coordinates | Add a deterministic visual baseline once the demo state is reachable in Playwright. |
| [screen-reader-keyboard-parity](2026-05-04-screen-reader-keyboard-parity.md) | Coordinates | Demo start / end announce via the live region; CTA reachable by keyboard. |

## Execution order

Run Phase 1 before any UI work so every interaction has the same contract. Phase 2 can land with no-op method stubs, but production must keep the CTA hidden for any archetype whose demo is still a stub. Phase 3 should be split by interaction file groups if needed. Phase 4 should land after the first real demo implementation so the BKT/telemetry semantics are tested against actual behavior, not only plumbing.

Coordination:

- `2026-05-04-button-hit-regions.md`: the "Show me how" CTA must use the padded hit-area helper if that helper exists by the time Phase 2 starts.
- `2026-05-04-touchscreen-a11y-audit.md`: include the CTA in touch-size and A11yLayer checks.
- `2026-05-04-visual-audit-and-cleanup.md`: add a deterministic visual baseline for the CTA only after the state can be reached reliably in Playwright.

## Problem

After 4–5 wrong attempts on a single question, students hit a wall: they've exhausted hints (verbal → visual overlay → worked example) but are still failing. Current behavior: they're stuck, frustrated, and may abandon the level. No escape hatch exists.

**User request:** "After 10 wrong attempts, show me how to solve it AND solve it for me so I can learn and move to the next question."

**Pedagogy-reviewer finding:** The request is sound, but the threshold is too high (use 5, not 10) and the UX should be refined: show a worked example (animated demo), then require the student to re-attempt themselves (watching ≠ doing). This avoids gaming (guess 10 times, skip) while preserving the learning arc.

## Goals

1. After ≥5 wrong attempts + exhausted Tier 3 hint, offer a "Show me how" button.
2. Clicking the button plays an archetype-specific worked-example animation (1.5–2 sec).
3. Animation respects `prefers-reduced-motion` (instant reveal option).
4. After demo, student must re-attempt the question (button resets input focus, question state unchanged).
5. Re-attempt after demo counts normally toward BKT (correct = learning signal, incorrect = deeper confusion signal).
6. Fits within C9 budget (≤15 min/level): worst case is ~8.5 min on one question.
7. Preserve student agency: the demo explains the next action, but the student remains responsible for submitting the answer.
8. Smooth UX during the demo: the transition into and out of "playing" must feel intentional — fade, dim, pulse, never a hard cut.

## UX & animation contract

Every implementation must satisfy these UI rules. They are tested in Phase 2 (`tests/e2e/worked-example-ux.spec.ts`):

- **State transitions, all reduced-motion-safe via `motion.ts`:**
  - `hidden → available`: CTA fades in over `Duration.short` (160 ms) with a `Ease.spring` 4 px lift to draw attention without being noisy.
  - `available → playing`: scene background dims to 40 % opacity over `Duration.short`; the demo target keeps full opacity so it is the visual focal point.
  - `playing → reattempt`: scene opacity restores over `Duration.base` (240 ms); the next-input target (first choice button or drag origin) pulses once at scale 1.04 for 300 ms via `applyState(target, State.success)` so the child knows where to go next.
- **Focus management on `reset()`:** `reset()` MUST programmatically set keyboard focus on the first input (DOM mirror in A11yLayer) AND visually pulse the same target for 300 ms. Never leave focus on the "Show me how" button after demo end.
- **Interruptibility:** the demo is unskippable for the first 500 ms (prevents accidental dismiss). After 500 ms, a small "Skip" link appears bottom-right; tapping it jumps to `reset()` immediately. Tapping the dimmed background does NOT skip — too easy to mis-trigger.
- **Disabled-during-playback:** while `playing`, the CTA itself takes `State.disabled` (alpha 0.45, `interactive: false`). Normal interaction inputs are also disabled. "Disabled until next attempt begins" means: disabled until `reset()` completes AND the student's next pointerdown lands inside an input target — not just feedback dismissal.
- **Reduced-motion path:** when `prefers-reduced-motion` is true, the demo does NOT skip to 0 ms — children still need time to parse the final state. Show the completed state as a static overlay for 500 ms, then run `reset()`. The fade/dim transitions become instant (`Duration.instant`) but the 500 ms parse window is preserved.
- **Anti-double-tap:** the CTA debounces pointerdown at `Gesture.doubleTapWindowMs` (300 ms) so a child's accidental double-tap does not start two demos.

## Non-goals

- Auto-advancing after demo (student must re-do the action).
- Marking demo as "observation correct" for BKT (mastery ≠ watching).
- Auto-triggering the demo (only on student request).
- Skippable demos (the demo is the pedagogical intervention).
- Adding teacher/parent reporting for demo frequency.

## State machine

Use one shared gate for Level 1 and Levels 2–9:

Important naming constraint: the existing hint ladder already has `HintTier = 'worked_example'`. This feature should not invent a fourth persisted hint tier unless product semantics change. Treat "Show me how" as the student-controlled, animated delivery of the existing worked-example assistance after Tier 3 has been displayed/exhausted.

| State | Condition | UI |
|---|---|---|
| `hidden` | attempts < 5 OR Tier 3 hint not exhausted | No CTA |
| `available` | attempts ≥ 5 AND Tier 3 hint exhausted AND interaction supports `playWorkedExample` | Show enabled CTA |
| `playing` | CTA clicked | Disable CTA and normal inputs; play demo |
| `reattempt` | Demo resolved and `reset()` completed | Hide CTA; normal inputs restored; mark the next submitted attempt as assisted via `HintEvent.tier = 'worked_example'` / `Attempt.outcome = 'ASSISTED'` |

If an interaction has no implemented demo in Phase 2, keep the CTA hidden for that archetype and log the missing implementation in the phase inventory. Do not show a button that resolves to a no-op in production.

## Definition of done

- L1 and L2–L9 wrong-answer paths use the same derived gate and have separate regression tests.
- Every implemented demo has a reduced-motion path, reset behavior, and an E2E assertion that the next attempt is recorded normally.
- BKT cannot mark a skill `MASTERED` from demo-assisted correct answers alone.
- `npm run typecheck`, targeted Vitest, and targeted Playwright specs pass.

## Phases

### Phase 1 — Architecture + demo interfaces (gate: types compile, no impl)

Define the contract for worked-example animations:

1. **Extend the shared `Interaction` interface in [src/scenes/interactions/types.ts](src/scenes/interactions/types.ts):**

   Without this the generic dispatch from `LevelScene.activeInteraction` cannot call the demo or reset the question. Add two optional methods:
   ```ts
   export interface Interaction {
     // ...existing members...
     /** Plays an archetype-specific worked-example animation. Resolves when complete. */
     playWorkedExample?(): Promise<void>;
     /** Restores the interaction to its initial input-ready state without re-mounting
      *  (preserves scene state visible to the student during the demo). */
     reset?(): void;
   }
   ```
   `unmount()`+`mount()` is **not** an acceptable substitute — re-mounting destroys the scene state the student just observed during the demo.

2. **New interface co-located with the archetype runtime — NOT in `src/types/`:**

   `WorkedExamplePayload` and `WorkedExampleState` are archetype-internal contracts. Placing them in `src/types/` (which holds cross-cutting branded IDs and DB entity shapes) would pollute the top-level surface. Home them next to the implementation:

   ```ts
   // src/scenes/interactions/workedExample.ts
   export interface WorkedExamplePayload {
     question: QuestionPayload;
     answer: AnswerPayload;
     difficulty: 'easy' | 'medium' | 'hard';
   }

   export interface WorkedExampleState {
     isPlaying: boolean;
     // Per-archetype durations live in archetype config (see Phase 3 table).
     // Do NOT add `duration` to shared state — that misled prior drafts into
     // assuming a single shared value when the table shows 1.0–2.0 s spread.
   }
   ```

   Each archetype file imports from this module rather than from `src/types/`.

3. **Implement `playWorkedExample` + `reset` on each `InteractionXXX.ts` class:**
   Initial Phase-1 implementations: `playWorkedExample` resolves immediately (no-op) and `reset` restores input handlers. Actual animations land in Phase 3 per archetype.

4. **Update `interaction-model.md §4`** to document the demo tier and when it's offered.

5. **Wiring — boolean lives on the scene class, not the outcome-flow module.**
   `src/lib/levelSceneOutcomeFlow.ts` is a set of **stateless pure functions** — context is passed in, not owned. Therefore:
   - Add a class field `private showWorkedExampleButton = false` on **both** [src/scenes/LevelScene.ts](src/scenes/LevelScene.ts) **and** [src/scenes/Level01Scene.ts](src/scenes/Level01Scene.ts) (see gap #2 below — Level 1 has its own wrong-answer path that must be wired identically, or the feature does not ship for L1).
   - The outcome-flow module receives the current attempt count + `hintLadder.state.exhausted` as inputs and returns a derived `shouldOfferDemo` boolean; the scene stores that on the field and uses it to decide whether to render the button.
   - The "Show me how" click handler lives in the scene, calls `this.activeInteraction.playWorkedExample?.()`, then `this.activeInteraction.reset?.()`, then clears the field.
   - Extract the threshold to a named constant (`WORKED_EXAMPLE_ATTEMPT_THRESHOLD = 5`) in the smallest shared module both scenes can import.

### Phase 2 — UI: Add "Show me how" button + gating logic (gate: unit + E2E green)

1. **Wire BOTH wrong-answer paths — `LevelScene.ts` and `Level01Scene.ts`:**
   [src/scenes/Level01Scene.ts](src/scenes/Level01Scene.ts) has its own `onWrongAnswer()` method that is **completely separate** from `levelSceneOutcomeFlow.ts`. Adding the gating logic only to the L2–L9 router will silently skip Level 1. Both paths must run identical checks:
   - After logging a wrong attempt, check: `attempts >= 5 && hintLadder.state.exhausted`
   - If true, set `showWorkedExampleButton = true` and render the button (styled consistently with other CTAs, ≥44×44 px), entrance per the UX & animation contract above.
   - Button is disabled during demo playback **and** remains disabled until `reset()` completes AND the student initiates a fresh attempt (first pointerdown inside an input target). This prevents both spam-click during the demo and an instant re-trigger before the student has actually tried again.
   - Add a Playwright spec specifically for L1 (separate from the L2–L9 spec) so the L1 wiring cannot regress unnoticed.

2. **Playwright spec (`tests/e2e/worked-example-flow.spec.ts`):**
   - Answer a question wrong 5 times
   - Verify "Show me how" button appears after the 5th failure
   - Verify button is NOT shown if Tier 3 hint hasn't been exhausted yet
   - Verify button disappears if student attempts again (with or without demo)
   - **Negative test (Goal #4):** click the demo, wait for the demo to complete, and assert that NO `Attempt` row was written automatically — the system must wait for an explicit student submission. This is the goal-4 guarantee made explicit.

3. **UX spec (`tests/e2e/worked-example-ux.spec.ts`):** asserts the UX & animation contract above:
   - CTA fade-in duration matches `Duration.short`.
   - Background dims to 40 % opacity during `playing`.
   - Skip affordance hidden for the first 500 ms of `playing`, visible after.
   - Background tap during `playing` does NOT skip the demo.
   - On `reset()`, focus is on the first input target AND the target visually pulsed.
   - Reduced-motion mode shows the final state for 500 ms (not 0 ms) before `reset()`.
   - Double-tap on the CTA within 300 ms launches exactly one demo.

3. **A11yLayer:** Register the button with accessible label "Show me how to solve this question"

   UI requirements:
   - Hit target ≥44×44 px, or use the shared padded hit-area helper if available.
   - While the demo is playing, expose disabled state visually and to A11yLayer.
   - Do not cover the prompt, answer area, or hint content at 360 px.

4. **Anti-gaming gate must be testable.** The "must exhaust Tier 3" rule depends on `hintLadder.state.exhausted` being a reliable signal. Add a unit test in `tests/unit/components/HintLadder.spec.ts`:
   - Construct a `HintLadder`, advance through Tier 1 → 2 → 3, assert `state.exhausted === false` until Tier 3 has been *displayed* (not just unlocked).
   - Assert `state.exhausted === true` only after Tier 3 is on screen.
   - Reset between attempts: assert the flag does not persist across question changes.

   Without this test the gating logic is unverified and the anti-gaming claim is hollow.

### Phase 3 — Animations: Archetype-specific worked examples (gate: per-archetype E2E green)

Implement `playWorkedExample()` for each of the 10 interaction archetypes. Each animation must:
- **Duration:** 1.5–2 sec (fits C9 budget)
- **Respect `prefers-reduced-motion`:** if enabled, skip to instant final state (no tween, no transition)
- **Semantics:** show the correct action—draw the line, highlight the answer, animate the drag, etc.
- **Post-animation:** reset question state to initial (input focus ready for re-attempt)

Archetype-specific animations:

| Archetype | Demo | Duration | Implementation File |
|-----------|------|----------|---|
| `partition_halves`, `partition_thirds`, `partition_fourths` | Draw dividing line(s) smoothly to exact center | 1.5 sec | `PartitionInteraction.ts` |
| `equal_or_not` | Highlight regions + area meter showing equality | 1.5 sec | `EqualOrNotInteraction.ts` |
| `identify_half`, `identify_third`, `identify_fourth` | Glow/box the correct choice | 1.0 sec | `IdentifyInteraction.ts` |
| `make` | Animate correct drag path (origin → target) | 1.5 sec | `MakeInteraction.ts` |
| `snap_match` | Animate one correct snap + highlight | 1.5 sec | `SnapMatchInteraction.ts` |
| `compare` | Animate bars to align, show magnitude | 1.5 sec | `CompareInteraction.ts` |
| `benchmark` | Animate fraction to correct position on number line | 1.5 sec | `BenchmarkInteraction.ts` |
| `placement` | Animate placement answer to correct region | 1.5 sec | `PlacementInteraction.ts` |
| `order` | Animate cards to correct sequence order | 2.0 sec | `OrderInteraction.ts` |
| `explain_your_order` | Highlight correct explanation + animation (if applicable) | 1.5 sec | `ExplainYourOrderInteraction.ts` |

Playwright spec per archetype:
- Answer wrong ≥5 times
- Click "Show me how"
- Verify animation plays (or instant-reveals on reduced-motion)
- Verify question resets to initial state
- Verify next attempt is recorded normally
- Verify repeated clicks while the demo is playing do not start overlapping demos

### Phase 4 — Progression + telemetry (gate: unit + E2E green)

0. **Verify the existing `updateMastery` signature before designing the wrapper.**
   The `updateMastery(prev, correct, params, { assisted: true })` shape proposed below is illustrative — read [src/engine/bkt.ts](src/engine/bkt.ts) at branch start and confirm the actual exported function name(s) and argument order. Add a TODO at the top of this phase's PR description with the resolved signature so reviewers can check the wrapper matches.

1. **BKT integration — `consecutiveCorrectUnassisted` MUST reset after a demo.**
   [src/engine/bkt.ts](src/engine/bkt.ts) increments `consecutiveCorrectUnassisted` on every correct answer, and `MASTERED` requires `consecutiveCorrectUnassisted >= 3`. A correct answer immediately after watching the demo is **assisted** — the student just saw the solution. Without a reset, a student can game MASTERED state by watching 3 demos and copying them.
   - **Decision:** treat a correct re-attempt within the demo's same question as **assisted**: do NOT increment `consecutiveCorrectUnassisted`, and **reset it to 0** on the demo view. Posterior probability still updates normally; only the streak counter is gated.
   - Add an explicit assistance path to the pure BKT layer, e.g. `updateMastery(prev, correct, params, { assisted: true })` or a small wrapper that calls `updatePKnown` and resets the streak. Do not make scenes mutate `SkillMastery` counters by hand.
   - Document this rule in `docs/30-architecture/` next to the BKT description so future agents cannot regress it.

2. **Persistence — use existing rows first; avoid schema churn.** Current runtime types already define [src/types/runtime.ts](src/types/runtime.ts) `Attempt`, `HintEvent`, `AttemptOutcome = 'ASSISTED'`, and `HintTier = 'worked_example'`. Use those before adding fields:
   - Record the demo view as a `HintEvent` with `tier: 'worked_example'` using the existing `hintEventRepo.record` path; link it to the next submitted attempt just like other hints.
   - For a correct answer submitted after the demo, write the `Attempt` row with `outcome: 'ASSISTED'` rather than `EXACT`. Preserve the validator details in `validatorPayload` so replay/debugging can still see that the underlying action was correct.
   - Put `'worked_example'` in `hintsUsed` and the demo hint event id in `hintsUsedIds`.
   - Derive `demoViewed` in reports/tests from `attempt.outcome === 'ASSISTED' || attempt.hintsUsed.includes('worked_example')`; do **not** add a redundant boolean unless a query requirement appears.
   - **No Dexie version bump is expected in this phase.** Only bump [src/persistence/db.ts](src/persistence/db.ts) if the implementation adds an indexed field or changes a key path; optional non-indexed runtime fields do not require store-schema churn.
   - **Optional, env-gated:** if `VITE_OTLP_URL` is set, also fire a span attribute via the existing `src/lib/observability/tracer.ts` — do not introduce a new tracer/telemetry indirection.

3. **Unit tests:**
   - A correct re-attempt after demo updates BKT posterior upward but **does not increment `consecutiveCorrectUnassisted`**.
   - An incorrect re-attempt after demo still increments `totalAttempts` and updates BKT downward.
   - The `hintEvents` row for the demo persists `tier: 'worked_example'` and is linked to the eventual attempt.
   - A correct post-demo submission writes an `Attempt` with `outcome: 'ASSISTED'`, `hintsUsed` containing `'worked_example'`, and validator payload preserved.
   - Three consecutive correct answers — each preceded by a demo — leave the skill in `LEARNING`, not `MASTERED`.

4. **Privacy / C1-C10 check:**
   - Keep all demo telemetry local unless an existing env-gated observability path is explicitly configured.
   - Do not add new network egress.
   - Run the C1-C10 auditor before PR if persistence or observability files changed.

### Phase 5 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "Worked example + re-attempt is key: watching ≠ doing. Students must re-do after demo or learning doesn't transfer. Duration <2s is critical for C9 budget."
- Update `interaction-model.md §4` with demo tier definition and when it's offered.
- If a new helper `playWorkedExample` utility exists, document it in `docs/30-architecture/`.
- Run `npm run sync:claude-md` if any agent/command frontmatter changed.

## Risk / rollback

- **Risk:** Demo animations eat time budget; a student who demos 2–3 questions blows past the 15-min limit. Mitigate by keeping demos ≤2 sec and monitoring C9 compliance in CI.
- **Risk:** Students game the system: intentionally fail 5 times to skip to the demo. Mitigate by only offering the demo after Tier 3 hint is *exhausted* (not just available), so students must work through hints first.
- **Rollback:** Each phase is one PR; revert if E2E regresses or C9 budget is violated.

## Out-of-scope follow-ups

- Animated worked examples for future content (fractions in context, word problems).
- Adaptive retry logic based on BKT posterior (defer to a later phase if telemetry shows benefit).
- Parent/teacher dashboard reporting on which questions students demo most (future feature).
