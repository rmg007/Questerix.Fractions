# Plan: Touchscreen Accessibility Audit & Remediation

**Date:** 2026-05-04
**Branch (when started):** `audit/2026-05-04-touchscreen-a11y`
**Status:** COMPLETED 2026-05-05 — all phases merged to main via fix/2026-05-05-touchscreen-a11y
**Part of:** [2026-05-04-roadmap.md](2026-05-04-roadmap.md) — Phase 2 (Touch + perf + reliability). Phase 3 hard-gates on plan 1 Phase 4 merge; Phases 1–2, 5 are audit-only and may run anytime. Reduced-motion compliance (Phase 1 §7) is enforced architecturally via the `motion.ts:tween()` wrapper from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md) — this plan's audit becomes a regression check, not a vigilance task.

## Dependencies & blockers

| Plan | Relationship | Why |
|---|---|---|
| [interaction-and-motion-system](2026-05-04-interaction-and-motion-system.md) | Hard prerequisite | Reduced-motion compliance is enforced via the `tween()` wrapper there; this plan checks the result, doesn't re-implement. |
| [button-hit-regions](2026-05-04-button-hit-regions.md) | Hard prerequisite for Phase 3 | Phase 3 hard-gates on its Phase 4 merge; conflict surface in `interactions/` is too large to rebase otherwise. |
| [visual-audit-and-cleanup](2026-05-04-visual-audit-and-cleanup.md) | Coordinates baselines | Use that plan's Playwright visual baselines as evidence; do not duplicate golden images. |
| [worked-example-flow](2026-05-04-worked-example-flow.md) | Coordinates | Demo CTA included in checks. |
| [performance-and-drag-latency](2026-05-04-performance-and-drag-latency.md) | Coordinates | The pointer-to-paint metric is owned there; this plan's audit references that data rather than re-measuring. |

## Sequencing dependency

This plan **must run after `2026-05-04-button-hit-regions.md`** completes. That plan fixes the *mechanism* (padded hit rectangles in the right pattern); this plan validates *compliance* (every interactive element ≥44×44 across the app, fonts/spacing readable). Running in parallel will produce merge conflicts in `MenuScene.ts`, `SettingsScene.ts`, `OnboardingScene.ts`, and the `interactions/` archetypes — all of which both plans touch. If button-hit-regions is in-flight, this plan's Phase 3 (critical fixes) is blocked; Phases 1–2 (audit only) may proceed.

**Hard gate:** Phase 3 of this plan is **blocked by**: `button-hit-regions.md` Phase 4 (interaction sweep) **merged to main**. Do not open a Phase-3 PR while button-hit-regions Phase 4 is still in review — the conflict surface in `src/scenes/interactions/*` is too large to rebase cleanly. Phases 1, 2, 5 (audit and responsive) of this plan have no such block and may run anytime.

## Execution order

1. Phase 1 and Phase 2 may run immediately as audit-only work.
2. Phase 5 may run as a read-only responsive audit, but any source fixes it identifies should wait for Phase 3/4.
3. Phase 3 begins only after `2026-05-04-button-hit-regions.md` Phase 4 is merged.
4. Phase 4 follows Phase 3 so critical usability blockers do not get mixed with lower-risk typography cleanup.
5. Phase 6 closes the phase with docs and learnings.

## Problem

Questerix Fractions targets K–2 students on touchscreen devices (iOS Safari, Android Chrome, per C7). Current codebase has not been systematically audited for touchscreen usability:

- Are all interactive elements ≥44×44 CSS px (WCAG 2.5.5 touch target minimum)?
- Are font sizes readable on 360 px screens (smallest in C7 range)?
- Is spacing between buttons adequate to prevent mis-taps?
- Do components scale properly from 360 px to 1024 px?

Without this audit, we risk shipping a game that frustrates young learners due to tiny buttons, unreadable text, or cramped layouts.

## Goals

1. Audit **every interactive component and button** for touch-friendliness.
2. Identify size/font violations with specific measurements (actual vs. required).
3. Prioritize fixes by impact (buttons > text > spacing).
4. Ensure responsive scaling across C7's device range (360–1024 px).
5. Achieve **100% compliance** with WCAG 2.5.5 (touch targets) + readability standards.

## Non-goals

- Redesigning layouts (defer unless critical).
- Changing visual style (only size/spacing).
- Re-auditing the full visual regression baseline; screenshot baselines belong in `2026-05-04-visual-audit-and-cleanup.md`.

