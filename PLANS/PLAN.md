# Questerix Fractions — Active Plan

**Created:** 2026-05-01  
**Status:** ACTIVE  
**MVP exit criterion:** A real student completes a 5-question L1 session in a real browser tab, confirmed via DevTools → IndexedDB.

> All previous planning files are archived in `PLANS/_archive/`. This is the single source of truth for remaining work.

---

## Priority Order

Work top-to-bottom. Do not start a later item unless an earlier item is verified complete or explicitly blocked.

---

## P1 — End-to-End Browser Validation (do this first, before any code)

**Status:** Not yet verified after the 2026-05-01 merge train (17 PRs).  
**Effort:** 30–60 min

Run the app in a real Chrome/Chromium tab and walk the full happy path:

```bash
npm run dev:app
# Open http://localhost:5000
```

Checklist:
- [ ] Menu loads, Play button visible
- [ ] Tap Level 1 → partition question appears with correct prompt (not "identify" text)
- [ ] Drag handle moves freely, releases at position
- [ ] Submit correct answer → green feedback overlay appears ≥ 1400 ms, counter increments (1/5 → 2/5)
- [ ] Submit wrong answer → red overlay, shake animation, counter does NOT increment
- [ ] Hint ? button → tier 1 text shows; press again → tier 2; press again → tier 3
- [ ] Complete 5 correct → session-complete card appears with "Keep Going" + "Back to Menu"
- [ ] DevTools → Application → IndexedDB → `questerix-fractions`:
  - `attempts` table has 5 rows
  - `skillMastery` has a row with `masteryEstimate > 0.1`
  - `streakRecord` has 1 row (`currentStreak: 1`)
- [ ] "Back to Menu" returns to menu without crashing

**If anything fails:** fix only that specific failure. Do not refactor. Per C10: every change must serve validation, not polish.  
**If it passes:** check off and move to P2.

---

## P2 — Wire BKT (Learning Engine Is Dark)

**Status:** ✅ CLOSED — confirmed wired (2026-05-01).  
Both `Level01Scene` and `LevelScene` call `updateMastery()` inside an atomic Dexie transaction after every attempt. Mastery updates. Nothing to do here.

---

## P3 — Fix Level Progression

**Status:** ✅ P3a CLOSED — confirmed (2026-05-01). "Keep Going" correctly advances to `LevelScene { levelNumber: 2 }` via the scaffold system. Regress path on L1 sends to menu (correct — no L0 exists); copy is wrong — see B2 below.  
**P3b:** Verify the `MenuScene` "Choose Level" 3×3 grid routes correctly to each level. Needs manual confirmation.

### P3b — Verify level grid routing (needs manual check)
**File:** `src/scenes/MenuScene.ts` (`_openLevelChooser`, `_renderLevelGrid`)  
**Test:** Open `localhost:5000`, tap "Choose Level", tap Level 3 → verify a level-3 question loads.  
**Done when:** All 9 tiles route to the correct `LevelScene { levelNumber: n }` without crashing.

---

## B — Active Bugs (fix before any playtest)

These were discovered during the 2026-05-01 onboarding/UX pass. Both are regressions introduced by recent changes. Fix in order.

---

### B1 — Skip button blocked during Step 1 (T9 depth regression)

