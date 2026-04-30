# engine/ — Learning Engine

Pure logic: BKT, item selection, misconception detection, calibration. No Phaser, no DOM, no IO.

## Files

- `bkt.ts` — Bayesian Knowledge Tracing. `updateMastery(prior, correct) → posterior`.
- `router.ts` — picks the next archetype within a level, given progression state + the level's archetype list.
- `selection.ts` — picks a specific `QuestionTemplate` within an archetype, balancing difficulty and avoiding recent repeats.
- `misconceptionDetectors.ts` — pattern matchers for `MC-WHB-*` (whole-board), `MC-MAG-*` (magnitude), `MC-PRX-*` (proximity). Take an `Attempt[]` and return `MisconceptionId[]`.
- `calibration.ts` — sets initial mastery priors per skill.

## Rules

- **Pure functions only.** No mutation of inputs, no global state, no random calls without an explicit `rng` parameter (so tests can seed).
- **Deterministic outputs.** Same input → same output. Selection must accept a seedable RNG.
- **No imports from `scenes/`, `components/`, `persistence/`.** This layer is the bottom of the dep graph.
- **Property-based tests** (`fast-check`) are expected for BKT bounds and selection invariants.

## Wiring

Scenes call into this layer at three moments: on attempt commit (`updateMastery`), on next-question request (`router.pickNext` then `selection.pickTemplate`), and on session end (detector pass over the session's attempts). Persistence is the scene's job, not the engine's.

## Active gap (G-E1)

`updateMastery()` is built and unit-tested but **not yet called from `Level01Scene.ts`**. Until that wire-up lands, no skill mastery state changes — the engine is dormant. Sprint 1 fixes this; see `PLANS/master-plan-2026-04-26.md`.
