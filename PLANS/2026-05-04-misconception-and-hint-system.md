# Plan: Misconception Detection Expansion + Hint System Deepening

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-misconception-and-hint-system`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 3 (Pedagogy), runs **before** [2026-05-04-worked-example-flow.md](2026-05-04-worked-example-flow.md). Hint-reveal animations use the `tween()` wrapper and `Duration.short` / `Ease.out` from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md); the live-region announcement from [2026-05-04-screen-reader-keyboard-parity.md](2026-05-04-screen-reader-keyboard-parity.md) fires whenever a new hint tier renders so screen-reader users hear the same change sighted users see.

## Problem

Two pedagogy gaps surfaced in the comprehensive audit:

1. **Misconception detectors are underused.** `src/engine/misconceptionDetectors.ts`, `misconceptionRules.ts`, and `misconceptionRunner.ts` exist, but a synthetic L1–L9 playthrough triggers far fewer MC-* codes than the catalog defines (`docs/10-curriculum/misconceptions.md`). When a student makes the classic "whole-half-bigger" or "magnitude-by-numerator" error, the system records "wrong" but does not classify it, and downstream hint selection cannot react.
2. **Hints are generic.** The 3-tier ladder (verbal → visual overlay → worked-example) plays the same copy for every wrong path. Tier 1 says "look at the denominator" whether the student's misconception is MC-WHB-01, MC-MAG-02, or a slip. Children get the same nudge for very different errors.

The fix is to (a) close the detector coverage gap so MC-* triggers fire on the errors the catalog already documents, and (b) make hint copy misconception-aware so tier 1 actually addresses the inferred error.

## Goals

1. ≥ 15 distinct MC-* codes trigger during a scripted L1–L9 wrong-answer playthrough.
2. Every detector has a unit test exercising the positive and at least one near-miss negative case.
3. Tier 1 + Tier 2 hint copy varies by detected misconception for each archetype that has > 1 catalogued MC-* code.
4. Hint catalog is part of the curriculum bundle (built by `npm run build:curriculum`), not hard-coded in scene files.
5. `hintLadder.state.exhausted` remains a reliable signal for downstream gates (the worked-example feature in plan 4 depends on it).

## Non-goals

- Inventing new MC-* codes. This plan closes the coverage gap on the existing catalog; new misconceptions go through the curriculum review process.
- Changing the 3-tier ladder structure (verbal → visual overlay → worked-example). Plan 4 owns the worked-example tier delivery.
- Animating hint reveals. Reduced-motion compliance for hint UI is owned by [2026-05-04-touchscreen-a11y-audit.md](2026-05-04-touchscreen-a11y-audit.md) Phase 1 §7.

## Definition of done

- Detector unit tests cover every MC-* code listed in `docs/10-curriculum/misconceptions.md` (positive + 1 negative each).
- Hint catalog round-trips through `build:curriculum` and validates against the schema.
- Synthetic playthrough script (committed under `tests/integration/`) reports ≥ 15 distinct MC-* triggers across L1–L9.
- `npm run typecheck`, targeted Vitest, validator parity tests, and targeted Playwright specs pass.
- Bundle size delta ≤ +30 KB gzipped (hint copy is text; lazy-load if it exceeds budget).

---

## Phases

### Phase 1 — Coverage audit (gate: report committed, no source changes)

- Walk `docs/10-curriculum/misconceptions.md` and produce a coverage matrix: every MC-* code × archetype × current detector status (`detected` / `partial` / `missing`).
- Run a scripted L1–L9 wrong-answer playthrough that injects each catalogued error pattern and records which MC-* codes the runner emits.
- Output: `audit/misconception-coverage.json` listing gaps; commit it under `audit/`.
- Identify the smallest set of new detector rules that would close the gaps. Order by frequency observed in the K–2 tester feedback in `PLANS/_archive/` so the most common errors get targeted hint copy first.

### Phase 2 — Detector expansion (gate: unit + parity tests green)

- Add detector rules in `src/engine/misconceptionRules.ts` (declarative form) or `misconceptionDetectors.ts` (procedural fallback) for every gap from Phase 1.
- One test per rule in `tests/unit/engine/misconceptionDetectors.spec.ts`: positive case + at least one near-miss negative (e.g., MC-MAG-02 must NOT fire when the student is right but slow).
- Determinism: detectors are pure; route any randomness through `src/engine/ports.ts` per the engine-determinism rule.
- Validator parity: if a detector reads validator output shape that the Python clones in `pipeline/validators_py.py` also produce, run the parity fixtures.

**Files to touch:**
- `src/engine/misconceptionRules.ts`, `misconceptionDetectors.ts`, `misconceptionRunner.ts` (additive only — do not change existing rule semantics in this plan).
- `tests/unit/engine/misconceptionDetectors.spec.ts`.

### Phase 3 — Hint catalog in the curriculum bundle (gate: build:curriculum + schema validate green)

The current hint copy is scattered across scene files and `src/components/HintLadder.ts`. Move it into the curriculum pipeline so:

- Hint variants are authored alongside questions (one author, one review pass).
- Tier 1 and Tier 2 copy can branch on detected MC-* code without scene-side switch statements.
- The build step keeps `public/curriculum/v1.json` and `src/curriculum/bundle.json` byte-identical.

Steps:

1. Extend the curriculum schema (`pipeline/schema/`) with a `hints` block per question:
   ```json
   "hints": {
     "tier1": { "default": "...", "byMisconception": { "MC-WHB-01": "...", "MC-MAG-02": "..." } },
     "tier2": { "default": "...", "byMisconception": { "...": "..." } },
     "tier3": { "workedExampleRef": "wx-partition-thirds-001" }
   }
   ```
2. Update the pipeline (`pipeline/generate.py`) so Haiku 4.5 drafts variants and Sonnet 4.6 polishes; existing two-model architecture is unchanged.
3. Update validator parity fixtures to assert the new shape round-trips.
4. Run `npm run build:curriculum`; commit both bundle files together (curriculum-byte-parity subagent will block otherwise).

**Files to touch:**
- `pipeline/schema/`, `pipeline/generate.py`, `pipeline/validators_py.py` (only if validator output shape changes).
- `src/curriculum/bundle.json`, `public/curriculum/v1.json` — generated.
- `src/types/runtime.ts` — extend the question payload type to include the hints block (additive optional fields).

### Phase 4 — Hint runtime selection (gate: unit + E2E green)

- Add `selectHintCopy(question, tier, lastDetectedMisconception): string` in a new `src/engine/hintSelection.ts`. Pure function; no scene imports.
- Wire `HintLadder` to call `selectHintCopy` instead of reading scene-local strings. The misconception input comes from the most recent `misconceptionRunner` result for the active attempt.
- Preserve `hintLadder.state.exhausted` semantics exactly — it must still flip to `true` only after Tier 3 has been **displayed** (not just unlocked). Plan 4 (worked-example) depends on this and will add a unit test asserting the contract.
- A11yLayer: ensure the new copy reaches the DOM mirror; do not regress the `pushLayer` / `mountAction` pattern documented in the recent SessionCompleteOverlay learning.

**Files to touch:**
- `src/engine/hintSelection.ts` (new), `src/engine/index.ts` (export).
- `src/components/HintLadder.ts`.
- `tests/unit/engine/hintSelection.spec.ts` (new), `tests/unit/components/HintLadder.spec.ts` (extend).

### Phase 5 — Synthetic playthrough harness (gate: ≥ 15 triggers asserted)

- Add `tests/integration/synthetic-playthrough.spec.ts` that walks L1–L9 in a deterministic seed, intentionally producing the catalogued error patterns, and asserts the set of MC-* codes triggered ≥ 15 distinct codes.
- This test is the durable regression gate: future content changes that break detector coverage fail here.

### Phase 6 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: one line on misconception → hint binding (e.g., "Hint copy must come from the curriculum bundle, not scene files — otherwise the build:curriculum gate cannot enforce parity").
- Update `docs/10-curriculum/misconceptions.md` if any catalog wording was clarified during the work.
- Update `src/engine/CLAUDE.md` and `src/components/CLAUDE.md` if the runtime selection contract changed.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** detector overfires (false positives) and the hint becomes irrelevant. Mitigate via the negative-case unit tests in Phase 2 and the synthetic playthrough in Phase 5.
- **Risk:** hint catalog inflates the bundle past 1 MB gzipped. Mitigate by lazy-importing tier 3 copy per archetype and watching `bundle-watcher`.
- **Rollback:** each phase is one PR; phase 3 is the riskiest because it touches the curriculum bundle — revert is one commit and `build:curriculum`.

## Out-of-scope follow-ups

- Adaptive hint sequencing (skip tier 1 if the student has already mastered the relevant skill in BKT). Defer to a future plan.
- Voice / TTS hint delivery — owned by the audio plan (`PLANS/audio.md`).
- Multilingual hint variants — defer until i18n is active.