## Severity model

- **CRITICAL:** blocks touch use or comprehension on the C7 minimum viewport: targets <44×44, drag handles <48 px on smaller axis, body/question text <16 px, button labels <14 px, horizontal overflow at 360 px, missing reduced-motion guard on user-triggered animation.
- **WARNING:** usable but below preferred K–2 ergonomics: adjacent controls <8 px apart, small helper text 12–13 px, cramped line height, inconsistent responsive spacing.
- **INFO:** visual polish or future affordance: icon consistency, optional tap alternative to drag, real-device impressions that CI cannot reproduce.

## Definition of done

- Audit report includes every scene/component reviewed, measurement source, severity, owner plan, and fix/defer decision.
- Critical remediation has direct test coverage at the 360 px viewport.
- Reduced-motion audit has zero unguarded user-triggered tweens or a documented exception with rationale.
- `npm run typecheck`, targeted Vitest, and targeted Playwright specs pass.

## Measurement strategy

Use CSS pixels as the compliance unit, not raw Phaser world units. When measuring Phaser objects in Playwright, convert through the canvas bounding box:

```
cssWidth = worldWidth * (canvasBoundingClientRect.width / game.scale.gameSize.width)
cssHeight = worldHeight * (canvasBoundingClientRect.height / game.scale.gameSize.height)
```

For DOM mirrors in `A11yLayer` / `TestHooks`, measure the actual DOM `getBoundingClientRect()`. If the DOM mirror is larger than the Phaser visual, record both values; compliance is based on the interactive surface the child can actually tap.

## Phases

### Phase 1 — Audit scope definition + checklist (gate: checklist committed)

