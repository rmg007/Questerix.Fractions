# Phase 16: Full-Spectrum LOC Hardening (7 Sub-Phases)

**Goal:** Reduce 7 god files below their LOC targets to improve maintainability and testability.

**Scope:** Sequential refactoring of: LevelScene, MenuScene, Mascot, SessionCompleteOverlay, LevelVignette, SettingsScene, Level01Scene.

**Duration:** ~4.5 hours across 3–4 sessions (45–60 min per sub-phase).

**Rollback Strategy:** Each sub-phase commits independently. If a sub-phase fails its gate, `git reset --hard HEAD~1` reverts cleanly.

---

## 16.1: LevelScene (806 → ≤600 LOC)

**Current state:** 806 LOC in `src/scenes/LevelScene.ts`

**Savings target:** 206 LOC via context builders and consolidated helpers.

### Extraction targets:

1. **Context builder consolidation (92 LOC saved)**
   - `loadQuestion()` (lines 367–458) and `onSubmit()` (lines 460–549) both build identical `QuestionFlowContext` and `QuestionFlowCallbacks` with ~92 LOC of near-duplicate code.
   - Extract to `src/scenes/utils/levelSceneContextBuilder.ts`:
     - `buildQuestionFlowContext()` helper
     - `buildQuestionFlowCallbacks()` helper
   - Replace duplicate inline logic with two function calls (~8 LOC total).
   - **Gate:** Both `loadQuestion()` and `onSubmit()` call builders; no change in behavior.

2. **HintHelper object extraction (62 LOC saved)**
   - Methods: `onHintRequest()`, `showHintForTier()`, `pulseHintButton()`, `questHintText()` (lines 554–668, ~115 LOC).
   - Move to `src/scenes/controllers/HintController.ts` (if not already done).
   - Expose hint state via getters: `getHintLadder()`, `getCurrentQuestionHintIds()`.
   - Call instance methods from LevelScene: `this.hintController.onHintRequest(...)`.
   - **Gate:** Hint behavior unchanged; controller instantiated in `constructor` and reset in `reset()`.

3. **ProgressionHelper object extraction (94 LOC saved)**
   - Methods: `openSession()`, `recordAttempt()`, `closeSession()`, `persistLevelCompletion()`, `showSessionComplete()` (lines 672–765, ~94 LOC).
   - Move to `src/scenes/controllers/ProgressionController.ts` (if not already done).
   - Expose via getters: `getSessionId()`, `getAttemptCount()`, `getCorrectCount()`, `getStudentDisplayName()`.
   - Call instance methods from LevelScene.
   - **Gate:** Session behavior unchanged; controller instantiated and reset symmetrically.

4. **State consolidation (40 LOC saved)**
   - Reduce field declarations (lines 88–132, currently 44 fields).
   - Move hint-related fields to `HintController` (2 fields).
   - Move progression-related fields to `ProgressionController` (4 fields).
   - Keep only core flow state in LevelScene (currentQuestion, currentQuestionIndex, wrongCount, responseStartMs, lastPayload, activeInteraction, currentRoundEvents).
   - **Gate:** All fields reachable via controllers or local scope; no undefined refs.

5. **Utility function inlining (20 LOC saved)**
   - Audit `validate()` calls (lines 785–797) and feedback helpers (lines 799–806).
   - Inline trivial single-use wrappers into caller sites.
   - **Gate:** No loss of clarity; inline versions are equally readable.

### Sequence:

1. Create `src/scenes/utils/levelSceneContextBuilder.ts` with `buildQuestionFlowContext()` and `buildQuestionFlowCallbacks()`.
2. Create or update `src/scenes/controllers/HintController.ts` with all hint methods.
3. Create or update `src/scenes/controllers/ProgressionController.ts` with all progression methods.
4. Refactor `LevelScene.ts`: replace context-building code with builder calls, move fields to controllers.
5. Run `npm run typecheck && npm run lint && npm run test:unit` — must be 100% green.
6. Verify `LevelScene.ts` is ≤600 LOC: `wc -l src/scenes/LevelScene.ts`.
7. Commit: `git add ... && git commit -m "refactor(phase-16.1): extract HintController, ProgressionController, and context builders — LevelScene 806→≤600 LOC"`

---

## 16.2: MenuScene (940 → ≤600 LOC)

**Current state:** 940 LOC in `src/scenes/MenuScene.ts`

**Savings target:** 340 LOC via layout consolidation, menu-item extraction, and state machine simplification.

### Key areas:
- Layout builder consolidation (repeated grid/row construction patterns) → 90 LOC savings.
- MenuItem component extraction → 80 LOC savings.
- StudentSelector modal refactor → 100 LOC savings.
- State transition logic consolidation → 70 LOC savings.

