# Plan: Screen-Reader, Keyboard & Cognitive A11y Parity

**Date:** 2026-05-04
**Branch (when started):** `a11y/2026-05-04-screen-reader-keyboard-parity`
**Status:** Draft — not yet implemented
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2. Runs after [2026-05-04-touchscreen-a11y-audit.md](2026-05-04-touchscreen-a11y-audit.md) Phase 3.

## Problem

[2026-05-04-touchscreen-a11y-audit.md](2026-05-04-touchscreen-a11y-audit.md) covers touch targets, font sizes, and reduced-motion. That is necessary but not sufficient for WCAG 2.1 AA on the audience this app serves:

- **A11yLayer is plumbed but not driven.** `npm run test:a11y` runs axe-core on rendered DOM, but no test exercises a full L1–L9 walkthrough using only the screen-reader DOM mirror. The 2026-05-03 SessionCompleteOverlay learning shows we have already shipped silent A11y regressions because the layer was forgotten.
- **Keyboard parity is implicit.** Each interaction *claims* to support keyboard, but no spec asserts you can solve every archetype with keyboard alone.
- **Screen-reader announcement order is unaudited.** Children using VoiceOver / TalkBack hear elements in an order determined by DOM insertion sequence; today that order is incidental, not designed.
- **Live-region announcements are missing.** Correct / incorrect feedback is visual + (planned) audio, but there is no `aria-live` region announcing "correct!" to a screen-reader user.
- **Cognitive load.** Children with attention or processing differences need: predictable structure, redundant signal channels (covered partially by feedbackBus), and the ability to slow or pause.

## Goals

1. End-to-end screen-reader walkthrough script (`tests/a11y/screen-reader-walkthrough.spec.ts`) drives L1–L9 using only DOM mirror events; passes axe-core at every step.
2. Keyboard parity spec asserts every archetype is solvable with `Tab`, arrow keys, `Enter`, and `Escape` (cancel) only.
3. `aria-live="polite"` region for non-urgent feedback, `aria-live="assertive"` for errors / completion. All transient state announced exactly once.
4. Designed announcement order documented per scene; A11yLayer mount order matches.
5. "Slow mode" preference: increases all `motion.ts:Duration.*` by 50 %, extends gesture hold/debounce thresholds. Toggle in SettingsScene.

## Non-goals

- Multilingual screen-reader output (covered by future i18n work).
- Magnification / zoom support beyond browser default. Phaser canvas scaling is good enough.
- Switch / sip-and-puff input. Defer.

## Definition of done

- Walkthrough spec covers every archetype × correct / incorrect / hint paths.
- Manual VoiceOver pass on iPhone SE recorded once; results in `audit/voiceover-pass-<date>.md`.
- Manual TalkBack pass on Android device recorded once; same.
- Settings has a "Slow mode" toggle wired to `motion.ts` and `interaction.ts` thresholds.
- A11y regression tests block merge on any regression.

---

## Phases

### Phase 1 — Announcement order audit (gate: doc committed)

- Walk every scene; list the order in which `A11yLayer.mountAction()` calls happen. Compare to the order a sighted user reads the screen (top → bottom, left → right at 360 px).
- Where order differs, decide and document per scene. Most scenes match; SessionCompleteOverlay and HintLadder are the suspect ones.
- Output: `docs/30-architecture/a11y-announcement-order.md` with a per-scene ordered list. This is the authoritative spec; mount order in code refers to it.

### Phase 2 — Live regions (gate: unit + a11y green)

- Add `src/lib/a11y/liveRegion.ts` exposing `announce(text, urgency: 'polite' | 'assertive')`.
- Mount one polite + one assertive `aria-live` region in `A11yLayer` root.
- Wire correct / incorrect feedback to call `announce`; wire ceremony / level-complete to assertive.
- Debounce: identical messages within 1 s collapse so axe-core does not see "correct! correct!" stuttering.
- Unit tests + a11y regression spec.

