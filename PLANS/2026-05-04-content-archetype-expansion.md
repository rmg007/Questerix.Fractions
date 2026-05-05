# Plan: Content & Curriculum Expansion (Archetype Distribution + Question Variety + Level Polish)

**Date:** 2026-05-04
**Branch (when started):** `feat/2026-05-04-content-archetype-expansion`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 3 (Content & Curriculum). Runs largely independent of Phases 1–2; only blocker is plan 5's hint catalog landing first.

## Problem

Three content gaps surfaced in the comprehensive audit:

1. **Narrow archetype distribution.** Several levels rely on 2–3 of the 10 catalogued archetypes (`partition`, `identify`, `label`, `make`, `compare`, `snap_match`, `benchmark`, `placement`, `order`, `equal_or_not`). A child playing L3 may see only `partition` — fewer modalities than the same denominator concept warrants.
2. **Limited question variety inside each level.** Each archetype × level cell often has < 5 question variants. Replay value drops; BKT cannot calibrate well with so few samples.
3. **Onboarding + level transitions feel abrupt.** L1 is the child's first experience with the app; L5–L6 introduces thirds (a known harder concept) without narrative scaffolding.

This plan is content-side only: pipeline configuration, `LEVEL_META`, generated bundle. It does **not** touch interaction code or scenes (those edits belong in plans 1–6).

## Goals

1. Each L1–L9 exposes ≥ 5 distinct activity archetypes, ordered pedagogically (simpler → complex).
2. Each archetype × level cell has ≥ 5 question variants in the curriculum bundle.
3. Total curriculum question count up ≥ 30 % vs. the pre-plan baseline.
4. Halves → thirds → fourths progression preserved (C8); no fifths/sixths sneak in.
5. L1 onboarding is polished (mascot intro, first-partition visual cue) and L5 introduces thirds with an explicit narrative signpost.
6. `validate:curriculum`, validator parity, and `curriculum-byte-parity` subagent all pass.

## Non-goals

- New archetypes. The 10 catalogued archetypes are the complete set under MVP.
- Grade 3+ content (C3).
- Interaction code changes. If a new question variant exposes a bug in an interaction file, log it as a separate plan.
- Audio / TTS regeneration — see `PLANS/audio.md` for that scope.

## Definition of done

- `LEVEL_META` in `src/scenes/utils/levelMeta.ts` lists ≥ 5 archetypes per level, in pedagogical order documented inline.
- Pipeline output `pipeline/output/level_N/all.json` has ≥ 5 variants per archetype per level.
- `npm run build:curriculum` produces byte-identical `public/curriculum/v1.json` and `src/curriculum/bundle.json`; sha256 match enforced by `curriculum-byte-parity` subagent.
- `npm run validate:curriculum` passes; validator parity tests green.
- L1 + L5 spec files in `docs/10-curriculum/levels/` reflect the new content; `level-spec-parity` subagent green.
- Bundle size delta ≤ +120 KB gzipped (content text scales linearly; check `bundle-watcher`).

---

## Phases

### Phase 1 — Distribution + variety audit (gate: matrix committed)

- Walk current `LEVEL_META` and pipeline output; produce `audit/content-distribution.json` with the matrix `{ level, archetype, variantCount }`.
- Walk `docs/10-curriculum/levels/level-NN.md` for the documented intent vs. shipped reality. Flag drift.
- Run `pedagogy-reviewer` subagent against the existing level specs to capture its current verdict before edits.
- Output: prioritized gap list — which (level, archetype) cells need new variants, in what order, respecting C8 progression.

**Files touched (audit only):** `audit/content-distribution.json`, no source.

### Phase 2 — LEVEL_META expansion (gate: typecheck + level-spec-parity green)

- Update `src/scenes/utils/levelMeta.ts` to include the new archetype list per level. Order matters: simpler archetypes (identify, label) first, complex (compare, order) at the end.
- Update each affected `docs/10-curriculum/levels/level-NN.md` spec file in lockstep — the `level-spec-parity` subagent will block PR otherwise.
- Run `pedagogy-reviewer` on updated specs before pipeline regeneration; resolve any flagged ordering issues.

**Files to touch:**
- `src/scenes/utils/levelMeta.ts`.
- `docs/10-curriculum/levels/level-01.md` … `level-09.md`.

