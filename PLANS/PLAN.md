# Questerix Fractions — Active Plan

**Created:** 2026-05-02  
**Last cleaned:** 2026-05-02  
**MVP exit criterion:** A real student completes a 5-question L1 session in a real browser tab, confirmed via DevTools → IndexedDB.

---

## Active trackers

*(none — all trackers archived)*

---

## Closed phases

- Phase 0 — Validate ✅ (verified 2026-05-01 in a real Chromium tab)
- Phase 1 — Critical bugs (B1/B2/B3) ✅
- Phase 2 — Core features (D-1 unlock gate, UI-11 routing overlay, menu badges, gold ribbon) ✅
- Phase 3 — UX pre-playtest (10 task groups + T1 FeedbackOverlay visual specs) ✅
- Phase 4 — Harden (R-task closeout + LevelScene/Level01Scene refactor under budget) ✅
- Phase 5 — Production (CI hardening, E2E unblock, deferred manual items moved to MANUAL_VERIFICATION.md) ✅

---

## Backlog — E2E tests (archived from E2E_FOLLOWUPS.md 2026-05-02; clusters F+G fixed)

- **Cluster A** Mascot state sentinels — `tests/e2e/mascot-reactions.spec.ts` (8 tests skipped). `[data-testid="mascot-state"]` doesn't transition on correct/hint/wrong/complete events. Audit `Mascot.setState()` in `src/components/Mascot.ts`; reattach `data-state` attribute writes to the new state-machine pipeline.
- **Cluster B** Quest voice-line catalog — `tests/e2e/quest-wiring.spec.ts` (2 tests skipped). ARIA-live region shows the question header instead of the wrong-answer Quest line. Unit-cover `tests/unit/i18n/questWiring.test.ts` first, then trace wrong-answer path in `src/lib/levelSceneOutcomeFlow.ts` and confirm `announce()` call.
- **Cluster C** L6/L7 menu shortcuts — `tests/e2e/levels-2-9.spec.ts` (`level-card-L6`, `level-card-L7` skipped). Click no longer mounts `level-scene` sentinel. Confirm sentinel at `LevelScene.ts:233`; trace `fadeAndStart(this, 'LevelScene', { levelNumber: 6 })` to scene create.
- **Cluster D** 5-attempt session flake — `tests/e2e/level01.spec.ts:11`, `happy-path.spec.ts:11,101`. Times out mid-session when run sequentially (passes in isolation). Add `test.beforeEach` IndexedDB clear or set `workers: 'fullyParallel'` in playwright config.
- **Cluster E** ProgressBar a11y-snap-center — `tests/e2e/progress-bar.spec.ts:32`. `[data-testid="a11y-snap-center"]` click no longer increments `aria-valuenow`. Trace handler in `src/components/A11yLayer.ts` ↔ `src/scenes/interactions/PartitionInteraction.ts`; confirm `onSubmit` still fires and increments `attemptCount`.

---

## Backlog — Critical correctness (must fix before external playtest)

Extracted from `curriculum-completion-phase-3.plan.md` and `harden-and-polish.md` (both archived 2026-05-02).

### Curriculum correctness

- **C0.0 — Validator ID mismatch** `LevelScene.ts:322-327` falls back to `partitionEqualAreas` when validator lookup fails — L2–L9 answers scored by the wrong validator. Fix: migrate v1.json IDs to match registry names; delete silent fallback.
- **C0.0b — 3 math errors in shipped content** L9 ascending order is descending; L6 snap_match correctAnswer is 0.667 but target is 1/3; L1 ships 1/3 and 2/3 violating C8. Fix: re-author broken templates; add `check_correct_answers_well_formed` to verify.py.
- **C0.0c — 51 duplicate template IDs** 128 duplicate instances break hint mapping and runtime ID queries. Fix: re-id with `q:<archetype>:L<N>:<index>` pattern; add `check_unique_ids` to verify.py.
- **C0.0d — L6–L9 skill ID drift** L6 references L5 skill IDs (SK-18–21); BKT never tracks the right skills. Fix: remap L6–L9 skillIds to SK-21–SK-33.

### Data integrity (from harden-and-polish R1–R13)

- **R1–R2** `seedIfEmpty()` has no concurrency guard; `wipeStaticStores()` runs outside seed transaction → race on first load. `src/curriculum/seed.ts:54,73`
- **R3–R4** `HintEvent.attemptId` is always `''`; `HintEvent.id` typed string but Dexie stores number. `Level01Scene.ts:919`, `hintEvent.ts:14`
- **R5** `validatorRegistry.get(... as never)` swallows undefined — wrong-validator silent fallback. `Level01Scene.ts:752`
- **R6** Session creation silently collapses on error → 30 min of student data lost. `Level01Scene.ts:314–379`
- **R7** `Level01Scene.preDestroy()` doesn't destroy 4 components → memory leaks. `Level01Scene.ts:1331–1338`
- **R8** No global `window.onerror` handler (only `unhandledrejection`). `src/main.ts:6–13`
- **R9** `QuotaExceededError` not caught at per-write call sites. `src/persistence/repositories/*.ts`
- **R10** iOS Safari TTS missing `onvoiceschanged` listener → voice list empty on first render. `TTSService.ts:23–38`
- **R11** FeedbackOverlay contrast fails WCAG 1.4.3 (correct=2.52:1, incorrect=3.21:1). `FeedbackOverlay.ts:35–42`
- **R12** SkipLink targets `#qf-canvas` (unfocusable). `SkipLink.ts:46`
- **R13** localStorage C5 violation: `unlockedLevels:${studentId}` — pending Dexie migration (see `docs/30-architecture/progressionstat-migration-plan.md`).

