# Plan: UI/UX Elevation — Questerix Fractions

**Status:** Draft — awaiting per-task approval
**Last updated:** 2026-04-28
**Sibling plan:** [harden-and-polish.md](./harden-and-polish.md) (correctness, a11y, ops, logging)
**This plan:** *delight, character, celebration, world-building* — no curriculum, engine, or persistence changes

---

## Live-state Snapshot (what the user reports seeing today)

| Surface | Today |
|---|---|
| **Menu screen** | Number-line quest scene works. Wavy dashed path, three station buttons, atmospheric glows. **Bug:** "½" badge on the path renders as a blank white box. |
| **Loading screen** | Plain white background, grey "Loading..." text. No theming continuity with the rest of the app. |
| **Gameplay** | Sky-blue background, amber "Check" button, blue "?" hint. Progress shown as a flat `2 / 5` bar with text counter. No character, no celebration. |
| **Correct/wrong feedback** | Plain colored rectangle appears for 600 ms then fades. No animation entry, no particles, no sound. |
| **Level complete** | Basic card modal. No star rating, no fanfare, no progression hook. |

---

## Tasks at a Glance

| # | Task | Status | Effort | Risk |
|---|---|---|---|---|
| **T1** | Fix the "½" badge font-rendering bug | **Ready to execute on say-so** | 1 line | None |
| **T25** | Themed loading screen + scene transitions + star progress bar | Newly proposed | M | Low |
| **T26** | Celebration effects + trophy-and-stars completion screen | Newly proposed | M | Low |
| **T18** | In-game question-screen theme polish | Existing proposal | M | Low |
| **T27** | Procedural mascot character with reactions | Newly proposed | L | Medium |
| **T19** | Visual world/level map | Existing proposal | L | Medium |

Each task below is self-contained: motivation, scope, exact files, design specs, verification.

---

## T1 — Fix the "½" badge bug (no task needed; ready to execute)

**Where:** `src/scenes/MenuScene.ts` — the Continue-station fraction badge (search `'½'` or the `_renderFractionBadge` / `createFractionBadge` helper around lines 648–672 per the visual audit).

**Diagnosis:** Unicode fraction glyphs (`½`, `¼`) are not present in every font face. Fredoka One in particular ships with a limited glyph set; on devices where the system fallback also lacks a precomposed `½`, the renderer paints an empty white box.

**Fix:** Replace each Unicode fraction literal in MenuScene with a two-line composed string `1/2`:

```ts
// before
.text(x, y, '½', { ... })
// after
.text(x, y, '1/2', { ... })
```

If a stylized look is desired, render two stacked text objects (numerator above, denominator below, with a thin divider rect between) instead of falling back to text. Ship the simple fix first; revisit if visual review wants the stacked treatment.

**Verification:** Open MenuScene on each test device profile (chromium / iPhone SE / iPhone 12 / Pixel 5 / iPad Mini) and confirm the badge reads "1/2".

> **Awaiting:** verbal "go" — this fix is a one-character edit; I will not touch other surfaces in the same change.

---

## T25 — Themed loading screen, smooth scene transitions, star progress bar

**Goal:** unify the visual language end-to-end and replace the most plain piece of the gameplay HUD with something motivating.

### T25.A — Themed loading screen

**Where:**
- `index.html` lines 18–98 (the static splash that paints before Phaser boots — currently white-ish gradient + text + dot animation)
- `src/scenes/PreloadScene.ts` (the Phaser preload scene that runs after JS is parsed)

**Spec:**
- Background gradient identical to MenuScene `drawAdventureBackground` — `#E0F2FE` (top) → `#93C5FD` (bottom)
- Title rendered in **Fredoka One** (preloaded via `<link rel=preload as=font>` — already proposed in hardening plan 9.2): "Questerix Fractions"
- Below title: small inline-SVG of three fraction tiles (½, ¼, ⅛) that fade-in in sequence as the loader progresses
- Loading dots reused from current implementation, but recolored to navy on white-pill chip (matches the menu chip language)
- All animation gated by `prefers-reduced-motion`
- Splash hides on Phaser `'ready'` (existing `hideSplash` in `src/main.ts:20–27`); fade-out is now 300 ms cross-fade with the MenuScene background instead of an opacity dump

### T25.B — Smooth camera fade transitions

**Where:** every `this.scene.start(...)` call site:
- `src/scenes/BootScene.ts:133` (Boot → Preload)
- `src/scenes/PreloadScene.ts:124` (Preload → Menu)
- `src/scenes/MenuScene.ts:365–368` (Menu → Level01 / Level)
- `src/scenes/Level01Scene.ts:1226, ~1228` (back to Menu, advance to LevelScene)
- `src/scenes/LevelScene.ts` (Back to Menu)
- `src/scenes/SettingsScene.ts:goBack()`