### Phase 3 — Pipeline regeneration (gate: validate:curriculum + parity green)

Pre-condition: plan 5 (`misconception-and-hint-system`) Phase 3 has shipped the hint-catalog schema extension. Otherwise the pipeline output will be missing the per-misconception hint variants and plan 5 will require a regeneration pass anyway.

Steps:

1. `cd pipeline && pip install -r requirements.txt`.
2. `ANTHROPIC_API_KEY=... python -m pipeline.generate --all` — Haiku 4.5 drafts, Sonnet 4.6 polishes.
3. Manual review pass: spot-check ≥ 3 questions per level for accuracy and age-appropriateness. Reject any that violate C8 (wrong denominator family) or C9 (too long to solve).
4. `npm run build:curriculum` — sync both runtime files.
5. `npm run validate:curriculum` — schema check.
6. Run `validator-parity-checker` subagent if any validator output shape was implied to change.
7. Commit `public/curriculum/v1.json`, `src/curriculum/bundle.json`, and `pipeline/output/` together. `curriculum-byte-parity` subagent will enforce the sha256 match.

**Files to touch:**
- `pipeline/output/level_*/all.json` (regenerated).
- `public/curriculum/v1.json`, `src/curriculum/bundle.json` (regenerated).

### Phase 4 — L1 onboarding polish (gate: E2E + a11y green)

- Refine `OnboardingScene.ts` and `Level01Scene.ts` first-question flow:
  - Mascot intro line, sized to fit 360 px without overflow.
  - Visual cue that points at the first partition target before the first interaction (1.5 s, reduced-motion-safe).
  - A11yLayer-registered.
- Hit areas use the helper from [2026-05-04-button-hit-regions.md](2026-05-04-button-hit-regions.md) Phase 5 if it has landed; otherwise apply the padded-rectangle pattern locally and note for follow-up consolidation.

**Files to touch:**
- `src/scenes/OnboardingScene.ts`, `src/scenes/Level01Scene.ts`, `src/components/Mascot.ts`.

### Phase 5 — L5 thirds-transition signpost (gate: visual baseline green)

- Add a one-screen narrative beat at the start of L5 ("New shape: thirds — three equal parts") that auto-dismisses after 2 s or on tap. Reduced-motion: instant render with manual dismiss only.
- Mascot delivers the line; reuse the existing `Mascot.setState('idle' | 'speaking')` API — do **not** add new states (recall the `mascot.idle()` vs `mascot.setState('idle')` learning).
- Visual baseline at 360 px per [2026-05-04-visual-audit-and-cleanup.md](2026-05-04-visual-audit-and-cleanup.md).

**Files to touch:**
- `src/scenes/LevelScene.ts` (Level 5 branch, behind the `LEVEL_META`-driven config).
- `src/components/Mascot.ts` only if a new line / pose is needed (avoid).

### Phase 6 — Phase-close docs (gate: PR merged)

- Update `docs/10-curriculum/levels/level-NN.md` if any level's question count or archetype list changed.
- Append to `.claude/learnings.md`: one line if anything non-obvious surfaced during pipeline regeneration (e.g., a Sonnet polish step that drifted on a specific archetype).
- Update `CHANGELOG.md` content section.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Pipeline regeneration produces age-inappropriate or mathematically wrong questions. Mitigate via the manual spot-check in Phase 3 step 3 + validator parity tests + `pedagogy-reviewer` subagent on every affected spec.
- **Risk:** Bundle size grows past 1 MB gzipped because of new content. Mitigate by watching `bundle-watcher`; if it trips, lazy-load per-level bundles instead of monolithic `v1.json` (separate plan).
- **Risk:** Manual `LEVEL_META` edits drift from generated content. Mitigate via the `level-spec-parity` and `curriculum-byte-parity` subagents — both block PR on drift.
- **Rollback:** Phase 3 (pipeline regen) is the highest-risk single commit. Keep it isolated so a single revert restores the previous bundle. Phases 4–5 (scene polish) revert independently.

## Out-of-scope follow-ups

- Adaptive difficulty within a level based on BKT (defer to a future plan).
- Per-archetype tutorial overlays (defer; current onboarding focus is L1 entry point only).
- Voice / TTS regeneration — covered separately by `PLANS/audio.md`.
- Content localization — defer until i18n is active.
