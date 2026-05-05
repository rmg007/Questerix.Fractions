# Plan: Fix Button Hit-Region Mismatches

**Date:** 2026-05-04
**Branch (when started):** `fix/2026-05-04-button-hit-regions`
**Status:** Draft — not yet implemented

## Problem

Several buttons across the app have visible/tactile mismatches between their visual extent and their actual interactive hit area. Symptoms:

- Text-only links (e.g. "Skip tutorial", "Privacy Notice →") only fire on the literal glyph bounds — the surrounding padding is dead.
- Secondary/tertiary session-complete buttons skip the shadow offset in their hit rectangle even though the shadow is part of the visual footprint.
- Choice/option buttons in interactions rely on default Phaser bounds (Text or Graphics) instead of explicit padded `Rectangle` hit areas.

The codebase already has the right pattern in `createStationButton`, `createActionButton`, and `createHintPillButton` (Container + explicit `Rectangle` hit area that includes shadow). The fix is to make every button match that pattern, not to invent a new one.

## Goals

1. Every interactive button has a hit rectangle ≥ its visible bounds (including any shadow drop).
2. Touch targets remain ≥ 44×44 CSS px (a11y rule from `CLAUDE.md`).
3. No visual regressions; no new dependencies; no behavior changes beyond hit area.
4. Consolidate the *recurring* helper logic, but don't refactor every scene's button system in one pass.

## Non-goals

- Redesigning button visuals.
- Building a unified Button component used everywhere (defer — too invasive for this fix).
- A11yLayer changes (already correctly registered per the audit).

## Phases

### Phase 1 — Audit + baseline (gate: report committed)

- Walk the audit list below and confirm each call site in current code (line numbers may have drifted).
- Add a Playwright assertion helper `expectHitAreaCoversVisual(testId)` that asserts the element's bounding-box click region matches its visual size within 2 px.
- No source changes yet. Commit only the test helper + an inventory file under `docs/30-architecture/`.

### Phase 2 — Fix all text-only & link buttons (gate: targeted E2E green)

**System-wide targets:**
All buttons where `setInteractive()` is called on a bare `Text`, `Graphics`, or unpadded `Rectangle` without explicit hit-area padding.

Call sites include:
- `src/scenes/OnboardingScene.ts` "Skip tutorial" link — wrap text in a transparent padded `Rectangle`
- `src/scenes/SettingsScene.ts` "Privacy Notice →" link (≈ line 295) — same pattern
- `src/scenes/SettingsScene.ts` back button (≈ line 339) — verify dims include visual padding
- `src/scenes/MenuScene.ts` all buttons (station buttons, title, etc.) — audit for consistency
- `src/scenes/LevelMapScene.ts` all buttons (level cards, nav, etc.)
- Any standalone Text/Graphics buttons in `src/components/` (ProgressBar, Mascot, FractionDisplay, etc.)

Pattern to apply (matches `createStationButton`):
```ts
const hit = scene.add.rectangle(0, 0, w + PAD * 2, h + PAD * 2, 0, 0)
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });
container.add([hit, label]);
```

Add a Playwright spec that exercises buttons by clicking at the edge of their visual bounds (±4 px) to verify hit area extends properly.

### Phase 3 — Fix all shadow-aware hit rectangles (gate: unit + E2E green)

**System-wide targets:**
All button factories that draw a shadow drop but don't include it in the hit area.

Call sites:
- `src/scenes/sessionComplete/buttons.ts` (`createButton`): hit rectangle uses `W × (H + SHADOW)` but SHADOW=0 for secondary/tertiary. Change so `HIT_PAD` constant is always ≥ visual shadow, even when shadow is not drawn.
- `src/components/PostSessionOverlay.ts` button factory (≈ line 228): same issue.
- `src/scenes/utils/levelTheme.ts` all button helpers (action, hint pill, etc.) — audit for shadow consistency.
- Any other button factory in `src/scenes/*/` that draws visual shadow.

Add a unit test that constructs each button variant and asserts `input.hitArea.height >= visualHeight`.

### Phase 4 — Sweep all interaction-archetype option buttons (gate: archetype E2E green)

**System-wide targets:**
Every file under `src/scenes/interactions/` (all 10 archetypes) that calls `setInteractive()` on a `Text` or `Graphics` object without an explicit `Rectangle` hit area.

For each option/choice button in all archetypes:
- Wrap the visual in a Container with a transparent padded Rectangle as the interactive surface
- Apply consistent `HIT_PAD = 8 px` (or scene-specific padding token)
- Re-run all existing archetype Playwright suites to verify no regressions

### Phase 5 — Extract shared helper (gate: typecheck + lint + all tests green)

Once Phases 2–4 land and the pattern is duplicated 4–6 times, promote it to `src/scenes/utils/buttonHitArea.ts`:

```ts
export function makeHitArea(width: number, height: number, padding = 8): Phaser.Geom.Rectangle
export function attachPaddedHitArea(target: Phaser.GameObjects.Container, w: number, h: number, padding?: number): void
```

Rewrite the call sites from Phases 2–4 to use the helper. No behavior change — this phase is pure dedup.

### Phase 6 — Phase-close docs (gate: PR merged)

- Append a learning to `.claude/learnings.md` (one-liner: the Phaser default-bounds gotcha for `Text`/`Graphics` `setInteractive`).
- If the helper API survives review, document it in `docs/30-architecture/` (new short note, not a full doc).
- Run `npm run sync:claude-md` if any agent/command frontmatter changed (none expected).

## Risk / rollback

- Risk: an oversized hit rectangle on a small button overlaps a neighbor and steals clicks. Mitigate by capping padding at `min(8 px, gap-to-neighbor / 2)` and adding a regression Playwright that clicks each neighbor in turn.
- Rollback: each phase is one PR; revert the offending phase if E2E regresses.

## Out-of-scope follow-ups (do not include in this branch)

- Unifying button visuals across MenuScene / Settings / SessionComplete.
- Migrating `unlockedLevels:<studentId>` localStorage to Dexie (tracked elsewhere).
