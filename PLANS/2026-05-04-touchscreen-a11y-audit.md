# Plan: Touchscreen Accessibility Audit & Remediation

**Date:** 2026-05-04
**Branch (when started):** `audit/2026-05-04-touchscreen-a11y`
**Status:** Draft — not yet implemented

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

- Implementing fixes (Phase 2+).
- Redesigning layouts (defer unless critical).
- Changing visual style (only size/spacing).

## Phases

### Phase 1 — Audit scope definition + checklist (gate: checklist committed)

Define the audit checklist:

1. **Touch target sizes (WCAG 2.5.5):**
   - All buttons: ≥44×44 CSS px
   - Form inputs (toggle switches, checkboxes): ≥44×44 px
   - Drag handles: ≥44×44 px
   - Choice/option buttons in interactions: ≥44×44 px
   - Icon-only buttons: entire clickable area must be 44×44 (or use a larger invisible hit rectangle per plan-button-hit-regions.md)

2. **Font sizes:**
   - Body text (question prompts, instructions): ≥16 px
   - Button labels: ≥14 px minimum
   - Headings (level titles, scene titles): ≥20 px
   - Small text (hints, feedback): ≥12 px (stretch goal; ≥14 px preferred)

3. **Line heights:**
   - Body: ≥1.5 line-height
   - Headings: ≥1.2 line-height
   - Single-line buttons: ≥1.0 (acceptable)

4. **Color contrast (WCAG AA):**
   - Normal text: 4.5:1 (already audited in prior phase, skip unless regressed)
   - Button text: 3:1 minimum (buttons are typically "large" in WCAG terms)

5. **Touch spacing:**
   - Gap between adjacent buttons: ≥8 px (prevents accidental mis-taps)
   - Padding inside buttons (text to edge): ≥8 px minimum

6. **Responsive scaling:**
   - At 360 px (iPhone SE, tight): text doesn't overflow, buttons don't stack unintended
   - At 768 px (tablet portrait): layout uses screen space efficiently
   - At 1024 px (tablet landscape / desktop): no unnecessary whitespace

7. **Inventory by category:**
   - **Buttons:** MenuScene stations, LevelMapScene level cards, SessionComplete CTAs, SettingsScene toggles, OnboardingScene "Skip tutorial", back buttons, "Show me how" (new)
   - **Form inputs:** PreferenceToggle, any future text/number fields
   - **Game interactions:** DragHandle, hint buttons, choice options (all 10 archetypes)
   - **Text:** Question text, level titles, feedback messages, progress labels, mascot speech

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

2. **Test on real devices (or Playwright + viewport resize):**
   - Open the game on a 360 px mobile browser
   - Attempt to tap each button with a finger (or simulate with Playwright click at edge)
   - Log tap accuracy (success on first attempt, or multiple taps needed?)
   - Check for text overflow or unintended line breaks

3. **Report format:**
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

4. **Playwright spec:** Snapshot at 360, 768, 1024 px widths. No assertions yet—just visual documentation.

### Phase 3 — Remediation: Critical violations (gate: touch target + font size compliance)

Fix only **CRITICAL** violations:
- Any interactive element <44×44 px → increase size or add larger hit rectangle (per plan-button-hit-regions.md)
- Any button label <14 px → increase font size
- Any question text <16 px → increase font size
- Any gap between buttons <8 px → add spacing

Pattern (consistent with plan-button-hit-regions.md):
```ts
// Before: 30×18 button
const btn = scene.add.text(..., label, { fontSize: 12 });
btn.setInteractive({ useHandCursor: true });

// After: padded hit area + larger font
const hit = scene.add.rectangle(0, 0, 44, 44, 0, 0).setInteractive({ useHandCursor: true });
const label = scene.add.text(..., labelText, { fontSize: 14 });
container.add([hit, label]);
```

Playwrght spec: Tap each fixed element at 360 px viewport. Verify successful tap without mis-tap.

### Phase 4 — Remediation: Warnings (gate: readability compliance)

Fix **WARNING** violations:
- Font sizes 12–13 px → bump to 14 px (or 16 px for body text)
- Spacing 4–7 px between buttons → increase to 8 px
- Line heights <1.2 → increase to 1.2 (headings) or 1.5 (body)

No hit-area changes needed; purely typographic.

### Phase 5 — Responsive layout audit (gate: Playwright at 3 breakpoints green)

Verify layout remains usable at C7 device range:

1. **360 px (narrow mobile):**
   - Question text wraps gracefully (no overflow)
   - Buttons are vertically stacked if needed (not side-by-side if cramped)
   - No horizontal scrollbar

2. **768 px (tablet portrait):**
   - Layout uses ~80% of screen width
   - Two-column layouts (if any) readable without pinch-zoom

3. **1024 px (desktop / landscape):**
   - Generous margins; no text lines exceed ~80 characters
   - Buttons don't sprawl too wide (≤200 px recommended for CTA buttons)

Playwright spec: Screenshot at each breakpoint, visual inspection for regressions.

### Phase 6 — Phase-close docs (gate: PR merged)

- Append to `.claude/learnings.md`: "K–2 touchscreen UX: 44×44 px minimum, 16 px body font, 8 px button spacing. Test at 360 px (tightest) first. Readability ≠ contrast — also check font size."
- Add to `docs/30-architecture/ui-design-principles.md` (or create if missing): "Touchscreen component guidelines" section with sizing rules.
- Update `src/components/CLAUDE.md` if any component sizing patterns changed.
- Run `npm run sync:claude-md` if any agent/command frontmatter changed.

## Risk / rollback

- **Risk:** Increasing button sizes may cause layout crowding or unexpected layout shifts on 360 px. Mitigate by testing at each breakpoint and adjusting spacing/margins, not just button size.
- **Risk:** Font size increases may cause text overflow on mobile. Mitigate by testing with real strings (question text can be long) at 360 px and allowing wrapping.
- **Rollback:** Each phase is one PR; revert if E2E shows visual regressions on 360 px devices.

## Out-of-scope follow-ups

- Haptic feedback on tap (future enhancement, not core a11y).
- Swipe gestures vs. tap (current game uses tap only; defer).
- Dark mode contrast re-audit (separate from this phase).
- Parent-facing interfaces (not in MVP per C2).

---

## Integration with related plans

- **plan-button-hit-regions.md:** Phase 3 of this plan (critical fixes) will coordinate with button-hit-region changes. If a button is <44×44, we'll increase the hit rectangle AND the visual size together.
- **plan-worked-example-flow.md:** The "Show me how" button (new in Phase 4 of worked-example plan) must be ≥44×44 from day 1. Add it to this audit's scope before Phase 3.