Reduced-motion rule (self-contained, do not bury in CLAUDE.md): **if `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true, every tween must take its `Duration.instant` path (jump to final state with `duration: 0`). The architectural enforcement lives in `motion.ts:tween()` from [2026-05-04-interaction-and-motion-system.md](2026-05-04-interaction-and-motion-system.md); this audit verifies no direct `tweens.add` bypasses it.**

| # | Category | Requirement | Measurement method | Gate | Owner plan |
|---|---|---|---|---|---|
| 1 | Touch targets | ≥ 44×44 CSS px (all buttons, toggles, drag handles, choice buttons, icon buttons) | `getBoundingClientRect()` on DOM mirror; canvas → CSS conversion for Phaser hit areas | CI | this + button-hit-regions |
| 2 | Drag handles | ≥ 48 px on smaller axis | Same | CI | button-hit-regions |
| 3 | Press feedback | Visual `State.pressed` within 1 frame of `pointerdown`, held ≥ 100 ms | Frame timing trace from `traceInput.ts` (perf plan) | CI | button-hit-regions |
| 4 | Pointer-to-paint | P95 ≤ 50 ms on budget profile | Same trace | CI | performance-and-drag-latency |
| 5 | Drag tracking | 1:1 visual follow under finger (no perceptible lag) | Spec drives drag and asserts position delta < 4 px/frame | CI | performance-and-drag-latency |
| 6 | Drag inertia (optional) | Released objects > 48 px coast briefly via `Ease.out` rather than stopping rigidly | Visual baseline of release frame | Manual | this |
| 7 | Body font | ≥ 16 px | Read `style.fontSize` from DOM mirror or Phaser TextStyle | CI | this |
| 8 | Button labels | ≥ 14 px | Same | CI | this |
| 9 | Headings | ≥ 20 px | Same | CI | this |
| 10 | Hint / feedback text | ≥ 12 px (≥ 14 preferred) | Same | CI | this |
| 11 | Line height | ≥ 1.5 body / ≥ 1.2 heading / ≥ 1.0 single-line button | Computed from style | CI | this |
| 12 | Contrast (text) | 4.5:1 normal / 3:1 large | axe-core | CI | visual-audit |
| 13 | Touch spacing | ≥ 8 px between adjacent controls; ≥ 8 px inside-button text-to-edge | Bounding box deltas | CI | this |
| 14 | Drag fallback | Every drag archetype offers a tap alternative where reasonably possible (WCAG 2.5.7) | Spec asserts each archetype's keyboard / tap path completes | CI | screen-reader-keyboard-parity |
| 15 | Reduced-motion | 0 unguarded `tweens.add` outside `motion.ts`; `prefers-reduced-motion: reduce` makes ceremony scenes take instant path | Source-grep test + Playwright reduced-motion screenshot | CI | interaction-and-motion-system + this |
| 16 | Responsive 360 | No horizontal overflow; specific elements satisfy width predicates (see Phase 5) | Playwright at 360 px viewport | CI | this |
| 17 | Responsive 768 | Content width within 60–85 % of viewport | Playwright at 768 px | CI | this |
| 18 | Responsive 1024 | No CTA wider than 240 px; line length ≤ 80 ch in body text blocks | Playwright at 1024 px | CI | this |

Inventory by category (filled out as part of Phase 2):

- **Buttons:** MenuScene stations, LevelMapScene level cards, SessionComplete CTAs, SettingsScene toggles, OnboardingScene "Skip tutorial", back buttons, "Show me how" (new in plan 8).
- **Form inputs:** PreferenceToggle, any future text/number fields.
- **Game interactions:** DragHandle, hint buttons, choice options (all 10 archetypes).
- **Text:** Question text, level titles, feedback messages, progress labels, mascot speech.

### Phase 2 — Component audit (gate: detailed findings report)

Walk every component in `src/components/` and every scene in `src/scenes/` with the checklist:

1. **Extract current sizes** from source code (CSS, Phaser TextStyle, bounds, hit rectangles):
   ```
   For each component:
     - List every interactive element
     - Measure width × height (CSS or Phaser units)
     - Measure font size (if text)
     - Flag any ≤44×44 or font <14 px
   ```

2. **Automated checks (gate criteria — must pass in CI):**
   - Playwright at 360 / 768 / 1024 px viewports (this is the same matrix as Phase 5; do not duplicate the spec — share fixtures).
   - Click each interactive element at its bounding-box edge ±4 px to verify hit area coverage.
   - Assert no horizontal overflow at 360 px.

3. **Real-device spot-check (one-time, manual, NOT a gate):**
   - Optional one-time pass on a physical iPhone SE and a low-end Android (per C7) to sanity-check tap accuracy and font readability with a real finger.
   - Findings feed back into the report as `INFO` items only — they do not block the phase gate, since CI cannot reproduce them.

4. **Report format:**
   ```
   ## Summary
   - Overall status: PASS / FAIL
   - Touch targets: X/Y elements compliant (X% pass rate)
   - Font sizes: X/Y elements readable (X% pass rate)
   - Responsive scaling: PASS / FAIL

   ## By Category
   ### Buttons
   - MenuScene station buttons: 44×44 ✓
   - SessionComplete primary button: 50×50 ✓
   - "Privacy Notice →" link: 30×18 ✗ CRITICAL (should be ≥44×44)
   
   ### Text
   - Question prompts: 16 px ✓
   - Mascot speech: 13 px ✗ WARNING (should be ≥14 px)
   
   ## Violations by Severity
   - CRITICAL (blocks release): 3 items
   - WARNING (should fix): 7 items
   - INFO (nice-to-have): 2 items
   ```

5. **Playwright spec:** Capture evidence at 360, 768, 1024 px widths. Assertions should cover overflow and interactability; visual snapshot baselines should be coordinated with `2026-05-04-visual-audit-and-cleanup.md` to avoid duplicate golden images.

### Phase 3 — Remediation: Critical violations (gate: touch target + font size compliance)

Fix only **CRITICAL** violations:
- Any interactive element <44×44 px → increase size or add larger hit rectangle (per `2026-05-04-button-hit-regions.md`)
- Any button label <14 px → increase font size
- Any question text <16 px → increase font size
- Any gap between buttons <8 px → add spacing

Pattern (consistent with `2026-05-04-button-hit-regions.md`):
```ts
// Before: 30×18 button
const btn = scene.add.text(..., label, { fontSize: 12 });
btn.setInteractive({ useHandCursor: true });

