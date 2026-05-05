# Plan: Implement "Show Me How" Worked-Example Flow

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-worked-example-flow`
**Status:** Draft — not yet implemented

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

## Non-goals

- Auto-advancing after demo (student must re-do the action).
- Marking demo as "observation correct" for BKT (mastery ≠ watching).
- Auto-triggering the demo (only on student request).
- Skippable demos (the demo is the pedagogical intervention).

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
     duration: number; // milliseconds
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

### Phase 2 — UI: Add "Show me how" button + gating logic (gate: unit + E2E green)

1. **Wire BOTH wrong-answer paths — `LevelScene.ts` and `Level01Scene.ts`:**
   [src/scenes/Level01Scene.ts](src/scenes/Level01Scene.ts) has its own `onWrongAnswer()` method that is **completely separate** from `levelSceneOutcomeFlow.ts`. Adding the gating logic only to the L2–L9 router will silently skip Level 1. Both paths must run identical checks:
   - After logging a wrong attempt, check: `attempts >= 5 && hintLadder.state.exhausted`
   - If true, set `showWorkedExampleButton = true` and render the button (styled consistently with other CTAs, ≥44×44 px)
   - Button is disabled until next attempt begins (prevent spam-clicking)
   - Add a Playwright spec specifically for L1 (separate from the L2–L9 spec) so the L1 wiring cannot regress unnoticed.

2. **Playwright spec:** 
   - Answer a question wrong 5 times
   - Verify "Show me how" button appears after the 5th failure
   - Verify button is NOT shown if Tier 3 hint hasn't been exhausted yet
   - Verify button disappears if student attempts again (with or without demo)

3. **A11yLayer:** Register the button with accessible label "Show me how to solve this question"

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

### Phase 4 — Progression + telemetry (gate: unit + E2E green)

1. **BKT integration — `consecutiveCorrectUnassisted` MUST reset after a demo.**
   [src/engine/bkt.ts](src/engine/bkt.ts) increments `consecutiveCorrectUnassisted` on every correct answer, and `MASTERED` requires `consecutiveCorrectUnassisted >= 3`. A correct answer immediately after watching the demo is **assisted** — the student just saw the solution. Without a reset, a student can game MASTERED state by watching 3 demos and copying them.
   - **Decision:** treat a correct re-attempt within the demo's same question as **assisted**: do NOT increment `consecutiveCorrectUnassisted`, and **reset it to 0** on the demo view. Posterior probability still updates normally; only the streak counter is gated.
   - The "assisted" flag is the same `demoViewed: true` field defined in step 2 below — BKT consults it when deciding whether to bump the streak.
   - Document this rule in `docs/30-architecture/` next to the BKT description so future agents cannot regress it.

2. **Persistence — schema decision.** The plan previously called for adding `demoViewed` to "the attempt entity," but [src/types/entities.ts](src/types/entities.ts) does **not** define an `Attempt` row — attempts feed into BKT as `SkillMastery` upserts. Rather than introducing a new Dexie table + migration purely for one boolean, attach the field where it already exists:
   - Add `demoViewed: boolean` (default `false`) to the existing `hintEvents` row written by `Level01Scene.recordHint` and the LevelScene equivalent. The demo is conceptually a Tier-4 hint event; this keeps the schema flat.
   - Bump the Dexie version following the v8/v9 split-migration pattern documented in [src/persistence/db.ts](src/persistence/db.ts) (drop store at v(N), recreate at v(N+1) — Dexie 4 cannot change keypaths in place; this is a known footgun captured in `.claude/learnings.md`).
   - **No new `Attempt` table this phase.** If a real attempt entity is introduced later for richer telemetry, migrate `demoViewed` then.
   - **Optional, env-gated:** if `VITE_OTLP_URL` is set, also fire a span attribute via the existing `src/lib/observability/tracer.ts` — do not introduce a new tracer/telemetry indirection.

3. **Unit tests:**
   - A correct re-attempt after demo updates BKT posterior upward but **does not increment `consecutiveCorrectUnassisted`**.
   - An incorrect re-attempt after demo still increments `totalAttempts` and updates BKT downward.
   - The `hintEvents` row for the demo persists `demoViewed: true`.
   - Three consecutive correct answers — each preceded by a demo — leave the skill in `LEARNING`, not `MASTERED`.

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