**Severity:** 🔴 Critical — existing feature regressed  
**File:** `src/scenes/OnboardingScene.ts`  
**Symptom:** The full-screen invisible tap-to-advance rectangle added for T9-fix2 sits at depth 29. The "Skip tutorial" button is at depth 5. In Phaser 4, the higher-depth object wins all pointer events. A child tapping "Skip tutorial" during the watch step is silently sent to the try step (step 2) instead of skipping the tutorial entirely.  
**Fix (pick one):**
- Option A (preferred): raise the skip button's depth above the hit rect — `skipBtn.setDepth(35)` (or whatever depth constant the button uses).
- Option B: remove the skip button from the hit rect's interactive area by setting the rect's hit area to exclude the bottom row (e.g. a polygon or a smaller rect that stops above the skip button's y).

**Done when:** Tapping "Skip tutorial" during Step 1 exits the tutorial immediately, not advances to step 2.

---

### B2 — Misleading copy: "Let's try an easier one →" on Level 1

**Severity:** 🔴 High — promise the child can't redeem  
**File:** `src/scenes/Level01Scene.ts` (or `src/components/SessionCompleteOverlay.ts` — wherever `scaffoldRecommendation === 'regress'` renders the banner)  
**Symptom:** When a child scores below 40% on Level 1, the scaffold banner reads "Let's try an easier one →". Tapping it navigates to the main menu because there is no L0. A struggling 5-year-old sees a promise of an easier level, taps it, and lands on the menu instead.  
**Fix (pick one — check with user if unsure):**
- Option A (simpler): cap `scaffoldRecommendation` at `'stay'` when `levelNumber === 1`. The regress branch never fires for L1.
- Option B: keep the regress recommendation but change the copy to `"Try again →"` when `levelNumber === 1` (so the button still navigates to menu, but makes no false promise).

**Done when:** A struggling L1 child never sees "easier one" copy that routes to the menu.

---

### B3 — FPS drops in OnboardingScene (3–6 FPS sustained)

**Severity:** 🟡 Medium — bad on constrained devices, may be tab-throttling  
**File:** `src/scenes/OnboardingScene.ts` → `updatePartitionLine()` (or equivalent)  
**Symptom:** Browser logs show OnboardingScene running at 3–6 FPS for sustained periods during the Step 1 animation.  
**Most likely cause:** `updatePartitionLine()` is called on every animation frame. It runs `g.clear()` + a `while` loop drawing ~15 individual dashed-line segments. In Phaser's Canvas renderer on a constrained environment (Replit iframe, low-end tablet), that Graphics redraw budget gets exhausted quickly. Could also be tab-throttling (focus-lost/regained events coincide).  
**Fix:** Replace the per-frame dashed line loop with either:
- A single solid line (no loop needed — one `lineBetween` call).
- A static `RenderTexture` captured once; reuse the texture instead of redrawing each frame.

**Verify on a real device** before declaring fixed — tab-throttling in Replit can fake this symptom.

**Done when:** OnboardingScene sustains ≥ 30 FPS on a mid-range Android tablet (or the Replit iframe, whichever is available first).

---

## P4 — Gold Mastery Ribbon on Level Cards

**Status:** Not built.  
**Effort:** 1–2 h  
**Files:** `src/scenes/MenuScene.ts`, `src/components/LevelCard.ts` (if it exists), `src/persistence/repositories/skillMastery.ts`

Once progression is fixed (P3), the level map should show which levels the child has mastered.

Spec:
- On `MenuScene.create()`, read mastery records for the current student via `skillMasteryRepo.getByStudentId(studentId)`.
- For each level card where `masteryEstimate >= 0.8` (the mastery threshold), render a small gold ribbon or star badge in the top-right corner of the card.
- Gold: `0xFFD700`. Badge: 24 px star or ribbon icon, no text needed.
- Cards for locked levels remain unchanged (grey overlay as today).

**Done when:** A level with mastered BKT state shows a gold badge on the map.

---

## P5 — UX Pre-Playtest Fixes (run in parallel groups)

**Status:** All 17 tasks pending. Work these after P1–P3 are green.  
**Source:** `PLANS/_archive/feedback-and-ux-2026-05-01.md` (full specs)

Quick reference — execute in groups for parallelism:

| Group | Tasks | Files | Status |
|---|---|---|---|
| A — FeedbackOverlay | T1 (redesign: bottom-sheet, solid colors, 1400/1600 ms timing, real shake), T5 (wrong-answer sound) | `FeedbackOverlay.ts`, `SFXService.ts` | [ ] |
| B — Quest expressions | T2 (oops: droop + wince eyes + sweat drop on wrong), T9-fix3 (oops in onboarding) | `Mascot.ts`, `Level01Scene.ts`, `LevelScene.ts`, `OnboardingScene.ts` | [ ] |
| C — Partition | T3 (solid navy line, sky-tint shape bg), T8 (ghost midpoint after 1st wrong), T13 (snap juice: tint fills + fraction labels + snap sound) | `Level01Scene.ts`, `PartitionInteraction.ts`, `SFXService.ts` | [ ] |
| D — Small isolates | T4 (decouple TTS from Reduce Motion → `ttsEnabled` pref), T6 ("Back to Menu" 2-tap protection), T7 (auto-hint on 3rd wrong), T10 (prompt 22→28 px, counter 17→22 px) | `deviceMeta.ts`, `SettingsScene.ts`, `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| E — Session complete | T11 (advance/stay/regress call-to-action banner), T15 (perfect 5/5 gold overlay + doubled confetti) | `SessionCompleteOverlay.ts`, `Level01Scene.ts`, `LevelScene.ts`, `SFXService.ts` | [ ] |
| F — Quest personality | T14 (idle/boredom 3-stage escalation at 10/18/28 s) then T16 (speech bubbles at 10 key moments) | `Mascot.ts`, `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| G — Streaks | T12 ("3 in a Row! 🔥" mid-session banner), T17 (daily streak pill in Menu + LevelMap) | `SFXService.ts`, `Level01Scene.ts`, `LevelScene.ts`, `MenuScene.ts`, `LevelMapScene.ts` | [ ] |
| H — Onboarding | T9-fix1 (hand pointer at SHAPE_CY not below shape), T9-fix2 (tap-to-advance Step 1) | `OnboardingScene.ts` | [ ] |

Full task specs in `PLANS/_archive/feedback-and-ux-2026-05-01.md`.

---

## UI — Layout, Ergonomics & Visual Design

Items ordered by severity. The two 🔴 items are pre-playtest blockers alongside B1/B2 — fix them before putting a child in front of the app.

---

### UI-1 — Drag handle has zero affordance 🔴 Critical

**File:** `src/scenes/Level01Scene.ts`, `src/scenes/interactions/PartitionInteraction.ts`  
**Problem:** The partition line is an 8 px thin rectangle with no grip indicator, no arrows, no "touch me" pulse. A 5-year-old has no idea it's draggable. Onboarding T9 fixes the pointer for Step 1, but during actual gameplay the handle is invisible as an interactive object.  
**Fix:**
- Draw a circular pill/gripper centered at `(handlePos, SHAPE_CY)`: filled circle ~28 px radius, navy border 3 px, white fill.
- Add ← → chevrons (small, 14 px, navy) left and right of the circle.
- On question load, play a short pulse tween (scale 1.0 → 1.15 → 1.0, 600 ms yoyo × 2) that stops the moment the child starts dragging (`pointerdown`).

**Done when:** The drag handle is unmistakably interactive on first glance, and the pulse stops on first touch.

---

### UI-2 — Shape is too small for a child's hand 🔴 Critical

**File:** `src/scenes/Level01Scene.ts`, `src/scenes/interactions/PartitionInteraction.ts`  
**Problem:** `SHAPE_W = 340`, `SHAPE_H = 260` on an 800×1280 canvas = 42% wide, 20% tall. A 5–7-year-old's thumb is 25–35 px of contact area. Dragging across a 340 px shape with an 8 px handle leaves almost no forgiveness margin. This is a physical ergonomics failure.  
**Fix:** Increase to at least `SHAPE_W = 520` (65% of canvas), `SHAPE_H = 340`. Update any downstream math that depends on these constants (clamp bounds, midpoint calculation, ghost guide position from B3/T8).  
**Note:** Verify no overlap with FeedbackOverlay or hint button after resize.

**Done when:** The drag shape fills ≥ 65% canvas width and passes a thumb-tap test on a real tablet.

---

### UI-3 — Snap color fill is too faint 🟠 High

**File:** `src/scenes/interactions/PartitionInteraction.ts`, `src/scenes/Level01Scene.ts` (T13 implementation)  
**Problem:** The two halves fill with `ACTION_FILL` (amber) and `SKY_BG` (blue) at 0.45 alpha — a washed-out pastel. The pedagogical point of the snap is the "aha!" that the shape is now two equal halves. Faint pastels don't land.  
**Fix:** Raise alpha to 0.85. Use two strongly contrasting, saturated colors — e.g. vivid mint `0x22C55E` (green-500) for the left half and vivid coral `0xF97316` (orange-500) for the right. The contrast between the halves is what makes the concept click.

**Done when:** The two halves are clearly distinct and visually "pop" on correct snap.

---

### UI-4 — Menu is radically bottom-heavy 🟠 High

**File:** `src/scenes/MenuScene.ts`  
**Problem:** Title at y=140, Quest at y=980, Play! at y=1100, streak at y=1255. Everything worth seeing is crammed into the bottom 23% of the 1280 px canvas. The top 77% is empty sky with a title.  
**Fix:** Reposition Quest to y=620–680 (canvas center), Play! button to y=860. This distributes the visual weight evenly and gives Quest room to animate without being crowded by buttons.

**Done when:** Quest occupies the vertical center of the menu and the layout feels balanced.

---

### UI-5 — Quest is not the hero on the menu 🟠 High

**File:** `src/scenes/MenuScene.ts`  
**Problem:** Quest is tucked bottom-right at (680, 980) — a supporting actor, not the emotional anchor. For K-2, the mascot is what children attach to.  
**Fix:** Center Quest horizontally (canvas center x ≈ 400 on an 800 px canvas), scale up 1.3–1.5× from the current menu size. Place the Play! button below Quest's feet. Quest should make "eye contact" with the child — i.e. face forward, at mid-screen.  
**Note:** Coordinate with UI-4 (reposition) — these are the same scene, best done in one pass.

**Done when:** Quest is centered, large, and visually dominant on the menu.

---

### UI-6 — Progress stars are too subtle 🟡 Medium

**File:** `src/components/SessionCompleteOverlay.ts` (or wherever stars are rendered)  
**Problem:** Five ☆/★ emoji at 36 px. Filled vs empty relies on gold vs pale-gold — a small perceptual difference for young children, especially under 40 px.  
**Fix:** Increase to 48 px. Change empty stars to a hollow outline only (no color fill) so the before/after contrast is maximum. Keep the bounce-in tween (scale 1.4×) — it's good.

**Done when:** A child can tell instantly which stars are filled and which are empty from arm's length on a tablet.

---

### UI-7 — Fraction labels are too abstract for K-1 readers 🟡 Medium

**File:** `src/scenes/interactions/PartitionInteraction.ts`, `src/scenes/Level01Scene.ts` (T13 snap labels)  
**Problem:** When the partition snaps, "1/2" appears in each half. Most K-1 students (ages 5–6) cannot read the symbolic fraction — that's a late-K or Grade 1+ skill. The label leads with the symbol, not the word.  
**Fix:** Show "half" in bold 48 px TITLE_FONT as the primary label. Below it, show "1/2" in 24 px as the secondary label. Word leads; symbol follows. For thirds: "third" / "1/3". For fourths: "quarter" / "1/4".

**Done when:** Both the word and the symbol appear, word visually dominant.

---

### UI-8 — Hint button is not unmissable 🟡 Medium

**File:** `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts`  
**Problem:** If the hint button is small or ambiguous, a stuck child won't find it. T7 auto-hint fires on the 3rd wrong answer — but the button should be findable before that.  
**Fix:** Ensure the hint button is at least 100×60 px, amber fill, with "💡 Help!" label in 20 px TITLE_FONT. Position it bottom-left (opposite the mascot). After 2 wrong answers on the same question, add a pulse tween (scale 1.0 → 1.1 → 1.0, 800 ms yoyo) to draw the eye before the auto-trigger on the 3rd.

**Done when:** A first-time user can locate the hint button without being told where it is.

---

### UI-9 — Loading screen is dead air 🟡 Medium

**File:** `src/scenes/PreloadScene.ts`  
**Problem:** PreloadScene shows "Loading" in small muted text on a gradient background. A child watching this has no feedback that anything is happening.  
**Fix:**
- Add a bouncing Quest: scale tween ±0.05, 500 ms yoyo, loops until load complete.
- Animated loading dots: cycle "Loading .", "Loading ..", "Loading ..." at 400 ms intervals.

**Done when:** The loading screen shows Quest moving and text animating — no dead air.

---

### UI-10 — No drag sound during interaction 🟡 Medium

**File:** `src/audio/SFXService.ts`, `src/scenes/Level01Scene.ts`, `src/scenes/interactions/PartitionInteraction.ts`  
**Problem:** There's a snap SFX on correct partition (T13) and playback on Check, but nothing during the drag itself. No tactile audio feedback as the child moves the handle.  
**Fix:** Add `playScrub()` to `SFXService`: a quiet slide tone (sine wave, 200–400 Hz glide, gain 0.06, 80 ms). Fire on `pointermove` while dragging, throttled to once per 50 ms. Pitch can rise as the handle approaches center (optional enhancement: map handle delta from 0→50% to 200→400 Hz).

**Done when:** Moving the drag handle produces a continuous, subtle sliding sound.

---

### UI-11 — Adventure map may be too complex for K-2 🟢 Low / Nice-to-have

**File:** `src/scenes/LevelMapScene.ts`  
**Problem:** A winding path with 9 level cards is cognitively demanding for a 5-year-old navigating after a session. The map is great for older kids; for K-2 it may cause navigation anxiety.  
**Possible simplification (discuss with user before acting):** Show only the current level prominently (big card, center), previous levels as small receding cards behind, next levels as locked ahead. Or reduce to a "Next Level / Replay / Menu" 3-button layout that appears post-session.  
**Status:** Flag for user decision — do not implement without explicit approval.

---

### UI-12 — Fraction labels should animate in on snap 🟢 Low / Nice-to-have

**File:** `src/scenes/interactions/PartitionInteraction.ts`, `src/scenes/Level01Scene.ts`  
**Problem:** When the snap labels appear (T13 + UI-7 fix), they currently appear instantly. A pop-in makes the "aha!" moment feel earned.  
**Fix:** Scale-bounce the label from 0 → 1.3 → 1.0 over 200 ms with `Back.easeOut`. Fire 200 ms after the color fill starts (stagger so fill lands first, then labels appear).  
**Dependency:** Implement after UI-7 (the word+symbol label).

---

## P6 — Harden: Critical & High Risk Items

**Status:** Pending.  
**Source:** `PLANS/_archive/harden-and-polish-2026-04-30.md` (full file:line specs for all items)

Ordered by severity. Pick up after P1–P4; can parallelize with P5 Group D.

| ID | Severity | Item | File:Line |
|---|---|---|---|
| R6 | CRITICAL | Session creation silent collapse → 30 min of data lost | `Level01Scene.ts:314–379` |
| R1 | CRITICAL | `seedIfEmpty()` no concurrency guard | `seed.ts:54` |
| R5 | CRITICAL | `validatorRegistry.get(... as never)` swallows undefined | `Level01Scene.ts:752` |
| R10 | CRITICAL | iOS Safari TTS: missing `onvoiceschanged` listener | `TTSService.ts:23–38` |
| R11 | CRITICAL | FeedbackOverlay text/bg fails WCAG 1.4.3 (correct=2.52:1) | `FeedbackOverlay.ts:35–42` |
| R13 | CRITICAL | localStorage C5 violation: `unlockedLevels:${studentId}` | `MenuScene.ts:348–384` |
| R27 | HIGH | localStorage `LOG` key violates C5 allowlist | `log.ts:40, 113, 118, 122` |
| R16 | HIGH | `deviceMeta.updatePreferences()` read-modify-write race | `deviceMeta.ts:64–81` |
| R30 | HIGH | `settings-btn` testid missing → blocks 6 E2E tests | `MenuScene.ts:214–231` |
| R21 | HIGH | PreferenceToggle has no `:focus` outline (a11y) | `PreferenceToggle.ts:102–120` |
| R36 | MEDIUM | Ambient menu animations ignore `prefers-reduced-motion` | `MenuScene.ts:93, 300–301` |

Full list (48 items) in `PLANS/_archive/harden-and-polish-2026-04-30.md`.

---

## P7 — Production & Deploy

**Status:** Pending.  
**Effort:** ~8 h total

| Task | Command / File | Status |
|---|---|---|
| iPad Safari touch-drag test | Manual — primary K-2 device, never tested | [ ] |
| Playwright L1 happy-path E2E | `tests/e2e/level01.spec.ts` (TestHooks already in place) | [ ] |
| Deploy to Cloudflare Pages | `npm run build && npx wrangler pages deploy dist` | [ ] |
| `npm run agent-doctor` step in CI | `.github/workflows/ci.yml` — add after Install step | [ ] |
| Lighthouse workflow Node → 24 | `.github/workflows/lighthouse.yml` | [ ] |

---

## P8 — Open Decisions (require user input before acting)

| ID | Decision | Blocks |
|---|---|---|
| D-1 | Level unlock model: BKT mastery threshold vs session completion vs always-unlocked | P3 mastery-gate wiring |
| D-audio | Audio pre-rendering (OpenAI `gpt-4o-mini-tts`) pipeline: start now or after MVP? | Audio in P5 group A/D |
| D-agent-tooling | Agent tooling phases 1–8 (auto-invoke layer, blast-radius preflight, 2 new subagents, PR template enforcement): approve which phases? | None — infra only |

---

## Deferred (do not pick up without explicit user authorization)

| Item | Risk | Reason |
|---|---|---|
| Sunset `Level01Scene.ts` (D-25 Path A) | HIGH | 1727 LOC, 15 file deps, K-2-tuned UX details. Requires side-by-side parity test + 2-week soak before deletion. See `PLANS/_archive/AGENT_HANDOFF-2026-05-01.md` for safe execution path. |
| `SessionService` pivot | HIGH | 30 h of focused work. Position it after Sunset proves impractical. Requires explicit user authorization. |
| E2E parameterization L1–L9 | MEDIUM | Requires `data-testid` sentinels on `LevelScene` for L2–L9 that don't exist yet. Start with `LevelScene` sentinels when P7 E2E work begins. |
| Tighten coverage gate 45%→75% | MEDIUM | Real coverage is ~77% when integration suite runs. Low ROI until the coverage pipeline is unified. |
| TS→Python validator parity (A2) | MEDIUM | Valid long-term but not blocking the MVP. Evaluate after deploy. |
| `sessionAccuracy` dual implementation | LOW | `Level01Scene` uses `correctCount / totalQuestionsAttempted`; `LevelScene` uses `correctCount / responseTimes.length`. Currently equivalent, but will diverge silently if the sunset (D-25) merge is done carelessly. Fix during or immediately after sunset. |

---

## How to use this plan

1. **Start every session:** Read Section P1. If the MVP exit criterion isn't verified, verify it before writing any code.
2. **Picking a task:** Work top-to-bottom. P5 groups can run in parallel with each other once P1–P3 are green.
3. **End of session:** Check off completed items. Add discovered issues directly here (no new plan files).
4. **Decision needed:** Bring the relevant D-* row to the user. Do not silently choose.
5. **New plan files:** Do not create them. Append findings here instead.

---

*All prior planning documents are in `PLANS/_archive/`. The archive is reference-only — do not treat archive content as active work unless this plan explicitly references it.*
