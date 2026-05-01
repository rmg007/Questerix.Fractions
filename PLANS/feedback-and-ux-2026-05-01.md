# Plan: Feedback & Core UX Fixes — Questerix Fractions

**Status:** Draft — awaiting per-task approval  
**Last updated:** 2026-05-01  
**Scope:** Child-facing UX fixes identified in pre-playtest audit. No curriculum, engine, or persistence changes.  
**Priority order:** Ranked by how badly each issue would derail a real K-2 playtest session.

---

## Problem Summary

Six concrete issues were identified by auditing the code + running against a child-development heuristic for ages 5–8:

| # | Issue | Where | Severity |
|---|---|---|---|
| F1 | Feedback overlay disappears in 600ms — too fast for K-2 to read | `FeedbackOverlay.ts` | 🔴 Critical |
| F2 | "Incorrect" feedback animation is nearly invisible | `FeedbackOverlay.ts` | 🔴 Critical |
| F3 | Feedback panel layout — icon and text 240px apart, banner floats mid-screen | `FeedbackOverlay.ts` | 🟠 High |
| F4 | Quest has no "wrong" expression — `think` is ambiguous for age 5 | `Mascot.ts` | 🟠 High |
| F5 | Partition line white dashes are invisible on white shapes | `Level01Scene.ts`, `PartitionInteraction.ts` | 🟠 High |
| F6 | TTS narration gated by Reduce Motion preference — wrong coupling | `LevelScene.ts`, `Level01Scene.ts` | 🟡 Medium |

---

## Tasks at a Glance

| Task | Description | Effort | Risk |
|---|---|---|---|
| **T1** | Redesign FeedbackOverlay — timing, layout, animations | M | Low |
| **T2** | Add Quest "oops" / wrong-answer expression | M | Low |
| **T3** | Fix partition line visibility on white shapes | S | None |
| **T4** | Decouple TTS from Reduce Motion preference | S | Low |

---

## T1 — Redesign FeedbackOverlay

### Problem
The current overlay is a 200px-tall horizontal strip that appears dead-center on the 1280px canvas, overlapping the question. It shows for 600ms — far below what K-2 children need to process text + icon. The "incorrect" animation (alpha 1→0.8→1 over 100ms) is imperceptible. The icon (cx−220) and text (cx+20) are 240px apart with nothing between them.

### Spec

**Layout — bottom sheet, slides up from below:**
- Replace the centred banner with a rounded-top panel that slides up from the bottom of the screen.
- Panel: full width (800px), 260px tall, `borderRadius` top-left/right 32px.
- Bottom edge at y=1280 (off-screen). Slides to y=1020 on show (so the top of the panel is at y=1020, leaving 1020px of question visible above it).
- Icon (72px) and label (32px bold) are horizontally centred together as a row, vertically centred in the panel.
- Gap between icon and label: 16px. No 240px separation.

**Colors — confident, not pastel:**
- Correct: `#22C55E` (solid green-500), white icon + white text.
- Incorrect: `#EF4444` (solid red-500), white icon + white text.
- Close: `#F59E0B` (amber-500), white icon + white text.
- Opacity 1.0 (not 0.97 — the pastels + near-transparent look soft and low-contrast).

**Timing:**
- Correct: display 1400ms then slide back down (200ms ease-in).
- Incorrect: display 1600ms then slide back down. Children need more time to process "try again."
- Close: display 1200ms.
- `DISPLAY_MS` constant becomes `DISPLAY_MS_CORRECT = 1400`, `DISPLAY_MS_INCORRECT = 1600`, `DISPLAY_MS_CLOSE = 1200`.

**Entry animations:**
- Correct: slide up (y: 1280→1020, duration 220ms, `Back.easeOut`) simultaneously with a scale-in on the icon (0.5→1.0). Keep existing star particle burst — just move emitter origin to the new panel y-center (~1150).
- Incorrect: slide up (220ms, `Power2.easeOut`) + a real horizontal shake on the panel after it lands: tween `x` from center → center+18 → center−18 → center+10 → center (4 keyframes, ~320ms total). This is visible and communicates "wrong" unmistakably.
- Close: slide up (180ms) + gentle pulse (same as today).
- Reduced motion: instant show at final position, no slide or shake.

**Dismiss:**
- Auto-dismiss: slide back down (y: 1020→1280, 200ms ease-in) then hide.
- Tap-to-dismiss: tapping the panel during display triggers the slide-down immediately (useful for impatient children).

### Files to change
- `src/components/FeedbackOverlay.ts` — full redesign of constructor, `show()`, `hide()`, and animation methods.
- No other files change (callers use the same `show(kind, onDismiss)` API).

### Acceptance
- Correct feedback visible for ≥1400ms, then slides away cleanly.
- Incorrect feedback: panel shakes horizontally after landing. Duration ≥1600ms.
- Icon and label are adjacent (≤24px gap), both white on solid color.
- Star particles burst from correct panel (not from old center position).
- Reduced-motion path: instant appear/disappear, no tween.
- `npm run typecheck` passes clean.

---

## T2 — Add Quest "oops" expression for wrong answers

### Problem
When a child gets a question wrong, Quest switches to `think` (head wobble). "Thinking" looks like Quest is confused or the game is broken — not that the child gave a wrong answer. There is no expression that clearly maps to "oops, try again."

