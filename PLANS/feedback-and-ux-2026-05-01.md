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

## T5 — Wrong-answer sound effect

### Problem
`SFXService` only defines two sounds: `playCorrect()` (ascending two-note jingle) and `playComplete()` (four-note fanfare). There is no sound at all for incorrect answers. Silence on a wrong answer removes half the audio feedback loop — a child can't close their eyes and know they got it right or wrong.

### Spec

**Add `playIncorrect()` to `SFXService`:**
- Use the same Web Audio API synthesis pattern already in the file.
- Sound: a short descending two-note tone (G4 → D4, 70ms each, 10ms gap). Slightly softer gain than `playCorrect` (use `0.18` vs whatever correct uses) — wrong-answer audio should be present but not harsh.
- Duration: ~160ms total. No tail.

**Wire it into `FeedbackOverlay`:**
- In `FeedbackOverlay.show()`, in the `kind === 'incorrect'` branch, call `sfx.playIncorrect()` the same way `sfx.playCorrect()` is called on correct.

### Files to change
- `src/audio/SFXService.ts` — add `playIncorrect()` method.
- `src/components/FeedbackOverlay.ts` — call it on `incorrect` kind.

### Acceptance
- Wrong answer produces a brief descending tone, noticeably different from the correct sound.
- Correct sound is unchanged.
- `npm run typecheck` clean.

---

## T6 — "Back to Menu" accidental-tap protection

### Problem
The "← Menu" button in both `Level01Scene` and `LevelScene` triggers an immediate `fadeAndStart(this, 'MenuScene', ...)` on `pointerup`. No confirmation. A 6-year-old tapping near the top-left of the screen mid-session loses all unsaved session progress silently. The button is 118×52px — large enough to hit accidentally during partition dragging.

### Spec

**Two-tap confirm pattern:**
- First tap: button text changes from `"← Menu"` to `"Leave? ✕"` and fill changes from `SKY_BG` to `CLR.warning` (amber). A 2000ms timer resets it back to normal if not confirmed.
- Second tap within 2000ms: confirms and navigates to MenuScene (with the existing fade).
- Any tap anywhere outside the button while in "Leave?" state resets it immediately.

**Implementation:**
- Add a `private menuButtonConfirmPending = false` flag and a `menuButtonResetTimer` reference.
- On first `pointerup` on the back button:
  - set `menuButtonConfirmPending = true`
  - update button text + color
  - start a `delayedCall(2000, resetButton)`
- On second `pointerup` while `confirmPending`:
  - cancel timer
  - call `fadeAndStart(this, 'MenuScene', ...)`
- Apply to both `Level01Scene.ts` and `LevelScene.ts`.

### Files to change
- `src/scenes/Level01Scene.ts` — two-tap protection on back button.
- `src/scenes/LevelScene.ts` — same.

### Acceptance
- Single tap on "← Menu" shows amber "Leave? ✕" state, does NOT navigate.
- Second tap within 2s navigates to menu.
- No tap within 2s: button resets to normal.
- `npm run typecheck` clean.

---

## T7 — Auto-hint after 3 wrong answers

### Problem
The hint button is manual-only — children must notice the pulsing "?" circle and decide to tap it. The code already tracks `this.wrongCount` and has a `wrongCount >= 3` branch, but it only changes mascot feedback there, it does not automatically open the hint. A struggling child who doesn't know to tap the hint button will sit stuck getting the same question wrong indefinitely.

### Spec

**Auto-invoke `onHintRequest()` on the 3rd wrong attempt:**
- In `Level01Scene.ts`, in the `onSubmit()` incorrect branch: after incrementing `wrongCount`, add:
  ```ts
  if (this.wrongCount === 3) {
    this.time.delayedCall(800, () => this.onHintRequest());
  }
  ```
  The 800ms delay gives the feedback overlay time to slide in before the hint appears.
- Apply identical logic to `LevelScene.ts`.
- At `wrongCount === 3`, Quest should also briefly shake/point toward the hint button before auto-triggering (optional enhancement — Quest `react('point')` if that expression exists, otherwise skip).

**Reset:** `wrongCount` already resets between questions — no change needed there.

### Files to change
- `src/scenes/Level01Scene.ts` — auto-hint on `wrongCount === 3`.
- `src/scenes/LevelScene.ts` — same.

### Acceptance
- Third wrong answer on the same question: hint text appears automatically ~800ms after feedback dismisses.
- First and second wrong answers: hint does not auto-appear.
- `npm run typecheck` clean.

---

## T8 — Ghost midpoint guide after first wrong answer

### Problem
When a child fails a partition question (gets it wrong), nothing changes visually on the shape to guide them. The next attempt looks identical to the one they just failed. There is no way for a 5-year-old to know WHERE "the middle" is just from the instruction text "drag to the middle."