**Spec:** new helper `src/lib/sceneTransition.ts` exporting:
```ts
export function fadeStart(from: Phaser.Scene, key: string, data?: object) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return from.scene.start(key, data);
  }
  from.cameras.main.fadeOut(220, 224, 242, 254); // sky-blue fade
  from.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    from.scene.start(key, data);
  });
}
```

Each scene `create()` adds:
```ts
this.cameras.main.fadeIn(280, 224, 242, 254);
```

Reduced motion → instant cuts as today. Total transition cost: ~500 ms perceived.

### T25.C — Star progress bar

**Where:** rewrite `src/components/ProgressBar.ts` (currently a flat rectangle with width tween + text counter, per visual audit lines 80–110).

**Spec:**
- Replace the flat bar with **5 star icons** in a horizontal row.
- Each star: ~44 px diameter, drawn via Phaser `graphics` (procedural 5-point star), centered above where the `2 / 5` text used to live.
- States per star:
  - Empty: outline-only stroke in `CLR.neutral300` (#C5CAD3)
  - Filled: solid amber (#FFB400) with a soft inner highlight, scale-pulse `1 → 1.25 → 1` over 280 ms with `Back.easeOut` on fill
- `setProgress(n)`: animates the star at index `n - 1` from empty to filled.
- ARIA preserved: `role="progressbar"`, `aria-valuenow={n}`, `aria-valuemax="5"` (TestHooks already mirror this for tests).
- Keep an accessible text equivalent off-canvas for screen readers ("3 of 5 stars earned").
- Reduced motion: instant fill, no scale-pulse.
- Halfway nudge: when `n = 3` is filled, the third star also briefly grows to 1.4× then settles (a small "halfway!" celebration).

**Why stars not pills:** stars carry the same emotional weight as the trophy completion screen (T26). Children intuitively read "filled stars = score" without copy.

---

## T26 — Celebration effects + trophy completion screen

### T26.A — Correct-answer celebration

**Where:** `src/components/FeedbackOverlay.ts:101–129` (the `show()` method) and `src/scenes/Level01Scene.ts:790–825` (`showOutcome` integration).

**Spec for `kind === 'correct'` only:**
- **Entry**: panel scale `0.7 → 1.05 → 1` over 280 ms with `Back.easeOut` (overshoot ~15 %). Currently appears at full alpha instantly.
- **Sparkle burst**: new component `src/components/SparkleBurst.ts`. Emits ~14 small star/circle particles from the center of the canvas:
  - Mixed colors: amber (#FFB400), success-soft (#D6F1E0), white
  - Each particle: 6 px radius, fades 1 → 0 over 800 ms, drifts upward with mild horizontal jitter
  - Wholly procedural (Phaser graphics), no asset files
- **Halt**: panel exits with the existing 120 ms fade.
- **Reduced motion**: skip scale-pulse and sparkles, but keep the panel and the green flash. Confetti for sound only (Phase T26 doesn't ship audio — that's tracked separately).

For `incorrect` and `close` states: the panel keeps a softer entry (200 ms `Quad.easeOut` opacity-only), no sparkles. Tone: encouraging, never punitive.

### T26.B — Trophy completion screen

**Where:** rewrite `src/scenes/Level01Scene.ts:1180–1240` (`showSessionComplete`) and the equivalent in `src/scenes/LevelScene.ts`.

**Spec:**
- Background dim crossfades 0 → 0.45 alpha over 280 ms (currently instant).
- Card scales `0.5 → 1.05 → 1` over 400 ms with `Back.easeOut`.
- **Trophy SVG** (procedural, drawn with Phaser graphics — gold cup, two handles, base) at the top of the card, ~120 × 140 px.
- **Star rating** below the trophy: 1, 2, or 3 amber stars, awarded by accuracy:
  - 3 stars: ≥ 90 % correct on first try (no wrong attempts in the session)
  - 2 stars: 60–89 % first-try accuracy, OR 100 % with hints
  - 1 star: completed all 5, but ≥ 40 % wrong-first
  - The earned-stars cascade-fill left-to-right, 220 ms per star, with a brief sound cue (sound is out of scope here; track the call site).
- "You finished 5 problems!" stays — but rendered as a friendlier "Great work, [displayName]!" using the player's name.
- **Two buttons** at the card's bottom:
  - `▶ Play Again` (primary, amber) — restarts the same level cleanly (open new session, reset attempts, reload questions).
  - `🏠 Back to Menu` (secondary, white pill, navy outline).
- Existing "Keep going ▶" advance-to-next-level path moves to a third tertiary button, only shown when next level is unlocked: `▷ Next Level: [name]`.
- Confetti: 60 procedural particles from the card edges, falling with `gravityY: 200` over 1.4 s.
- ARIA-live announcement: "Session complete. You earned 2 stars."
- Reduced motion: card appears instantly at full scale, stars fill without cascade, no confetti.

**Star rating accuracy data:** already tracked. `Level01Scene` has `correctCount` and `totalQuestionsAttempted` (lines 1162–1163). Use the ratio to choose 1/2/3 stars. Persist `starsEarned` per session row (additive field on `Session` type).

### T26.C — Telemetry hooks

Each celebration emits a structured log via the new context API from the hardening plan Phase 10:
- `log.q('celebrate', { kind: 'correct', traceId })`
- `log.scene('session_complete_celebrated', { stars, accuracy, hintsUsed })`

So we can later A/B test celebration variants if engagement data warrants.

---

## T18 — In-game question-screen theme polish

The Menu and the (proposed) Trophy screen feel like the same product. The active gameplay scene currently lags behind in visual treatment.

**Where:**
- `src/scenes/Level01Scene.ts:425–482` (header, prompt, hint, submit construction)
- `src/scenes/LevelScene.ts` (analogous header/prompt/footer)

**Scope:**
1. **Adventure background**: confirm `drawAdventureBackground(this, CW, CH)` is invoked in level scenes (it is in Level01Scene line ~186). No change unless missing.
2. **Header chrome**: the Level title pill ("Level 1 — Halves", line 388) is rendered with a heavy white-on-navy stroke. Soften:
   - Replace Phaser-text-stroke with a real white-pill background (rounded rect 28 px tall, 12 px padding) + navy text.
   - Add a small rounded "Level X" chip to the left of the title for at-a-glance scanning.
3. **Prompt panel**: the question text card (line 426) currently uses `backgroundColor: 'rgba(255,255,255,0.75)'`. Upgrade to:
   - Drawn rounded rect (24 px radius) with the same shadow language as buttons (4 px offset down, navy 0.15 alpha).
   - Padding bumped to 18 × 14.
   - Bottom-anchored small "🔊 Read again" button (TTS replay) sits inside the panel for one-tap re-narration. Wires into existing `tts.speak(promptText)`.
4. **Hint button**: currently a circle ?. Upgrade to a circular badge with a navy-on-amber question mark and a small "Hint" label below the circle (12 px Nunito). Reduces the "what's this button?" cognitive load for first-time users.
5. **Submit button**: keep the chunky amber 3D button, but add the subtle hover glow + scale `1 → 1.04` on hover (matches T26.A interactive language).
6. **Hint text panel**: the hint banner at `y = CH - 280` (line 442) currently uses `HINT_TEXT_STYLE`. Wrap it in a rounded white card with a small Quest face (when T27 lands) — for now, just add the rounded background and a left-side speech-tail triangle so it visually "comes from" the hint button.
7. **Back button** (line 398): bumped hit area (covered by the hardening plan's K-2 60 × 60 minimum). Visual: small left-arrow chip + "Menu" label.

**Constraint:** no curriculum or interaction logic changes. Pixel-pushing only.

**Verification:** screenshot diff before/after on chromium + iPhone 12 emulation; verify text contrast still passes axe.

---

## T27 — Friendly mascot character

The single biggest personality boost — the audit named "no character" as the #1 engagement gap.

### T27.A — Mascot module

**New file:** `src/components/Mascot.ts`

Procedural drawing only (Phaser `graphics` + `arc` + `circle` + `rect`). No image files. Suggested form for design review: round-bodied creature ~80 × 80 logical units, two big eyes (whites + dot pupils), small smile, optional accessory (a quill, a star). The exact creature lands in design sketches before code; this plan reserves the name `Quest` (working title — final naming in design review).

**API:**
```ts
class Mascot {
  constructor(scene: Phaser.Scene, x: number, y: number);
  setState(state: 'idle' | 'cheer' | 'think' | 'cheer-big' | 'wave'): void;
  setPosition(x: number, y: number): void;
  destroy(): void;
}
```

States:
- `idle` — slow blink + 2 px vertical bob, 4 s loop
- `cheer` — arms-up + scale-pulse 1 → 1.15 → 1, 600 ms, fires sparkles around the mascot
- `think` — head tilt 10° + small "..." bubble, holds 1 s
- `cheer-big` — 1.4× scale, full body bounce + spin (180°), 1200 ms, full confetti
- `wave` — gentle hand wave, 800 ms

Each state respects `prefers-reduced-motion` → swap to a static expression change (different mouth/eye shape).

### T27.B — Integration points

| Scene | Position | Default state | Reactions |
|---|---|---|---|
| MenuScene | bottom-left near the path start | `idle` (auto), `wave` on first appear | `wave` on hover of any button |
| Level01Scene / LevelScene | bottom-right corner, ~120 × 120 logical | `idle` | `cheer` on correct, `think` on hint request, `cheer-big` on session complete |
| Trophy completion (T26.B) | beside the trophy on the card | `cheer-big` | n/a |
| ErrorModalScene (sibling plan) | beside the error message | `think` | n/a |
| (Future) WelcomeScene | center, large | `wave` | scripted greeting |

### T27.C — Persona copy

Mascot doesn't need a voice yet (no audio in scope), but does need a name and 3–5 lines of micro-copy used in toasts and bubbles:

- "Halfway there!" (progress at 3/5)
- "Try moving the line a little." (hint tier 1, replaces current generic line)
- "You did it!" (correct toast)
- "That's okay — let's try a new one." (skip-button context)
- "Nice work, [name]!" (session complete card)

All copy lives in `src/lib/mascotCopy.ts` so it's i18n-extractable later.

### T27.D — Out of scope (this task only)

- Avatar customization (colors, hats, accessories) — separate later task.
- Mascot voice / TTS lines — separate audio task.
- WelcomeScene first-run flow — separate later task (depends on this mascot landing first).

---

## T19 — Visual world/level map

Replace the flat 3 × 3 grid modal with a scrollable horizontal world.

**Where:**
- Today: `src/scenes/MenuScene.ts:392–495` (`_renderLevelGrid` modal)
- New: `src/scenes/WorldMapScene.ts` (its own scene, launched from MenuScene's "Choose Level" button)

**Spec:**

A horizontally-scrollable canvas, ~2400 logical units wide, with 9 region markers connected by the same marching-dash path language already used on the menu. Each region is a tappable card with a themed motif:

| L | Region | Visual motif (procedural) |
|---|---|---|
| 1 | Halves Forest | Two trees + a split log |
| 2 | Quarters Bay | Four small boats |
| 3 | Equal Meadow | Equal flower beds |
| 4 | Naming Hills | Sign posts with "1/2", "1/4" |
| 5 | Compare Bridge | Two-pan balance scale |
| 6 | Number-Line River | Long dashed river segment |
| 7 | Equivalence Garden | Mirror-image pies |
| 8 | Sum Castle | Stacking tower bricks |
| 9 | Story Cliffs | Cloud + speech bubble |

State per region:
- **Locked**: greyscale + small lock icon. Tapping shows a Mascot bubble "Finish [previous region] first!"
- **Unlocked**: color, gentle hover scale.
- **Suggested next**: gold glow + Mascot pin standing on it.
- **Mastered**: subtle gold ribbon across the top of the card (uses `skillMastery` data via repo).

**Drag/scroll**: horizontal swipe on touch, drag on pointer, arrow keys for keyboard. Camera bounds enforce no over-scroll.

**ARIA**: each region card mounted as a real DOM button via A11yLayer (matches existing pattern in MenuScene), so keyboard tabbing reaches every region in order.

**Persistence**: track `student.discoveredRegions: number[]` so newly-revealed regions can play a one-time "✨ New region unlocked!" toast with a Mascot cheer.

**Verification:**
- Scroll behavior on chromium + iPad Mini emulation (touch + mouse).
- Tab order across all 9 regions.
- Locked-region tap shows bubble.
- Mastered ribbon appears for skills with `masteryEstimate >= 0.85`.

---

## Cross-cutting Design Tokens (added once, used by all tasks)

To keep T18, T25, T26, T27, T19 visually consistent, add these tokens before any of them lands. Single PR, ~30 lines, no behavior change.

**`src/scenes/utils/easings.ts`** (new):
```ts
export const EASE = {
  standard: 'Cubic.easeInOut', // existing default
  snappy:   'Quad.easeOut',    // button taps, T18
  pop:      'Back.easeOut',    // celebrations, T25.C, T26.A
  bouncy:   'Elastic.easeOut', // mascot cheer, T27
};
```

**`src/scenes/utils/colors.ts`** — extend palette:
```ts
joy:      0xff5e9c, // hot pink — celebration accent (T26)
gold:     0xfbbf24, // amber-400 — star fill (T25.C, T26.B)
goldDim:  0xfde68a, // amber-200 — empty star outline shimmer
sparkle:  0xfef3c7, // pale gold — sparkle particles (T26.A)
```

---

## Sequencing & PR Strategy

Following your priority order. Each row is one PR.

| PR | Task | Risk | Notes |
|---|---|---|---|
| 1 | T1 (½ badge fix) | None | One-character edit; ship on say-so |
| 2 | Cross-cutting design tokens | None | Foundation; nothing references them yet |
| 3 | T25.A (themed loading) | Low | Touches `index.html` + `PreloadScene` |
| 4 | T25.B (scene fade transitions) | Low | New helper, applied at every `scene.start` |
| 5 | T25.C (star progress bar) | Low | Component rewrite with ARIA preserved |
| 6 | T26.A (correct-answer sparkle + scale) | Low | Adds new `SparkleBurst` component |
| 7 | T26.B (trophy + star rating + Play Again) | Medium | Persists `starsEarned` field; rewrites session-complete |
| 8 | T18 (in-game theme polish) | Low | Visual; no behavior change |
| 9 | T27.A (Mascot component, isolated) | Low | New file; no integration yet |
| 10 | T27.B (Mascot integrated into Menu + Level scenes) | Medium | Touches every scene |
| 11 | T19 (WorldMapScene) | Medium | New scene; replaces grid modal |

PRs 3 → 8 deliver visible polish before the bigger Mascot + World Map work in 9 → 11.

---

## Verification Matrix

| Check | How | Pass |
|---|---|---|
| ½ badge readable | Open Menu on each device | Reads "1/2" cleanly |
| Loading screen themed | Reload app | Sky-blue background, Fredoka One, fraction tile fades |
| Scene transitions smooth | Navigate Menu → Level → Menu | 220 ms fade-out + 280 ms fade-in, no flash |
| Reduced motion → instant cuts | OS reduced-motion on, repeat | Instant transitions |
| Star progress bar | Solve a question | Stars cascade-fill with pulse; halfway star larger |
| Star bar accessible | Screen reader | Announces "3 of 5 stars earned" |
| Correct celebration | Solve a question | Panel scale-pop + ~14 sparkles drifting up |
| Trophy screen | Solve all 5 | Card scale-in, trophy + 1/2/3 stars cascade-fill, confetti |
| Star rating accuracy | Vary correct/wrong attempts | 3 stars at ≥90 % first-try, 2 at 60–89 %, 1 at <60 % |
| Play Again button | Tap on trophy card | New session opens; attempts reset; first question reloads |
| In-game header polish | Compare to prior screenshot | Real white pills, real shadows, no Phaser strokes |
| Read-again button on prompt | Tap speaker icon | TTS re-speaks prompt |
| Mascot idle | Open any scene | Slow blink + bob, no console errors |
| Mascot reactions | Solve correct/wrong/hint/complete | `cheer` / `think` / `cheer-big` fire correctly |
| World map scroll | Open Choose Level | Horizontal scroll, 9 regions visible, suggested glows |
| World map locked tap | Tap a locked region | Mascot bubble "Finish [previous] first!" |
| Existing tests | `npm run test:unit && npx playwright test` | All green |
| Bundle budget | `npm run measure-bundle` | ≤ 1 MB gzip |

---

## Out of Scope (this UI/UX plan)

- Audio / sound effects / haptics (separate audio plan; will reference celebration call-sites added here)
- Avatar customization (Welcome flow / name picker / theme color) — separate task
- Badges / streaks / XP visibility / currency — separate engagement plan
- Internationalization extraction (English-only for now; copy lives in `src/lib/mascotCopy.ts` ready for later extraction)
- Curriculum / engine / persistence / accessibility-fix work — covered by the sibling [harden-and-polish.md](./harden-and-polish.md) plan
- Parent dashboard, multiplayer, cloud sync — not in product scope

---

## Open Questions for You

1. **T1**: say "go" and I will fix the ½ badge in the next message (single edit).
2. **Mascot persona** (T27): pick one form before code starts — fox, owl, rocket-bot, blob, original creature?
3. **Star rating thresholds** (T26.B): the 90 % / 60 % / 40 % cuts above are educated guesses. Confirm or adjust before T26.B lands.
4. **World map orientation** (T19): horizontal scroll (proposed) or vertical scroll? Horizontal feels like an "adventure," vertical fits portrait-only better.
5. **Priority confirmation**: keep your proposed order T1 → T25 → T26 → T18 → T27 → T19, or reshuffle?
