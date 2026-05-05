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

1. **New interface in `src/types/`:**
   ```ts
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

2. **Export skeleton from each `InteractionXXX.ts`:**
   ```ts
   export async function playWorkedExample(
     scene: Phaser.Scene,
     payload: WorkedExamplePayload
   ): Promise<void>
   ```
   
   Initial implementations return immediately (no-op). Actual animations added in Phase 3 per archetype.

3. **Update `interaction-model.md §4`** to document the demo tier and when it's offered.

4. **Add to `src/lib/levelSceneOutcomeFlow.ts`:**
   - New state: `showWorkedExampleButton` (boolean, true when attempts ≥ 5 and Tier 3 hint exhausted)
   - New event handler: when "Show me how" is clicked, call `playWorkedExample()`, then reset input focus

### Phase 2 — UI: Add "Show me how" button + gating logic (gate: unit + E2E green)

1. **In `src/scenes/LevelScene.ts` (or outcome flow):**
   - After logging a wrong attempt, check: `attempts >= 5 && hintLadder.state.exhausted`
   - If true, show a "Show me how" button (styled consistently with other CTAs, ≥44×44 px)
   - Button is disabled until next attempt attempt begins (prevent spam-clicking)

2. **Playwright spec:** 
   - Answer a question wrong 5 times
   - Verify "Show me how" button appears after the 5th failure
   - Verify button is NOT shown if Tier 3 hint hasn't been exhausted yet
   - Verify button disappears if student attempts again (with or without demo)

3. **A11yLayer:** Register the button with accessible label "Show me how to solve this question"

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

1. **BKT integration (no behavior change, just logging):**
   - Log demo view: `telemetry.logDemoViewed(questionId, archetypeName)`
   - Re-attempt after demo is treated as any other attempt: feeds into BKT normally
   - Do NOT mark demo as "correct" or inflate mastery estimates

2. **Unit test:** Verify that a correct re-attempt after demo increments `correctCount` and updates BKT upward; an incorrect re-attempt after demo still increments `totalAttempts` and updates BKT downward.

3. **Telemetry schema:** Add `demoViewed: boolean` to attempt telemetry. This lets the pedagogy team analyze: "Of students who watched a demo, what % got the next attempt right?"

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