### Spec

**New expression: `oops`**
- Trigger: replace the `think` call in the incorrect-answer path of `Level01Scene.ts` and `LevelScene.ts`.
- Animation: Quest's body droops slightly (rotate body container -8°, then back to 0° over 400ms). Eyes become two small curved lines (closed/wincing) instead of open circles. Small sweat drop (a teardrop shape in sky-blue, ~12px) appears near the top-right of the head and falls 20px then fades out.
- Duration: hold `oops` for 1000ms then return to `idle`.

**Implementation notes:**
- `Mascot.ts` uses procedural drawing. Add `'oops'` to the `MascotExpression` union type.
- In `drawEyes()` (or equivalent), add an `oops` branch: two 20px-wide arcs (concave-down) in navy instead of filled circles.
- In `react(expression)` (or equivalent), add the body droop tween + sweat drop creation + cleanup.
- The sweat drop can be a Phaser `Graphics` object: a small circle (r=7) with a triangle cap below it, filled `0x93C5FD` (PATH_BLUE), depth above the mascot container.

**Where to trigger:**
- `src/scenes/Level01Scene.ts`: search for where `mascot.react('think')` is called after an incorrect submission — replace with `mascot.react('oops')`.
- `src/scenes/LevelScene.ts`: same.

### Files to change
- `src/components/Mascot.ts` — add `oops` expression + animation.
- `src/scenes/Level01Scene.ts` — call `mascot.react('oops')` on wrong answer.
- `src/scenes/LevelScene.ts` — same.

### Acceptance
- Wrong answer → Quest droops + wince eyes + sweat drop for ~1s then returns to idle.
- Correct answer still shows `cheer` / `cheer-big` as before.
- `npm run typecheck` clean.

---

## T3 — Fix partition line visibility on white shapes

### Problem
The partition drag handle in Level01Scene and PartitionInteraction draws a line with white dashes (`#FFFFFF` or PATH_BLUE with white gap). The shape background is also white (`0xffffff`). The white dashes disappear into the shape, making the interactive element hard to see.

### Spec

**Change the dash gap color from white to sky-blue (`PATH_BLUE` = `#93C5FD`):**
- Find every `Graphics.lineBetween` / `setLineDash` / `strokePath` call that draws the partition line in:
  - `src/scenes/Level01Scene.ts` (the `drawCenterLine` or equivalent)
  - `src/scenes/interactions/PartitionInteraction.ts` (the draggable handle line)
- The line itself should be NAVY (`0x1E3A8A`), 10px thick, no dashes — a solid bold line is more visible and easier for children to follow than a dashed one.
- The drag handle grip indicator (▲▼ text added in the previous pass) should remain.
- The shape background changes from pure white `0xffffff` to `0xF0F9FF` (a faint sky tint) to add contrast behind the navy line.

### Files to change
- `src/scenes/Level01Scene.ts` — update partition line draw calls.
- `src/scenes/interactions/PartitionInteraction.ts` — update line style.

### Acceptance
- Partition line is clearly visible against the shape background.
- Line is solid navy, not dashed.
- `npm run typecheck` clean.

---

## T4 — Decouple TTS narration from Reduce Motion preference

### Problem
In `LevelScene.ts` and `Level01Scene.ts`, the TTS call that reads the question prompt aloud is wrapped in `if (!checkReduceMotion())`. Reduced motion is for vestibular/seizure sensitivities. Audio narration is for early readers and children with dyslexia. These populations overlap in exactly the wrong direction — a child who needs both will get neither.

### Spec

**Add a separate `audioEnabled` / `ttsEnabled` preference:**
- `deviceMetaRepo` already stores `preferences` (check `src/persistence/repositories/deviceMeta.ts` for the exact shape).
- Add `ttsEnabled: boolean` (default `true`) to the preferences schema.
- In `SettingsScene.ts`, add a "Read questions aloud" toggle alongside the existing Audio toggle.
- In `Level01Scene.ts` and `LevelScene.ts`, replace:
  ```ts
  if (!checkReduceMotion()) tts.speak(prompt);
  ```
  with:
  ```ts
  if (prefs.ttsEnabled) tts.speak(prompt);
  ```
- The existing master Audio toggle (`audioEnabled`) can act as a parent gate: if audio is off, TTS is also silent regardless of `ttsEnabled`.

**Migration:** default `ttsEnabled = true` so existing users keep TTS on unless they opt out.

### Files to change
- `src/persistence/repositories/deviceMeta.ts` — add `ttsEnabled` to preferences schema + default.
- `src/scenes/SettingsScene.ts` — add "Read questions aloud" toggle.
- `src/scenes/Level01Scene.ts` — replace `checkReduceMotion()` TTS gate.
- `src/scenes/LevelScene.ts` — same.

### Acceptance
- Turning off Reduce Motion does not silence TTS.
- Turning off Audio silences TTS (master gate respected).
- "Read questions aloud" toggle in Settings persists across sessions.
- `npm run typecheck` clean.

---

## Execution order

T3 (partition line) → T4 (TTS decoupling) can run in parallel — small, isolated.  
T1 (FeedbackOverlay) and T2 (Quest oops) can also run in parallel — both are medium effort, neither touches the other's files.  
All four can start simultaneously.
