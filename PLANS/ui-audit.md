# UI/UX Screen Audit — Questerix Fractions

**Status:** ACTIVE  
**Last updated:** 2026-05-01  
**Scope:** All UI, layout, ergonomics, visual design, and audio polish items.  
**Master plan:** `PLANS/PLAN.md`

This file contains the full UI audit. `PLANS/PLAN.md` carries only a brief table pointing here.

---

## Priority guide

- 🔴 **Critical** — pre-playtest blocker. Fix before putting a child in front of the app.
- 🟠 **High** — significant degradation of K-2 experience but not blocking; fix in the next sprint.
- 🟡 **Medium** — polish that meaningfully improves the feel; fix opportunistically.
- 🟢 **Low** — nice-to-have; revisit after first real playtest.

---

## S — Structural: collapse the three-island Level01 layout 🔴 Critical

**This single fix supersedes UI-1, UI-2, parts of UI-8, and parts of B2's region.** Address it as one coordinated layout pass on `Level01Scene` and `LevelScene` rather than piecemeal.

### Problem

The gameplay screen is split into three isolated vertical zones with large dead space:

```
y=0–300:   Back ← Menu | Quest (tiny, 0.75×) | Hint ? | Counter
              ↕  ~260px gap
y=430–690: THE SHAPE (the whole game)
              ↕  ~410px gap
y=1100:    [ Check ✓ ]
```

