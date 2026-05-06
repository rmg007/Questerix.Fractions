# Plan: Progression Tracking & Mastery Display

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-progression-mastery-display`
**Status:** COMPLETED — 2026-05-06
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2 (Pedagogy depth), runs in parallel with [2026-05-04-worked-example-flow.md](2026-05-04-worked-example-flow.md).

## Problem

The BKT engine tracks per-skill mastery (`UNSEEN → LEARNING → MASTERED`) and the persistence layer records every attempt + hint event. None of this surfaces to the learner. The progress bar shows "questions answered" — a completion metric — not "skills mastered" — the learning metric.

Two consequences:

1. Students cannot tell which fraction concepts they have actually learned vs. which they are merely getting through. A child who guesses correctly looks the same as one who has mastered halves.
2. Parents (informally — there is no admin UI per C2, but a child may show progress on the device) have no visible signal about which concepts need more practice.

## Goals

1. The in-level progress bar visually distinguishes attempt progress (linear) from skill mastery (per-skill state).
2. End-of-level summary lists each skill the level exercises, its BKT state, and which misconceptions were triggered + corrected.
3. Mastery summary persists to Dexie (`skillMastery` repo) — no localStorage extension (C5).
4. No new network egress; no admin / teacher UI surface (C1, C2).

## Non-goals

- Showing raw BKT probabilities to learners. Display is categorical (`Learning` / `Mastered`), not numeric.
- Cumulative cross-level dashboards. Future plan.
- Parent-facing share/export beyond what already exists. Plan 4's session-complete export covers the in-app surface.

## Definition of done

- Progress bar renders skill chips at 360 / 768 / 1024 px with WCAG AA contrast.
- End-of-level summary reads exclusively through the `skillMastery` repo and `attempt` repo; no direct BKT field access from scenes.
- Reduced-motion guard on every new tween (audited per `2026-05-04-touchscreen-a11y-audit.md` Phase 1 §7).
- A11yLayer registers the summary controls (Continue, Replay, Settings) per the `pushLayer` / `mountAction` / `popLayer` pattern.
- `npm run typecheck`, targeted Vitest, targeted Playwright (a11y + visual baseline) green.

---

## Phases

### Phase 1 — Repo + read-model (gate: types compile, unit green)

- Add `selectLevelMasterySummary(studentId, levelId)` in `src/persistence/repositories/skillMastery.ts` (or a sibling read-model file). Returns:
  ```ts
  type LevelMasterySummary = {
    skills: Array<{
      skillId: SkillId;
      label: string;       // human-readable, from skill registry
      state: 'UNSEEN' | 'LEARNING' | 'MASTERED';
      assistedCount: number;     // attempts marked outcome === 'ASSISTED'
      misconceptions: Array<{ code: string; firstSeenAt: number; corrected: boolean }>;
    }>;
    questionsAnswered: number;
    questionsCorrect: number;
  };
  ```
- Pure read; never writes. Unit tests cover empty / partial / full mastery scenarios.
- `corrected` is true iff a later attempt on the same skill submitted `outcome: 'EXACT'` (not `ASSISTED`) without that misconception triggering.

**Files to touch:**
- `src/persistence/repositories/skillMastery.ts`, `attempt.ts` (read paths only).
- `src/types/runtime.ts` for the new summary type.
- `tests/unit/persistence/skillMastery.spec.ts`.

### Phase 2 — Progress bar enrichment (gate: visual baseline + a11y green)

- Extend `src/components/ProgressBar.ts` to accept a `skills` prop alongside the existing question counter.
- Render a row of compact skill chips below the linear bar. State → color token mapping in `src/scenes/utils/colors.ts` (reuse semantic palette; do NOT introduce new hex values without WCAG AA verification — recall the 2026-05-03 primary-color learning).
- Reduced-motion: skill state transitions cross-fade at 0 ms when `prefers-reduced-motion` is on.
- A11yLayer: each chip has an aria-label of the form "{skillLabel}: {state}".
- Visual baseline at 360 px under [2026-05-04-visual-audit-and-cleanup.md](2026-05-04-visual-audit-and-cleanup.md)'s naming convention.

**Files to touch:**
- `src/components/ProgressBar.ts`.
- `src/scenes/utils/colors.ts` (only if a new semantic role is needed; prefer reuse).
- `tests/unit/components/ProgressBar.spec.ts`, `tests/e2e/visual/`.

### Phase 3 — End-of-level mastery summary (gate: E2E + a11y green)

- Extend `src/components/SessionCompleteOverlay.ts` to render the summary returned by `selectLevelMasterySummary`.
- Lay out: per-skill row with state pill, assistedCount badge if > 0, and a collapsed list of triggered misconceptions ("You worked through: half is bigger than whole — corrected").
- Three CTAs (Continue, Replay, Settings) — must be registered in A11yLayer per the 2026-05-03 SessionCompleteOverlay learning. Pair every `setInteractive()` with `A11yLayer.mountAction()`.
- Touch targets ≥ 44×44 (verified by [2026-05-04-button-hit-regions.md](2026-05-04-button-hit-regions.md)'s helper if it has landed; otherwise apply the padded-rectangle pattern locally).

**Files to touch:**
- `src/components/SessionCompleteOverlay.ts`, `src/components/sessionComplete/buttons.ts`.
- `tests/e2e/session-complete.spec.ts` (extend), `tests/a11y/session-complete.spec.ts`.

### Phase 4 — Persistence verification (gate: integration test green)

- Integration test: complete a scripted L1 run with a planted misconception (MC-WHB-01) → verify summary displays the corrected MC entry, and `skillMastery` row reflects the BKT state.
- Verify no Dexie schema bump is needed. If a new indexed field is required, follow the **two version bump** pattern (drop store at vN, recreate at vN+1) per the 2026-05-02 Dexie keyPath learning. **Default is no bump.**
- Run `c1-c10-auditor` against the diff to confirm no localStorage drift and no egress.

### Phase 5 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: one line if anything non-obvious surfaced (e.g., the read-model approach to avoid coupling scenes to BKT internals).
- Update `src/components/CLAUDE.md` if the ProgressBar / SessionCompleteOverlay contract changed.
- Update `docs/30-architecture/data-schema.md` if the read-model surface is new.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Skill chip row crowds the 360 px viewport. Mitigate by capping visible chips and providing a "+N more" affordance; defer overflow design to plan 3's visual audit if needed.
- **Risk:** `selectLevelMasterySummary` becomes a hot path inside the level loop. Mitigate by computing it only at level-complete time, not per-attempt.
- **Rollback:** each phase is one PR; revert independently. Phase 4 is the only one that could touch Dexie — keep that revert isolated.

## Out-of-scope follow-ups

- Cross-level dashboard (after Grade 3+ scope opens).
- Streak / badge gamification (defer; risk of distracting from learning per C10).
- Parent-share export — explicit non-goal under C2.