### Phase 3 — Keyboard parity per archetype (gate: per-archetype spec green)

For each of the 10 archetypes, write a Playwright spec that:

- Loads the level seed that exercises the archetype.
- Solves the question correctly using only keyboard input (`Tab`, arrows, `Enter`, `Escape`).
- Asserts the same `Attempt` outcome as the touch-driven test.

Where keyboard parity is not currently possible (e.g., a drag-only archetype), this phase adds the missing keyboard handlers — typically via "select with Enter, move with arrows, drop with Enter" pattern. Document any hard limitations with rationale.

### Phase 4 — End-to-end screen-reader walkthrough (gate: spec green)

- `tests/a11y/screen-reader-walkthrough.spec.ts` simulates a screen reader by reading the A11yLayer DOM mirror in announcement order and asserts each step yields a meaningful, non-empty announcement.
- Walks: MenuScene → student switcher → LevelMapScene → Level01 → first hint → correct answer → SessionCompleteOverlay → menu return.
- Run axe-core at each step; assert zero serious / critical violations.

### Phase 5 — Manual VoiceOver / TalkBack passes (gate: docs committed)

- Pair with [2026-05-04-cross-browser-and-device-matrix.md](2026-05-04-cross-browser-and-device-matrix.md) Phase 4 reference devices.
- Run a 15-minute scripted walkthrough on iPhone SE with VoiceOver on; record findings (announcement clarity, focus traps, role labels).
- Same on the Android reference with TalkBack.
- Output: `audit/voiceover-pass-<date>.md` and `audit/talkback-pass-<date>.md`. Bugs become PR-sized fixes.

### Phase 6 — Slow mode preference (gate: E2E green)

- Add `slowMode: boolean` to user preferences in `src/lib/preferences.ts`.
- When enabled, multiply `Duration.*` by 1.5, increase `Gesture.tapMaxDurationMs`, `longPressMs`, `dragCancelRevertMs` proportionally.
- Toggle lives in SettingsScene with copy: "Slow mode — gives you more time."
- Reduced-motion + slow mode are independent: a child can have animation off but interactions slowed.
- Spec asserts the multiplier is applied everywhere — uses the unified `motion.ts` so coverage is one assertion, not one per scene.

### Phase 7 — Cognitive-load review (gate: copy + ordering signed off)

- Pair with the SEL micro-copy concern in the recommendation list: re-read every "wrong" feedback string for tone. Replace any punitive phrasing ("That's not right") with neutral guidance ("Let's look again").
- Cap simultaneous on-screen elements per scene at a documented limit (e.g., MenuScene ≤ 9 actionable items at 360 px).
- Add a heading hierarchy lint: every scene exposes exactly one `h1`-equivalent heading via A11yLayer.

### Phase 8 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "Pair `setInteractive()` + `A11yLayer.mountAction()` is necessary but not sufficient — announcement order matters and is documented per scene."
- Update `src/components/CLAUDE.md` and `src/scenes/CLAUDE.md` with the live-region API.
- Run `npm run sync:claude-md`.

---

## Risk / rollback

- **Risk:** Live-region chatter overwhelms screen-reader users. Mitigate by rate-limiting and the polite-vs-assertive split; tune from the manual VoiceOver pass.
- **Risk:** Keyboard handlers added per archetype drift from touch behavior. Mitigate by routing both through the gesture grammar from the interaction-and-motion-system plan.
- **Risk:** Slow mode multiplier breaks an assumption deep in an archetype. Mitigate via the spec that runs the full L1 with slow mode on.
- **Rollback:** Each phase reverts independently. Phase 6 (slow mode) is the most invasive; behind a preference, so default-off rollback is trivial.

## Out-of-scope follow-ups

- Sign-language video alternative — non-trivial production effort.
- Switch / external-button input.
- High-contrast mode beyond what already exists in `colors-high-contrast.ts`.
- Voice control input (would require WebSpeech, runtime cost; revisit later).