The Check button is **540 px below the shape** — after dragging, a child's finger is mid-screen, then has to reach to the bottom edge of the canvas. This is physically awkward (small arms can't span it without re-gripping the tablet) and cognitively disconnecting (by the time they reach Check, they've lost the spatial memory of where they placed the line).

### Target layout

```
y=60:    🏠 (back)    [ counter: 2/5 ]    [ ⭐⭐☆☆☆ ]
y=200:   prompt text
y=320–660: THE SHAPE   (520×340, larger per UI-2)     Quest at (80, 500) facing right
y=720:   [ 💡 Need a hint? ]
y=820:   [ Check ✓ ]
```

Everything the child needs to do lives between y=200 and y=820 — one comfortable arc of motion, not three separate zones.

### Concrete moves

| Element | Old | New |
|---|---|---|
| Check button | y=1100 | **y=820** |
| Hint button | (740, 160), R=36 | **(400, 720), 100×60 px**, amber, "💡 Need a hint?" |
| Quest (gameplay) | (720, 160), 0.75× | **(80, 500), 1.0×, facing right** — left of shape |
| Counter pill | top row, 17 px | top row, 22 px (per T10) |
| Star strip (progress) | not currently shown | top-right, y=60 |
| Shape | 340×260 at y=430–690 | **520×340 at y=320–660** (per UI-2) |
| Back button | text "← Menu" | **🏠 icon at 36 px** (per UI-S5) |

### Done when

- Vertical distance from shape bottom edge to Check button ≤ 200 px.
- Hint button and Quest do not overlap any other interactive element (Quest+Hint collision fixed).
- A child can complete drag → Check without re-gripping the tablet.

---

## UI items — Gameplay screen (Level01Scene + LevelScene)

### UI-1 — Drag handle has zero affordance 🔴 Critical

**Files:** `src/scenes/Level01Scene.ts`, `src/scenes/interactions/PartitionInteraction.ts`  
**Problem:** Partition line is an 8 px thin rectangle. No grip indicator, no arrows, no pulse. A 5-year-old has no idea it's draggable. (Onboarding T9 fixes the demo pointer, but actual gameplay still has an invisible interactive object.)  
**Fix:**
- Circular gripper at `(handlePos, SHAPE_CY)`: filled circle r=20 px, white fill, 3 px navy stroke.
- Two ‹ › chevrons (14 px, navy) flanking the gripper.
- On question load: pulse tween (scale 1.0 → 1.15 → 1.0, 600 ms yoyo × 2). Stop on first `pointerdown`.

### UI-2 — Shape is too small for a child's hand 🔴 Critical

**Files:** `src/scenes/Level01Scene.ts`, `src/scenes/interactions/PartitionInteraction.ts`  
**Problem:** `SHAPE_W = 340` (42 % of canvas), `SHAPE_H = 260` (20 %). A 5–7-year-old's thumb is 25–35 px of contact area. The 8 px handle on a 340 px shape leaves no forgiveness.  
**Fix:** `SHAPE_W = 520` (65 %), `SHAPE_H = 340`. Update all downstream math (clamp bounds, midpoint, ghost guide).

### UI-S1 — Partition line color washed out 🔴 Critical

**Files:** `src/scenes/Level01Scene.ts` → `updatePartitionLine()`, `PartitionInteraction.ts`  
**Problem:** `PATH_BLUE = #93C5FD` underlay washes out the navy dashes drawn on top. The line reads as a faint blur on a white shape.  
**Fix:** Drop the dashes. Single solid line: navy `#1E3A8A`, **16 px** thick, white 2 px outline, rounded caps. No underlay.

### UI-S2 — Hint button too small 🔴 Critical

**Files:** `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts`  
**Problem:** Current hint button is r=36 (72 px diameter). On a 1280 px canvas this is a tiny target for a 5-year-old.  
**Fix:** 100×60 px pill, amber fill `ACTION_FILL`, "💡 Need a hint?" in 20 px TITLE_FONT. After 2 wrong answers on the same question, scale-pulse to 1.1 (800 ms yoyo) until a hint is requested or the question advances.

### UI-S3 — Quest and Hint button collide 🟠 High

**Files:** `src/scenes/Level01Scene.ts`  
**Problem:** Quest at (720, 160) at 0.75× and the hint circle at (740, 160) sit on top of each other. Quest's wave animation obscures the hint button; a child tapping "?" may accidentally activate Quest.  
**Fix:** Already covered by **S — Structural** layout: Quest moves left of shape, hint button moves below shape. Verify no overlap after the structural pass.

### UI-S4 — "← Menu" back button is unreadable text 🟠 High

**Files:** `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts`  
**Problem:** Text "← Menu" at (52, 60) in small font. K-2 children can't read "Menu". A 5-year-old who wants to stop has no idea this is the exit.  
**Fix:** Replace with a 🏠 icon at 36 px in a 60×60 hit zone. Pair with B2 / T6 (two-tap protection) so accidental taps don't lose progress.

### UI-3 — Snap color fill too faint 🟠 High

**Files:** `src/scenes/interactions/PartitionInteraction.ts`, `src/scenes/Level01Scene.ts`  
**Problem:** Halves fill at 0.45 alpha with similar pastels — the "aha!" moment doesn't land.  
**Fix:** Alpha 0.85. Two saturated, contrasting colors — vivid mint `#22C55E` left, vivid coral `#F97316` right.

### UI-7 — Fraction labels too abstract for K-1 🟡 Medium

**Files:** `src/scenes/interactions/PartitionInteraction.ts`, `src/scenes/Level01Scene.ts`  
**Problem:** "1/2" appears in each half. K-1 students (ages 5–6) cannot read symbolic fractions.  
**Fix:** Word leads, symbol follows. **"half"** in 48 px TITLE_FONT primary, **"1/2"** in 24 px secondary below. Mapping: thirds → "third" / "1/3"; fourths → "quarter" / "1/4".

### UI-12 — Fraction labels animate in on snap 🟢 Low

**Files:** as UI-7  
**Fix:** After UI-7 ships: scale-bounce label 0 → 1.3 → 1.0 over 200 ms with `Back.easeOut`, fired 200 ms after the color fill starts (stagger).

### UI-10 — No drag sound during interaction 🟡 Medium

**Files:** `src/audio/SFXService.ts`, `Level01Scene.ts`, `PartitionInteraction.ts`  
**Fix:** Add `playScrub()` — sine wave 200–400 Hz glide, gain 0.06, 80 ms. Fire on `pointermove` while dragging, throttled to once per 50 ms. Optional pitch rise as handle approaches center.

---

## UI items — MenuScene

### UI-M1 — Hero action at the very bottom 🟠 High

**File:** `src/scenes/MenuScene.ts`  
**Problem:** Play! button at y=1100 — 86 % down the canvas. The natural thumb resting zone on a held tablet is mid-screen.  
**Fix:** Move Play! to **y=760–840**. Coordinate with UI-M2/UI-M3 — same scene, one pass.

### UI-M2 — Quest is not the hero 🟠 High

**File:** `src/scenes/MenuScene.ts`  
**Problem:** Quest at (680, 980), in the bottom-right corner, sandwiched between Continue (y=700) and Play! (y=1100). Quest's wave happens out of the child's visual attention zone (centered on title).  
**Fix:** Center Quest horizontally (canvas-x ≈ 400). Position at **y=500–580**. Scale 1.3–1.5×. Play! button below Quest's feet.

### UI-M3 — "A math adventure! 🚀" tagline is wasted space 🟡 Medium

**File:** `src/scenes/MenuScene.ts`  
**Problem:** 28 px tagline at y=270 between title (y=140) and the path (y=420). 150 px of canvas doing nothing.  
**Fix:** Replace with a Quest speech bubble: **"Hi! I'm Quest. Let's learn about halves!"** Establishes character + purpose in 2 seconds. (Reuses `showSpeechBubble` from T14 if shipped.)

### UI-M4 — Number-line fraction badges confuse, don't teach 🟡 Medium

**File:** `src/scenes/MenuScene.ts` → `_renderFractionBadge` (or equivalent)  
**Problem:** Wavy path with "0", "½", "1" badges. A teacher would love it; a 5-year-old sees three numbers on a squiggle with no context. The pedagogical metaphor is invisible to the actual user.  
**Fix (pick one — discuss with user):**
- A: replace fraction badges with icons — 🎮 (Play), ⚙ (Settings), 📍 (Continue).
- B: keep badges but enlarge to 48 px and add a one-line explainer overlay on first visit.

### UI-M5 — Streak text is below the fold 🟡 Medium

**File:** `src/scenes/MenuScene.ts`  
**Problem:** Streak at y=1255 — below the Play button on a 1280 px canvas. Off-screen on any device with browser chrome. Streak motivation only works if seen.  
**Fix:** Move streak to **y=920** (between Quest and Play! after UI-M1/M2 reposition). Render as a flame pill (per T17).

### UI-4 / UI-5 — Menu bottom-heavy / Quest not the hero 🟠 High (legacy)

**Status:** Superseded by UI-M1 + UI-M2. The structural items above are the canonical specs; UI-4/UI-5 stay listed for traceability.

---

## UI items — PreloadScene

### UI-9 — Loading screen is dead air 🟡 Medium

**File:** `src/scenes/PreloadScene.ts`  
**Problem:** "Loading" in small muted text. Static mascot. A child has no feedback that anything is happening.  
**Fix:**
- Bouncing Quest: scale tween ±0.05, 500 ms yoyo, loops until load complete.
- Animated dots cycling "Loading .", "Loading ..", "Loading ..." at 400 ms intervals.

### UI-P1 — Progress bar pause feels like a crash 🟡 Medium

**File:** `src/scenes/PreloadScene.ts`  
**Problem:** Progress bar fills to 100 % fast. Brief pause before the scene transition reads as a freeze.  
**Fix:** When the bar reaches 100 %, hold it green and trigger a Quest celebration tween (200 ms) before transitioning. The pause becomes intentional, not mysterious.

### UI-P2 — "Loading" is a technical word 🟡 Medium

**File:** `src/scenes/PreloadScene.ts`  
**Problem:** A 5-year-old doesn't know what "Loading" means.  
**Fix:** Replace with **"Getting ready…"** — or move into a Quest speech bubble: **"Almost there! 🚀"** (depends on `showSpeechBubble` from T14).

---

## UI items — FeedbackOverlay

### UI-F1 — Correct feedback is context-free 🟡 Medium

**File:** `src/components/FeedbackOverlay.ts`  
**Problem:** Generic ✓ or static emoji. The child who just succeeded sees nothing about their specific shape — the reward is detached from the action.  
**Fix:** Render a mini version of the successful split inside the panel — the same shape with both halves color-filled (same colors as UI-3) and labels (same as UI-7), scaled to ~120 px wide. The reward shows them what they just did.

### UI-F2 — Wrong-answer shake is mechanical 🟡 Medium

**File:** `src/components/FeedbackOverlay.ts`, `src/components/Mascot.ts`  
**Problem:** ±22 px, 3 cycles, 80 ms. Functional but clinical. For K-2, the wrong feedback should feel like Quest wincing, not like a banner shaking.  
**Fix:** Replace shake with Quest's `oops` animation (T2) integrated into the panel — Quest leans into the panel area for 800 ms and droops, eyes squint. Keep a small 1-cycle shake (one ±10 px wobble) as residual motion.

### UI-F3 — Correct timing 1400 ms is slightly too long 🟡 Medium

**File:** `src/components/FeedbackOverlay.ts`  
**Problem:** A child who got it right wants the next question. 1400 ms before dismiss feels like waiting.  
**Fix:** `DISPLAY_MS_CORRECT = 1100` (was 1400). Keep `DISPLAY_MS_INCORRECT = 1600` — wrong needs more processing time.

---

## UI items — SessionCompleteOverlay

### UI-6 — Progress stars too subtle 🟡 Medium

**File:** `src/components/SessionCompleteOverlay.ts`  
**Problem:** 36 px stars; gold-vs-pale-gold contrast is small for young eyes.  
**Fix:** **48 px** (or **72 px**, see UI-SC1). Empty stars: hollow outline only — no color fill — to maximize before/after contrast. Keep the 1.4× bounce-in.

### UI-SC1 — Star spacing too tight 🟡 Medium

**File:** `src/components/SessionCompleteOverlay.ts`  
**Problem:** 90 px spacing → 3 stars span 180 px. On 800 px canvas, reads as small.  
**Fix:** **100 px spacing** with **72 px** star emoji. Stars span 300+ px and are visually dominant.

### UI-SC2 — Scaffold banner appears too late 🟡 Medium

**File:** `src/components/SessionCompleteOverlay.ts`  
**Problem:** "Level 2 unlocked! →" appears 1300 ms after the overlay lands — child has stopped watching.  
**Fix:** Reduce to **700 ms**.

### UI-SC3 — Quest is absent from celebration 🟡 Medium

**File:** `src/components/SessionCompleteOverlay.ts`  
**Problem:** Quest is hidden behind the full-screen overlay. The mascot should celebrate alongside the child, not disappear.  
**Fix:** Reduce overlay height to ~900 px. Leave bottom 380 px clear for Quest, animating `cheer-big` (or `celebrate` for a perfect session per T15).

---

## UI items — LevelMapScene

### UI-11 (RESOLVED) — Adventure map post-session routing overlay 🟠 High

**Decision (2026-05-01):** Implement Option B — keep the map as-is, intercept post-session return with a focused 3-button overlay. Option C (redesigning the map for receding cards) is parked for a future track and may not be needed if B closes the dropout.

**Why:** The map's visual design isn't broken. The dropout is a *mode-switch* problem: a child finishing a session is emotionally primed for one more action; landing on a spatial 9-node map breaks that momentum. Option B closes the gap with minimal change to the map itself.

**Spec — post-session routing overlay:**

When a session ends and the child taps through `SessionCompleteOverlay`, pass `{ postSession: true }` into `LevelMapScene`. On `create()`, if the flag is set, show a centered routing overlay before the map becomes interactable:

```
╔══════════════════════════╗
│  ✨ Great job! ✨        │
│                          │
│  [ → Next Level ]        │  amber, full width, 110 px tall
│  [ ↺ Play Again  ]       │  blue, full width, 90 px tall
│  [   🏠 Menu     ]       │  small pill, muted
╚══════════════════════════╝
```

- Quest appears below the overlay doing the `celebrate` animation.
- Tapping Next Level → reads the BKT-suggested level from `_getUnlockedLevels()` (existing logic) → `fadeAndStart(LevelScene, { levelNumber, studentId })`.
- Tapping Play Again → `fadeAndStart(LevelScene, { levelNumber: same, studentId })`.
- Tapping Menu → exits to MenuScene (skips the map entirely).
- The overlay closes after any tap. If the child closes it without choosing, the map becomes the active browse view.

**Files to touch:**
- New: `src/components/PostSessionOverlay.ts` (thin wrapper or standalone sheet — don't reuse FeedbackOverlay if it complicates the API).
- `src/scenes/LevelMapScene.ts` — accept `{ postSession: boolean }` in `init`, show overlay in `create` if set.
- `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts` — pass `postSession: true` when routing to LevelMapScene after session complete.

**Effort:** ~3–5 h.

**Done when:** A child finishing a session sees the 3-button overlay before the map; selecting Next Level/Play Again/Menu routes correctly.

### UI-LM1 — Map complexity (Option C) 🟢 Low

**Status:** Parked. Revisit only if first real playtest shows children dropping out *during* the map (not just after). If UI-11 Option B closes the dropout, C may never need to ship.

---

## Decision log: lessons captured

These are the design conclusions reached during the 2026-05-01 audit. Future agents should read them before changing the relevant area.

1. **The session-end → map handoff is a structural coupling problem, not a map-quality problem.** Don't redesign the map to fix dropout — intercept the handoff with explicit routing.
2. **K-2 children need word-first labels with symbols as secondary annotation.** "half" in 48 px primary, "1/2" in 24 px secondary. Never lead with the symbol.
3. **Layout reviews must use measured y-coordinates, not feature presence.** "The streak is shown" tells you nothing if it lives at y=1255 below the fold. Always cite the y-position.
4. **Three-island layouts force a child to re-grip the tablet between drag and Check.** Keep the action arc within ~600 px of vertical space (drag origin → Check button).
5. **Faint pastels at 0.45 alpha don't teach.** The visual reward must be saturated and contrasting (0.85 alpha, distinctly different hues) for the "aha" to land.