---

## Backlog — UI/UX (pre-playtest polish, archived from ui-audit.md + ux-elevation.md 2026-05-02)

### Critical layout (S — Structural, from ui-audit.md)
- **S** Collapse three-island Level01/LevelScene layout: Check button y=1100→820, shape 340×260→520×340, hint pill 100×60 at y=720, Quest at (80,500). Files: `Level01Scene.ts`, `LevelScene.ts`, `PartitionInteraction.ts`.
- **UI-1** Drag handle: circular gripper r=20, `‹ ›` chevrons, 2-pulse on load. Files: `Level01Scene.ts`, `PartitionInteraction.ts`.
- **UI-S1** Partition line: navy #1E3A8A, 16 px solid, white 2 px outline, no dashes. Files: `Level01Scene.ts`, `PartitionInteraction.ts`.
- **UI-S2** Hint button: 100×60 px amber pill "💡 Need a hint?", pulse after 2 wrong. Files: `Level01Scene.ts`, `LevelScene.ts`.
- **UI-M1** MenuScene Play! button: move to y=760–840.
- **UI-M2** MenuScene Quest: center x≈400, y=500–580, scale 1.3–1.5×.

### Delight (from ux-elevation.md)
- **T25.A** `PreloadScene.ts` + `index.html`: adventure-background splash, fraction-tile SVG fade-in, navy loading chip.
- **T25.B** Smooth camera fade transitions on all `scene.start()` call sites (currently only some use `fadeAndStart`).
- **T25.C** Star strip progress bar: 5 hollow stars in top row, fill on each correct answer.
- **T26.A** Correct-answer sparkle: 6-point burst, 300 ms fade, depth 9. Files: `FeedbackOverlay.ts`.
- **T26.B** Trophy completion screen: star rating, fanfare SFX, `celebrate` mascot state. Files: `SessionCompleteOverlay.ts`.
- **T18** In-game theme polish: header pills, prompt panel border, hint button amber, TTS "read again" pill.
- **T27** Mascot component: `idle/think/cheer/cheer-big/oops` states via `setState()`, speech bubble.
- **T19** WorldMapScene: horizontal scroll, 9 region nodes.
- **UI-11** Post-session routing overlay in `LevelMapScene` (spec in archived `ui-audit.md`).

---

## Backlog — God-object refactor (serial, archived from refactor-god-objects-2026-05-01.md 2026-05-02)

LOC budgets: scenes ≤ 600, components ≤ 300.

| Sub-phase | File | Current LOC | Budget | Required |
|---|---|---|---|---|
| **4.1** | `src/scenes/Level01Scene.ts` | ~1648 | 600 | Extract layout, DOM/a11y, animation clusters |
| **4.2** | `src/scenes/LevelScene.ts` | ~801 | 600 | Extract chrome, hint flow, progression math |
| **4.3** | `src/scenes/MenuScene.ts` | ~923 | 600 | Extract station rendering, streak display, R13 Dexie migration |
| **4.4** | `src/components/Mascot.ts` | ~760 | 300 | Extract speech-bubble, idle-escalation timer |
| **4.5** | `src/scenes/SettingsScene.ts` | ~602 | 600 | Export/restore handlers (~1% extraction) |
| **4.7** | `src/components/SessionCompleteOverlay.ts` | ~527 | 300 | Extract animation + scoring math |

> Execute strictly serial. Gate: typecheck + lint + tests green AND file under budget before next sub-phase.

---

## Deferred (require explicit user authorization)

| Item | Risk | Notes |
|---|---|---|
| Sunset `Level01Scene.ts` (D-27 Path A) | HIGH | ~1648 LOC, 15 file deps. Side-by-side parity test + 2-week soak required. |
| `SessionService` pivot | HIGH | ~30 h. Only after Sunset proves impractical. |
| E2E parameterization L1–L9 | MEDIUM | Needs `data-testid` sentinels on LevelScene for L2–L9. |
| Tighten coverage gate 45 → 75% | MEDIUM | Real coverage ~77% with integration suite; low ROI until pipeline unified. |
| TS → Python validator parity (A2) | MEDIUM | Not blocking MVP; evaluate after deploy. |
| Audio pipeline (OpenAI pre-render) | LOW | Post-MVP; Web Speech TTS ships as placeholder. |

---

## How to start a session

1. Skim this file.
2. For E2E work, pick a cluster from `E2E_FOLLOWUPS.md` and branch off `main` with a date-stamped name.
3. For correctness work, pick one item from the Backlog sections above and open a `fix/` or `refactor/` branch.
4. Append findings here or in the cluster trackers — do not create new top-level plan files.