// After: padded hit area + larger font
const hit = scene.add.rectangle(0, 0, 44, 44, 0, 0).setInteractive({ useHandCursor: true });
const label = scene.add.text(..., labelText, { fontSize: 14 });
container.add([hit, label]);
```

Playwright spec: Tap each fixed element at 360 px viewport. Verify successful tap without mis-tap.

### Phase 4 — Remediation: Warnings (gate: readability compliance)

Fix **WARNING** violations:
- Font sizes 12–13 px → bump to 14 px (or 16 px for body text)
- Spacing 4–7 px between buttons → increase to 8 px
- Line heights <1.2 → increase to 1.2 (headings) or 1.5 (body)

No hit-area changes needed; purely typographic.

### Phase 5 — Responsive layout audit (gate: Playwright at 3 breakpoints green)

Concrete assertions, not "looks fine":

1. **360 px (narrow mobile):**
   ```ts
   await page.setViewportSize({ width: 360, height: 812 });
   const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
   expect(scrollW).toBeLessThanOrEqual(360);                         // no horizontal overflow
   for (const sel of QUESTION_TEXT_SELECTORS) {
     const box = await page.locator(sel).boundingBox();
     expect(box.width).toBeLessThanOrEqual(360 - 16);                // 8 px gutter each side
   }
   ```

2. **768 px (tablet portrait):**
   ```ts
   const contentWidth = await mainContentBoundingBox();
   expect(contentWidth).toBeGreaterThanOrEqual(768 * 0.6);           // not overly cramped
   expect(contentWidth).toBeLessThanOrEqual(768 * 0.85);             // not edge-to-edge
   ```

3. **1024 px (desktop / landscape):**
   ```ts
   for (const cta of CTA_SELECTORS) {
     const box = await page.locator(cta).boundingBox();
     expect(box.width).toBeLessThanOrEqual(240);                     // no sprawling buttons
   }
   const longestLine = await measureLongestTextLineCh();
   expect(longestLine).toBeLessThanOrEqual(80);                      // typographic comfort
   ```

Playwright spec: assertions above + a screenshot at each breakpoint that feeds [2026-05-04-visual-audit-and-cleanup.md](2026-05-04-visual-audit-and-cleanup.md) baselines.

### Phase 6 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "K–2 touchscreen UX: 44×44 px minimum, 16 px body font, 8 px button spacing. Test at 360 px (tightest) first. Readability ≠ contrast — also check font size."
- Add to `docs/30-architecture/ui-design-principles.md` (or create if missing): "Touchscreen component guidelines" section with sizing rules.
- Update `src/components/CLAUDE.md` if any component sizing patterns changed.
- Run `npm run sync:claude-md` if any agent/command frontmatter changed.

## Risk / rollback

- **Risk:** Increasing button sizes may cause layout crowding or unexpected layout shifts on 360 px. Mitigate by testing at each breakpoint and adjusting spacing/margins, not just button size.
- **Risk:** Font size increases may cause text overflow on mobile. Mitigate by testing with real strings (question text can be long) at 360 px and allowing wrapping.
- **Rollback:** Each phase is one PR; revert if E2E shows visual regressions on 360 px devices.

## Risk / rollback

- **Risk:** Increasing button sizes causes layout crowding / unexpected shifts at 360 px. Mitigate by testing at each breakpoint and adjusting spacing/margins in the same PR; the responsive assertions in Phase 5 are the regression net.
- **Risk:** Font-size bumps cause text overflow at 360 px. Mitigate by testing with the longest realistic strings (full question prompts, feedback messages) at 360 px and allowing wrapping; the 360 px overflow assertion is the gate.
- **Risk:** Audit findings cascade into [2026-05-04-button-hit-regions.md](2026-05-04-button-hit-regions.md) re-work after that plan was already merged. Mitigate by running this plan's Phases 1–2 (audit) **before** that plan's Phase 4, so its inventory absorbs anything we discover.
- **Rollback:** each phase is one PR. Phase 3 (size/spacing) is the most invasive — revert if E2E shows visual regression at 360 px or any responsive assertion in Phase 5 fails. Phase 4 (typography) is purely text-style; revert is mechanical.

## Out-of-scope follow-ups

- Haptic feedback on tap (future enhancement, not core a11y).
- Swipe gestures vs. tap (current game uses tap only; defer).
- Dark mode contrast re-audit (separate from this phase).
- Parent-facing interfaces (not in MVP per C2).

---

## Integration with related plans

- **`2026-05-04-button-hit-regions.md`:** Phase 3 of this plan waits for its interaction sweep. If a button is visually small but has compliant invisible geometry, this plan should report it as `PASS-hit-area / WARNING-visual-size` instead of reworking the same code.
- **`2026-05-04-worked-example-flow.md`:** The "Show me how" button must be ≥44×44, have an A11yLayer label, and respect reduced-motion from the first UI PR.
- **`2026-05-04-visual-audit-and-cleanup.md`:** Use its Playwright visual baselines as evidence for layout regressions; keep this plan focused on measurable touch/readability compliance.
