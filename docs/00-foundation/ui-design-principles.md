# UI/UX Design Principles — Questerix Fractions

**Status:** Locked. Read this before changing any user-facing behavior.  
**Created:** 2026-05-01  
**Audience:** K-2 (ages 5–8). Solo validation project.

These are the rules that drive UI/UX decisions in this codebase. They are not aspirational — they are how every layout choice, animation, and interaction has been justified to date. New work must defend itself against these principles or explicitly amend them via a `/decision` entry.

---

## The underlying thread

> **Design for the lowest-confidence user in the room.** If a nervous 5-year-old who has never touched an educational app can figure out what to do without adult help, the design is working.

Every other rule below is a corollary of this.

---

## Audience-driven non-negotiables (K-2)

The audience drove every decision. K-2 means ages 5–8, which means:

- **No reading required for core actions.** Icons + word labels at most; never a wall of text in the navigation path.
- **Large touch targets.** Touch targets ≥ 44×44 CSS px (WCAG); critical actions (Check, drag handle, Play) sized substantially larger.
- **Immediate feedback.** Every action gets a response within ~800 ms. Children disengage if they can't tell whether something "worked."
- **Zero dead ends.** Wrong answers must never block forward motion. The hint ladder, ghost guide, and `oops` expression exist to keep the child moving.

If a proposal violates one of these, it doesn't ship.

---

## Constraints make it better

An 800×1280 portrait canvas is tight. That pressure forces prioritization: **the shape and the Check button are the only things that truly matter during gameplay**, so everything else has to earn its space or get pushed to the edges.

When laying out a scene, the question is never "where can this fit?" — it's "does this earn the space it's asking for, given that the shape and Check button must dominate?"

---

## The mascot as the UX layer

Quest does a lot of heavy lifting that would otherwise require text. **Idle escalation, hints, celebrations, and error recovery flow through character reactions rather than UI overlays.** Kids trust characters; they don't trust dialogs.

Operational consequences:
- Prefer a Quest expression over a banner where a banner would carry equivalent information.
- Prefer a speech bubble over modal copy.
- Prefer Quest pointing at the right answer over an instructional dialog.
- The mascot is part of the interface budget, not decoration. Quest's position, scale, and animation cost decisions are first-class layout decisions.

---

## Borrow from what works; never invent

The drag-to-partition mechanic borrows from touchscreen toys kids already know. The star progress bar borrows from every mobile game they've seen. The BKT adaptive difficulty borrows from decades of educational research. **None of it is invented — it is assembled thoughtfully for this specific problem.**

When a UI choice has no clear precedent in mainstream K-2 software, that's a signal to step back, not push forward.

---

## The nine principles that shaped this app

These are the lenses every UI/UX decision is run through. New proposals should be checkable against this list.

### 1. Fitts's Law — distance and size of interaction targets matter

The most important interaction targets (Check button, drag handle) need to be large and close to where the child's hand already is. **The Check-button-540-px-below-shape problem is real exactly because it violates Fitts's Law.** Layout reviews must measure y-coordinates and arc-of-motion, not just feature presence.

### 2. Cognitive load theory — one primary action per screen

Don't make the child think about the UI while they're thinking about the math. **One primary action per screen.** Quest handles guidance so the interface stays clean.

If a screen has two equally-prominent actions, one of them is wrong.

### 3. Immediate feedback — within 800 ms

Every action gets a response within ~800 ms (the `FeedbackOverlay` timing spec is built around this). Children disengage when they can't tell whether something worked.

This is why bottom-sheet feedback is preferred over center banners (less travel from drag origin to feedback location), and why the correct-answer dismiss timing was tightened from 1400 ms → 1100 ms in the UI audit.

### 4. Progressive disclosure — information arrives only when ready

Hints appear only when needed:
- Wrong answer 1 → ghost guide (subtle midpoint hint).
- Wrong answer 2 → hint button pulses to draw the eye.
- Wrong answer 3 → auto-reveal the full hint.

New information is introduced only when the child is ready for it. Don't front-load the screen with affordances the child hasn't earned the need for yet.

### 5. Error tolerance / graceful recovery — never a dead end

Wrong answers are never a dead end. The `oops` expression, the hint ladder, the ghost guide, and the never-stuck escape valve in the unlock model all exist to keep the child moving rather than stuck.

If a proposal creates a state where the child can be blocked, it must include the recovery path in the same PR.

### 6. Character as interface — borrowed from Clifford, Dora, etc.

A trusted character lowers anxiety and makes correction feel safe rather than punishing. This is why Quest's `oops` expression is preferred over a red banner for wrong answers — same information, different emotional valence.

Quest is not a feature; Quest is the interface.

### 7. Motivation scaffolding — operationalize self-determination theory

Star progress, streak pills, celebration overlays, and the gold mastery ribbon all operationalize self-determination theory:

- **Competence** — "I can do this." Stars, mastery ribbon, "3 in a row!" banner.
- **Autonomy** — "I choose when to check." The Check button is explicit, not auto-fire.
- **Relatedness** — "Quest is with me." Mascot presence in every gameplay scene.

Removing one of these without replacement is a regression even if the screen looks cleaner.

### 8. Accessibility as baseline — never bolted on

WCAG AA contrast ratios on all text. Real DOM buttons mirroring every canvas control (the `A11yLayer`). TTS for all prompts. These improve usability for **everyone**, not just children with disabilities.

`a11y-auditor` runs on every PR that changes interactive surface. Treat its output as a hard gate, not a suggestion.

### 9. Reduce motion as a first-class concern

The `checkReduceMotion()` flag gates all non-essential tweens. This protects children with vestibular sensitivities and keeps the game usable on low-end devices.

**Audio narration is independent of reduce-motion** — see UI audit T4. Don't conflate them; the populations overlap in the wrong direction.

---

## How to use this document

1. **Before any UI/UX change:** read this file end-to-end. State which principles your change reinforces or violates.
2. **In code review:** "this fails principle N" is a valid review comment that requires either revision or a `/decision` entry overriding the principle for a specific case.
3. **For new agents:** this is the second-most-important doc to read after `CLAUDE.md`. The constraints file (`constraints.md`) tells you what you can't change; this file tells you how to think about what you build.

---

## When to amend this document

These principles are not laws of nature; they are the explicit philosophy of this app. They can change — but only via a deliberate `/decision` entry that names the principle being amended and the evidence for the change. Do not revise this file silently in a polish PR.
