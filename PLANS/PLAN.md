# Questerix Fractions — Active Plan

**Created:** 2026-05-02  
**Last cleaned:** 2026-05-02  
**MVP exit criterion:** A real student completes a 5-question L1 session in a real browser tab, confirmed via DevTools → IndexedDB.

---

## Active trackers

| File | Scope |
|---|---|
| [`PLANS/MANUAL_VERIFICATION.md`](./MANUAL_VERIFICATION.md) | Items requiring a human in a browser, on iPad hardware, or with Cloudflare auth — Phase 0 walkthrough, iPad Safari touch-drag, production deploy. |
| [`PLANS/E2E_FOLLOWUPS.md`](./E2E_FOLLOWUPS.md) | 7 skipped E2E clusters with fix paths (mascot, Quest catalog, L6/L7 chrome, multi-attempt flake, a11y touch targets, skip-link). |
| [`PLANS/refactor-god-objects-2026-05-01.md`](./refactor-god-objects-2026-05-01.md) | God-object refactor — Level01Scene → LevelScene migration. 6 serial sub-phases. |
| [`PLANS/ui-audit.md`](./ui-audit.md) | Visual/UX audit — critical layout, drag affordance, shape size, hint button. |
| [`PLANS/ux-elevation.md`](./ux-elevation.md) | Delight tasks — themed loading, star progress bar, celebration, trophy screen, mascot. |
| [`PLANS/visual-overlay-hints.md`](./visual-overlay-hints.md) | Tier-2 visual overlay hints for 7 archetypes (compare, equal_or_not, order, benchmark, label, make, snap_match). |

---

## Closed phases

- Phase 0 — Validate ✅ (verified 2026-05-01 in a real Chromium tab)
- Phase 1 — Critical bugs (B1/B2/B3) ✅
- Phase 2 — Core features (D-1 unlock gate, UI-11 routing overlay, menu badges, gold ribbon) ✅
- Phase 3 — UX pre-playtest (10 task groups + T1 FeedbackOverlay visual specs) ✅
- Phase 4 — Harden (R-task closeout + LevelScene/Level01Scene refactor under budget) ✅
- Phase 5 — Production (CI hardening, E2E unblock, deferred manual items moved to MANUAL_VERIFICATION.md) ✅

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

## Deferred (require explicit user authorization)

| Item | Risk | Notes |
|---|---|---|
| Sunset `Level01Scene.ts` (D-27 Path A) | HIGH | 1727 LOC, 15 file deps. Side-by-side parity test + 2-week soak required. |
| `SessionService` pivot | HIGH | ~30 h. Only after Sunset proves impractical. |
| E2E parameterization L1–L9 | MEDIUM | Needs `data-testid` sentinels on LevelScene for L2–L9. |
| Tighten coverage gate 45 → 75% | MEDIUM | Real coverage ~77% with integration suite; low ROI until pipeline unified. |
| TS → Python validator parity (A2) | MEDIUM | Not blocking MVP; evaluate after deploy. |
| Audio pipeline (OpenAI pre-render) | LOW | Post-MVP; Web Speech TTS ships as placeholder. |

---

## How to start a session

1. Skim this file and `MANUAL_VERIFICATION.md`.
2. For E2E work, pick a cluster from `E2E_FOLLOWUPS.md` and branch off `main` with a date-stamped name.
3. For correctness work, pick one item from the Backlog section above and open a `fix/` branch.
4. Append findings here or in the cluster trackers — do not create new top-level plan files.
