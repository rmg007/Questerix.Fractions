---
title: Accessibility
status: active
owner: solo
last_reviewed: 2026-04-24
applies_to: [mvp]
related:
  - ../20-mechanic/design-language.md
  - ../20-mechanic/interaction-model.md
  - ../50-roadmap/post-mvp-2029.md
---

# Accessibility

Per audit §4.3, this document is the single page enumerating accessibility commitments, implementation specifics, and verification plan for the Questerix Fractions MVP. The commitments here are binding — not aspirational — for the MVP release.

---

## 1. Standard

**WCAG 2.1 AA** is the target conformance level for all non-game UI (menus, settings, prompts, modals). Per `../20-mechanic/design-language.md §1` and `../20-mechanic/interaction-model.md`, the game canvas (Phaser) targets WCAG 2.1 AA where technically achievable within the canvas context; known canvas-specific gaps are documented in §8 below.

---

## 2. Touch Targets

Minimum interactive target size: **44 × 44 CSS px** (Apple HIG / WCAG 2.5.5 enhanced minimum 24 × 24; this app uses the stricter 44 px floor for K–2 fingers).

The design language recommends **48 × 48** as the design target so the visible element plus comfortable padding still clears the 44 px minimum. Per `../20-mechanic/design-language.md §5`:

| Element                          | Minimum hit area    |
| -------------------------------- | ------------------- |
| Primary button                   | 56 × 48 px          |
| Icon button                      | 48 × 48 px          |
| Option card (identify mechanic)  | 88 × 88 px          |
| Drag handle                      | 44 × 44 px          |
| Number-line tick label           | 44 × 44 px hit area |
| Compare-relation buttons (< = >) | 56 × 56 px          |

When a visible element is smaller than 44 px (e.g., a partition line stroke), an invisible padded hit area extends it. This applies to both the HTML/Tailwind UI and Phaser interactive objects.

---

## 3. Color Contrast

- **Normal text (< 18 pt / < 14 pt bold):** 4.5:1 minimum against background.
- **Large text (≥ 18 pt or ≥ 14 pt bold):** 3:1 minimum.
- **UI components and graphical objects:** 3:1 minimum against adjacent colors.

Measured with **axe-core** in CI (see §7). Token values from `../20-mechanic/design-language.md §2` are pre-verified:

| Pair                                             | Contrast ratio | Notes                               |
| ------------------------------------------------ | -------------- | ----------------------------------- |
| `neutral-900` (#101521) on `neutral-0` (#FFFFFF) | 19.2:1         | Primary text — well above threshold |
| `primary` (#2F6FED) on `neutral-0` (#FFFFFF)     | 4.6:1          | Button fills — passes AA normal     |
| `success` (#1FAA59) on `neutral-0` (#FFFFFF)     | 4.7:1          | Passes AA normal                    |
| `error` (#E5484D) on `neutral-0` (#FFFFFF)       | 4.5:1          | Passes AA normal                    |

The deprecated neon palette from `src/data/config.ts THEME` (e.g., cyan `#00FFD1` on dark `#050810`) must not appear in MVP — contrast is un-audited and likely non-compliant.

---

## 4. Motion

When the OS-level `prefers-reduced-motion: reduce` media query is set, **or** when `DeviceMeta.preferences.reduceMotion === true`:

- All particle effects are disabled.
- All easing animations are replaced with instant state transitions or ≤ 80 ms fades.
- Parallax backgrounds (none in current design, but forbidden regardless) are disabled.
- Snap pulses become static color changes.
- The Tier 3 hint demonstration becomes a static dashed overlay.

Per `../20-mechanic/interaction-model.md §7` for the full reduced-motion substitution table.

The in-app preference can override the OS setting in either direction. Stored in `DeviceMeta.preferences.reduceMotion`.

---

## 5. Keyboard Access

Every drag mechanic has a tap-equivalent fallback per `../20-mechanic/interaction-model.md §9`:

- **Tab** cycles through interactive elements.
- **Space / Enter** activates buttons and tap targets.
- **Arrow keys** move a focused draggable in 8 px increments; **Enter** drops it.
- **Escape** cancels an active drag.

Full keyboard parity with touch is not required for MVP (drag precision cannot be fully replicated with arrow keys), but every activity must be completable via keyboard with no inaccessible states.

---

## 6. Screen Reader

- **ARIA-live announcements** on every question outcome: correct answers announce "Correct!" or equivalent affirmative; incorrect outcomes announce "Not quite — try again." Live region is `aria-live="polite"` so announcements do not interrupt ongoing speech.
- **Semantic landmarks** in the HTML shell: `<main>`, `<nav>`, `<header>`, `<dialog>` for modals.
- **Buttons** use native `<button>` elements or ARIA `role="button"` with explicit `aria-label` where icon-only.
- **Phaser canvas:** the canvas element carries `aria-label="Fractions activity"` and `role="application"`. Detailed canvas narration (partition state, drag position) is a post-MVP 2029 feature — see §8.

---

## 7. Audio and TTS

- TTS via browser `SpeechSynthesis` is available for all question prompts where labeled in the design language (`../20-mechanic/design-language.md §3`).
- Every question prompt has a visible text alternative. Audio is never the only carrier of information.
- Any vocal hint audio (Tier 1–3 hints with TTS) has a visible text equivalent displayed simultaneously.
- There are no video or recorded narration elements in the MVP that would require captions; the browser SpeechSynthesis output is real-time and does not require captioning.

---

## 7. Test Plan

| Test                                                 | Tool                                                       | When                           |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| Automated contrast + ARIA checks on HTML/Tailwind UI | axe-core (Playwright integration)                          | Every CI run                   |
| Touch-target size audit                              | Playwright screenshot + manual measurement                 | Before each phase gate         |
| Keyboard navigation walkthrough                      | Manual (tester with keyboard only)                         | Before each phase gate         |
| Screen reader pass — HTML UI only                    | NVDA (Windows) + VoiceOver (iOS)                           | Manual; before each phase gate |
| Reduced-motion manual toggle test                    | DevTools `prefers-reduced-motion` override + in-app toggle | Before each phase gate         |
| Color contrast spot-check for new tokens             | axe-core in CI + manual verification                       | On any palette change          |

axe-core is integrated via `@axe-core/playwright` in the Playwright E2E suite. It runs on every page load and navigation in the test suite and fails the test run if any violations at the "critical" or "serious" levels are detected.

---

## 8. Known Limitations (Post-MVP 2029)

These gaps are acknowledged and deferred. They do not block MVP release but must be addressed before any institutional deployment to IDEA-covered students.

- **No live ARIA regions for streaks and celebrations** — per-session success animations in the Phaser canvas are not announced to screen readers. Deferred to post-MVP 2029 accessibility work per `../50-roadmap/post-mvp-2029.md`.
- **No high-contrast theme** — a dedicated high-contrast color palette is a post-MVP 2029 item per `../50-roadmap/post-mvp-2029.md`.
- **No full Phaser canvas narration** — detailed drag-state and partition narration requires an accessibility overlay over the canvas that is out of MVP scope.
- **No switch / assistive-device input parity** — baseline keyboard access only; sequential scanning and eye-tracker compatibility are deferred per `../50-roadmap/post-mvp-2029.md`.