### Gate criteria:
- `npm run typecheck && npm run lint && npm run test:unit` green.
- `wc -l src/scenes/MenuScene.ts` ≤ 600.

---

## 16.3: Mascot (775 → ≤300 LOC)

**Current state:** 775 LOC in `src/components/Mascot.ts`

**Savings target:** 475 LOC via animation builder extraction and state machine consolidation.

### Key areas:
- Animation state builders (idle, speak, think, celebrate, etc.) → 150 LOC extraction.
- Lip-sync audio handler → 80 LOC extraction.
- Gesture timing logic → 70 LOC extraction.
- State machine simplification (consolidate repeated `setState()` patterns) → 175 LOC savings.

### Gate criteria:
- `npm run typecheck && npm run lint && npm run test:unit` green.
- `wc -l src/components/Mascot.ts` ≤ 300.

---

## 16.4: SessionCompleteOverlay (540 → ≤300 LOC)

**Current state:** 540 LOC in `src/lib/levelSceneSessionComplete.ts`

**Savings target:** 240 LOC via button factory consolidation and modal state extraction.

### Key areas:
- Retry/Next/Menu button builders (repeated setInteractive patterns) → 90 LOC extraction.
- Score display and medal logic → 70 LOC consolidation.
- Modal background and animation builders → 80 LOC extraction.

### Gate criteria:
- `npm run typecheck && npm run lint && npm run test:unit` green.
- `wc -l src/lib/levelSceneSessionComplete.ts` ≤ 300.

---

## 16.5: LevelVignette (993 → ≤300 LOC)

**Current state:** 993 LOC in `src/lib/levelVignette.ts`

**Savings target:** 693 LOC via layout builders and animation consolidation.

### Key areas:
- Title/subtitle layout builders → 150 LOC extraction.
- Animation state machine (intro, loop, outro) → 200 LOC consolidation.
- Reward animation builders → 150 LOC extraction.
- Dialog system refactor → 193 LOC savings.

### Gate criteria:
- `npm run typecheck && npm run lint && npm run test:unit` green.
- `wc -l src/lib/levelVignette.ts` ≤ 300.

---

## 16.6: SettingsScene (602 → ≤600 LOC)

**Current state:** 602 LOC in `src/scenes/SettingsScene.ts`

**Savings target:** 2 LOC via lightweight consolidations (near-target already).

### Key areas:
- Minor utility consolidations and dead-code removal → 2+ LOC savings.
- Focus on code clarity rather than aggressive extraction.

### Gate criteria:
- `npm run typecheck && npm run lint && npm run test:unit` green.
- `wc -l src/scenes/SettingsScene.ts` ≤ 600.

---

## 16.7: Level01Scene (639 → ≤600 LOC)

**Current state:** 639 LOC in `src/scenes/Level01Scene.ts`

**Savings target:** 39 LOC via helper extraction and consolidation.

### Key areas:
- Validation helper consolidation → 15 LOC savings.
- State transition logging → 10 LOC savings.
- Utility function inlining → 14 LOC savings.

### Gate criteria:
- `npm run typecheck && npm run lint && npm run test:unit` green.
- `wc -l src/scenes/Level01Scene.ts` ≤ 600.

---

## Cross-Phase Principles

1. **Extract top-down by method size:** prioritize extraction of methods >50 LOC.
2. **Consolidate duplicate patterns:** if two methods do nearly the same thing, merge them.
3. **Gate religiously:** each sub-phase commits only after **both** typecheck and LOC targets are met.
4. **No behavioral changes:** refactoring only; logic remains identical.
5. **Preserve A11y:** all A11yLayer mount/unmount calls survive extraction.

---

## Timeline

- **16.1** (45–60 min): context builders + controllers → LevelScene ≤600 LOC
- **16.2** (45–60 min): layout + menu consolidation → MenuScene ≤600 LOC
- **16.3** (45–60 min): animation extraction + state machine → Mascot ≤300 LOC
- **16.4** (45–60 min): button factories + modal state → SessionCompleteOverlay ≤300 LOC
- **16.5** (45–60 min): layout builders + animation → LevelVignette ≤300 LOC
- **16.6** (15–30 min): lightweight consolidation → SettingsScene ≤600 LOC
- **16.7** (15–30 min): helper extraction → Level01Scene ≤600 LOC

**Total: ~4.5 hours across 3–4 sessions**

---

## Success Criteria (Phase 16 complete)

✓ All 7 files below LOC target  
✓ `npm run typecheck` green  
✓ `npm run lint` green (0 warnings)  
✓ `npm run test:unit` green  
✓ `npm run test:e2e` green (smoke suite)  
✓ 7 sequential commits in git history, each titled `refactor(phase-16.N): ...`  
✓ No behavioral changes (QA smoke test passes)