### Spec

**After first wrong answer, draw a faint ghost line at 50%:**
- In `Level01Scene.ts`, in the `onSubmit()` incorrect branch: when `wrongCount === 1`, draw a faint dashed horizontal guide line at the shape's vertical midpoint (for horizontal partition) or vertical midpoint (for vertical partition).
- The ghost line: `0x1E3A8A` (NAVY), 3px thick, alpha `0.25`, dashed (every 12px on / 8px off), spanning the full width of the shape.
- Place a small label `"half"` in 14px BODY_FONT, NAVY, alpha 0.35, at the right edge of the shape adjacent to the line.
- The ghost line and label are stored as instance references and destroyed when the question advances (in `loadQuestion()` reset path).

**In `PartitionInteraction.ts` (for LevelScene):** same approach — after first wrong answer is reported back via the `ctx.pushEvent` or equivalent callback, draw the ghost at 50% of the shape's height or width.

### Files to change
- `src/scenes/Level01Scene.ts` — draw ghost guide on `wrongCount === 1`.
- `src/scenes/interactions/PartitionInteraction.ts` — same for LevelScene partition questions.

### Acceptance
- First wrong answer: a faint dashed line appears at 50% of the shape.
- Ghost line visible on the second attempt but not before.
- Ghost line is cleaned up when the next question loads.
- Ghost does not appear for non-partition archetypes.
- `npm run typecheck` clean.

---

## T9 — Onboarding hand pointer + tap-to-advance

### Problem (from code audit):
1. The 👆 hand pointer in Step 1 is at `SHAPE_CY + SHAPE_H / 2 + 44` — 44px **below the bottom of the shape**, not on the drag handle. A child following the pointer would try to drag the empty space below the shape.
2. Step 1 is entirely timer-driven (1.8s + 1.6s animation + 1.4s + 2.2s = 7s total). There is no way to tap to advance. An eager child sits waiting. A distracted child misses it.
3. When the child fails the Try step, Quest shows `think` (same ambiguity problem as T2 above).

### Spec

**Fix 1 — Hand pointer position:**
- Change `handPointer.y` from `SHAPE_CY + SHAPE_H / 2 + 44` to `SHAPE_CY` (the vertical center of the shape, where the drag handle actually lives).
- Update any associated animation that moves the hand pointer so it sweeps across the center of the shape horizontally (left to right), not below it.

**Fix 2 — Tap-to-advance Step 1:**
- Add a full-screen transparent interactive rectangle over the Step 1 demo area.
- On `pointerup`: cancel all pending `delayedCall` timers for Step 1 and immediately call `startStep2()` (or equivalent function that begins the "Your turn!" phase).
- Show a small "Tap anywhere to skip" text in 16px BODY_FONT, NAVY, alpha 0.5, at the bottom of the screen (above the Skip button) only during Step 1.

**Fix 3 — Oops in onboarding:**
- When the child fails the Try step (wrong partition), replace `mascot.react('think')` with `mascot.react('oops')` (once T2 is implemented).

### Files to change
- `src/scenes/OnboardingScene.ts` — all three fixes.

### Acceptance
- Hand pointer is horizontally centered on the drag handle, not below the shape.
- Tapping anywhere during Step 1 immediately advances to Step 2.
- Wrong partition in Try step shows `oops` expression (depends on T2).
- `npm run typecheck` clean.

---

## T10 — Prompt text and counter pill size

### Problem
- Prompt text is **22px** in both `Level01Scene` and `LevelScene`. Early readers (ages 5–7) typically need minimum 24–28px for comfortable decoding. The prompt is the most important text on screen.
- Question counter pill text is **17px** ("2 / 5"). This is too small to read from arm's length on a tablet. If the counter matters to the child, they need to be able to see it.

### Spec

**Prompt text:**
- `Level01Scene.ts`: change the prompt `fontSize` from `'22px'` to `'28px'`. Reduce `wordWrap.width` slightly if needed to prevent overflow (try `600px` from `640px`).
- `LevelScene.ts`: same — find the prompt text object and increase to `'28px'`.

**Question counter pill:**
- `Level01Scene.ts`: change the counter text `fontSize` from `'17px'` to `'22px'`.
- `LevelScene.ts`: same. If the pill container (118px wide) is too narrow for `'22px'` text, widen it to `140px`.

### Files to change
- `src/scenes/Level01Scene.ts` — prompt 22→28px, counter 17→22px.
- `src/scenes/LevelScene.ts` — same.

### Acceptance
- Prompt text visibly larger on screen, no overflow or truncation.
- Counter pill text readable from arm's length.
- `npm run typecheck` clean.

---

## T11 — SessionCompleteOverlay: "next level" call to action

### Problem
The session complete screen shows trophy + accuracy stars + confetti. It's well-animated. But it does not tell the child what comes next. After a correct session, the screen just offers "Play again" or "Menu" — there is no forward hook. A child who has just mastered a level and earned `scaffoldRecommendation: 'advance'` should see a clear "Next Level →" prompt, not just options to repeat or leave.

### Spec

**When `scaffoldRecommendation === 'advance'`, show a "Next level unlocked!" banner:**
- Below the star row, add a pill-shaped banner: `ACTION_FILL` (amber) background, `"Level N+1 unlocked! →"` in 24px TITLE_FONT, navy text.
- The banner animates in 400ms after the stars finish landing (so it feels like an earned reveal).
- Tapping the banner navigates directly to the next level (`fadeAndStart(this, levelNumber === 1 ? 'LevelScene' : 'LevelScene', { levelNumber: levelNumber + 1, studentId })`).

**The `SessionCompleteOverlay` needs to receive two new props:**
- `scaffoldRecommendation: 'advance' | 'stay' | 'regress'`
- `nextLevelNumber: number | null` (null if already at max)

**When `scaffoldRecommendation === 'stay'`:** show "Keep practising →" in the same pill style, tapping goes to the same level again.
**When `scaffoldRecommendation === 'regress'`:** show "Let's try an easier one →", tapping goes to `levelNumber - 1`.

**Caller updates:** `Level01Scene.closeSession()` and `LevelScene.closeSession()` both show this overlay — pass the already-computed `scaffoldRecommendation` and the appropriate next level number.

### Files to change
- `src/components/SessionCompleteOverlay.ts` — add props + conditional banner.
- `src/scenes/Level01Scene.ts` — pass `scaffoldRecommendation` and `nextLevelNumber: 2` when calling overlay.
- `src/scenes/LevelScene.ts` — same, compute `nextLevelNumber` from `this.levelNumber`.

### Acceptance
- Advance session: "Level N+1 unlocked!" banner appears after stars land. Tapping navigates to next level.
- Stay session: "Keep practising →" banner.
- Regress session: "Let's try an easier one →" banner.
- `npm run typecheck` clean.

---

## Updated problem summary

| # | Issue | Where | Severity |
|---|---|---|---|
| F1 | Feedback disappears in 600ms | `FeedbackOverlay.ts` | 🔴 Critical |
| F2 | Incorrect feedback animation invisible | `FeedbackOverlay.ts` | 🔴 Critical |
| F3 | Feedback layout broken (240px gap, mid-screen) | `FeedbackOverlay.ts` | 🟠 High |
| F4 | Quest has no "wrong" expression | `Mascot.ts` | 🟠 High |
| F5 | Partition line invisible on white shapes | `Level01Scene.ts`, `PartitionInteraction.ts` | 🟠 High |
| F6 | TTS gated by Reduce Motion | `LevelScene.ts`, `Level01Scene.ts` | 🟡 Medium |
| F7 | No sound on incorrect answer | `SFXService.ts` | 🟡 Medium |
| F8 | "Back to Menu" has no protection — one tap loses session | `Level01Scene.ts`, `LevelScene.ts` | 🟡 Medium |
| F9 | Hints never auto-show — stuck children get no rescue | `Level01Scene.ts`, `LevelScene.ts` | 🟡 Medium |
| F10 | No visual guide after first wrong partition attempt | `Level01Scene.ts`, `PartitionInteraction.ts` | 🟡 Medium |
| F11 | Onboarding hand pointer is below the shape, not on it | `OnboardingScene.ts` | 🟡 Medium |
| F12 | Onboarding Step 1 cannot be tapped to advance | `OnboardingScene.ts` | 🟡 Medium |
| F13 | Prompt text 22px — too small for early readers | `Level01Scene.ts`, `LevelScene.ts` | 🟡 Medium |
| F14 | Session complete shows no "what's next" — children stall | `SessionCompleteOverlay.ts` | 🟠 High |

---

## Execution order

All tasks are independent. Suggested grouping for parallel execution:

**Group A (FeedbackOverlay):** T1, T5 — both touch `FeedbackOverlay.ts`; run together.  
**Group B (Quest):** T2, T9-fix3 — both touch `Mascot.ts`; run together after T2 lands.  
**Group C (Partition):** T3, T8 — both touch partition drawing code; run together.  
**Group D (Small isolates):** T4, T6, T7, T10 — fully isolated, run in parallel with everything.  
**Group E (Session complete):** T11 — medium effort, run last (depends on T1 being done so the flow makes sense end-to-end).
