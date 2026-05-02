# Questerix Fractions — Active Plan

**Created:** 2026-05-01  
**Status:** ACTIVE  
**MVP exit criterion:** A real student completes a 5-question L1 session in a real browser tab, confirmed via DevTools → IndexedDB.

> All previous planning files are archived in `PLANS/_archive/`. This is the single source of truth for remaining work.

---

## Phase sequence

Work phases in order. Do not start a later phase unless the gate for the earlier phase is satisfied or the phase is explicitly unblocked. Items within a phase can run in parallel unless marked otherwise.

| Phase | Name | Gate to advance |
|---|---|---|
| **0** | Validate | MVP exits criterion passes end-to-end |
| **1** | Fix critical bugs | All 🔴 bugs verified closed |
| **2** | Core features | D-1, UI-11, menu badges, gold ribbon shipped |
| **3** | UX pre-playtest | All P5 groups (A–H) + structural layout pass checked off |
| **4** | Harden | CRITICAL + HIGH risk items in P6 resolved |
| **5** | Production | Deploy, E2E, iPad Safari tested |

---

## Phase 0 — Validate (do this first, before any code)

**Status:** ✅ DONE — verified 2026-05-01.  
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
**Gate:** all checklist items green → advance to Phase 1.

---

## Phase 1 — Fix Critical Bugs ✅ DONE

All three bugs fixed and verified 2026-05-01. Fix in order; B1 and B2 block first-impression UX, B3 is secondary.

### B1 — Skip button blocked during Step 1 (T9 depth regression) ✅
## Phase 1 — Fix Critical Bugs

Fix in order; B1 and B2 block first-impression UX, B3 is secondary.

### B1 — Skip button blocked during Step 1 (T9 depth regression)

**Severity:** 🔴 Critical — existing feature regressed  
**File:** `src/scenes/OnboardingScene.ts`  
**Symptom:** The full-screen invisible tap-to-advance rectangle added for T9-fix2 sits at depth 29. The "Skip tutorial" button is at depth 5. In Phaser 4, the higher-depth object wins all pointer events. A child tapping "Skip tutorial" during the watch step is silently sent to the try step (step 2) instead of skipping the tutorial entirely.  
**Fix (pick one):**
- Option A (preferred): raise the skip button's depth above the hit rect — `skipBtn.setDepth(35)`.
- Option B: shrink the hit rect to exclude the bottom row (polygon or smaller rect that stops above the skip button's y).

**Done when:** Tapping "Skip tutorial" during Step 1 exits the tutorial immediately.

---

### B2 — Misleading copy: "Let's try an easier one →" on Level 1 ✅
### B2 — Misleading copy: "Let's try an easier one →" on Level 1

**Severity:** 🔴 High — promise the child can't redeem  
**File:** `src/scenes/Level01Scene.ts` or `src/components/SessionCompleteOverlay.ts`  
**Symptom:** When a child scores below 40% on Level 1, the scaffold banner reads "Let's try an easier one →". Tapping it navigates to the main menu because there is no L0. A struggling 5-year-old sees a promise of an easier level, taps it, and lands on the menu instead.  
**Fix (pick one):**
- Option A (simpler): cap `scaffoldRecommendation` at `'stay'` when `levelNumber === 1`. The regress branch never fires for L1.
- Option B: keep the regress recommendation but change the copy to `"Try again →"` when `levelNumber === 1`.

**Done when:** A struggling L1 child never sees "easier one" copy that routes to the menu.

---

### B3 — FPS drops in OnboardingScene (3–6 FPS sustained) ✅
### B3 — FPS drops in OnboardingScene (3–6 FPS sustained)

**Severity:** 🟡 Medium — bad on constrained devices  
**File:** `src/scenes/OnboardingScene.ts` → `updatePartitionLine()` (or equivalent)  
**Symptom:** Browser logs show OnboardingScene running at 3–6 FPS during the Step 1 animation. `updatePartitionLine()` calls `g.clear()` + a `while` loop drawing ~15 individual dashed-line segments on every frame.  
**Fix:** Replace per-frame dashed line loop with:
- A single solid line (one `lineBetween` call), or
- A static `RenderTexture` captured once, reused each frame.

**Verify on a real device** before declaring fixed — tab-throttling in Replit can fake this symptom.

**Done when:** OnboardingScene sustains ≥ 30 FPS on a mid-range Android tablet.

---

### P3b — Verify level grid routing

**File:** `src/scenes/MenuScene.ts` (`_openLevelChooser`, `_renderLevelGrid`)  
**Test:** Open `localhost:5000`, tap "Choose Level", tap Level 3 → verify a level-3 question loads.  
**Done when:** All 9 tiles route to the correct `LevelScene { levelNumber: n }` without crashing.

---

## Phase 2 — Core Features ✅ DONE

All four workstreams (2a, 2b, 2c, 2d) shipped 2026-05-01 via 4-agent parallel swarm. Combined: 12 files modified, 3 new files (`unlockGate.ts`, `PostSessionOverlay.ts`, `levelCardMasteryStar.ts`), +430/−219 LOC. Typecheck/lint/655 unit tests green.

---

### 2a — Level unlock model (D-1) ✅

**Effort:** 2–3 h  
**Files:**
- `src/persistence/repositories/levelProgression.ts` — add `consecutiveFailedSessions: number` field per level
- `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts` — gate `markComplete` on `correctCount >= 3 || consecutiveFailedSessions >= 3`; show "Let's practice a little more!" screen otherwise
- `src/scenes/SettingsScene.ts` — hidden version-tap toggle setting `unlockGateBypass`

**Spec:**
- Unlock condition: `correctCount >= 3` (60 % raw score)
- Never-stuck: after 3 consecutive sessions without reaching 3/5, unlock anyway — silently
- Researcher toggle: tap version number 3× in SettingsScene to bypass all unlock gates

**Done when:** A child scoring 2/5 replays the same level; 3/5 advances; after 3 failed sessions the gate opens silently.

---

### 2b — Post-session routing overlay (UI-11) ✅

**Effort:** 3–5 h  
**Files:** `src/components/PostSessionOverlay.ts` (new), `src/scenes/LevelMapScene.ts`, `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts`

**Spec:** When returning to `LevelMapScene` after a session, intercept with a 3-button overlay instead of landing cold on the map:

```
╔══════════════════════════╗
│  ✨ Great job! ✨        │
│  [ → Next Level ]        │  amber, 110 px
│  [ ↺ Play Again  ]       │  blue, 90 px
│  [   🏠 Menu     ]       │  muted pill
╚══════════════════════════╝
```

Trigger: pass `{ postSession: true }` to `LevelMapScene.init()` from session-complete flow. Overlay appears on top of the map (which can load behind it). Tapping any button dismisses the overlay then routes.

**Done when:** Completing a session never lands cold on the map; always shows the 3-button overlay first.

---

### 2c — Menu station badges (D-menu-fraction-badges) ✅

**Effort:** 1–2 h  
**File:** `src/scenes/MenuScene.ts`

Strip the "0 / ½ / 1" fraction badges. Replace each station with icon + one-word Fredoka One label:

| Station | Icon | Label |
|---|---|---|
| Continue | 📍 | "Continue" |
| Settings | ⚙ | "Settings" |
| Play | 🎮 (or ▶) | "Play" |

Label sizing: ~24–28 px Fredoka One, ~48 px icon. Keep the wavy number-line path — it gives visual structure but must not be load-bearing for navigation comprehension.

**Done when:** Menu stations show icons + word labels with no fraction notation.

---

### 2d — Gold mastery ribbon on level cards (P4) ✅

**Effort:** 1–2 h  
**Files:** `src/scenes/MenuScene.ts`, `src/persistence/repositories/skillMastery.ts`

On `MenuScene.create()`, read mastery records via `skillMasteryRepo.getByStudentId(studentId)`. For each level card where `masteryEstimate >= 0.8`, render a 24 px gold star/ribbon badge in the top-right corner. Color: `0xFFD700`. No text on the badge. Locked level cards unchanged.

**Done when:** A level with mastered BKT state shows a gold badge on the map.

---

## Phase 3 — UX Pre-Playtest ✅ COMPLETE (2026-05-01)

All 10 groups (S, A, B, C, D, E, F, G, H + UI items) shipped via 2-round swarm + sequential orchestration. 20+ commits, 656/656 tests, 0 merge conflicts.

- **Round 1 — Structural (S):** hint button repositioned to y≈720 (100×60 amber pill), check button to y≈820, action arc compressed from 540 px gap to ~100 px.
- **Round 2a — Parallel (4 agents, zero file overlap):** Group A (FeedbackOverlay sound + animations), Group D-TTS (decouple TTS from reduce-motion), Group H (onboarding hand pointer + tap-to-advance), Group G (streak pill in MenuScene + LevelMapScene).
- **Round 2b — Verify:** Group B (Mascot oops expression) — confirmed pre-implemented, no work needed.
- **Round 2c — Sequential (god-file heavy):** Group C (partition navy line + ghost midpoint + snap juice), Group D-rest (back-button 2-tap, auto-hint, text sizing), Group E (session-complete CTA banner + perfect-5/5 fanfare), Group F (Quest idle-boredom escalation + 10 speech bubbles).

**Known blocker:** FeedbackOverlay T1 visual specs (panel 260px, radius 32px, icon 72px) deferred — file is at 365/300 LOC budget. Sparkle-burst texture-guard test is `it.skip` pending refactor.

Full task specs archived in `PLANS/_archive/feedback-and-ux-2026-05-01.md`.

### S — Structural layout pass (highest leverage)

**Files:** `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts`  
**Problem:** Three-island layout — shape at y≈400, Check button at y≈940 (540 px gap), Quest+Hint colliding in the top zone. A child must re-grip the tablet between drag and Check.  
**Target layout:** Compress the action arc to y=200–820:
- Shape centered ~y=450, scaled to 520 px
- Hint button: 100×60 px amber pill at y≈720 (directly above Check)
- Check button: full-width at y≈820
- Quest: left of shape, not above it

Do S as one coordinated layout pass, not piecemeal. Addressing S correctly subsumes UI-1 (drag affordance positioning), UI-S2 (hint button size), and UI-S3 (Quest/Hint collision).

**Status:** [ ]

---

### Group A — FeedbackOverlay

| Task | Description | Files | Done |
|---|---|---|---|
| T1 | Redesign: bottom-sheet, solid colors, 1400/1600 ms timing, real shake | `FeedbackOverlay.ts`, `SFXService.ts` | [ ] |
| T5 | Wrong-answer sound | `SFXService.ts` | [ ] |

### Group B — Quest expressions

| Task | Description | Files | Done |
|---|---|---|---|
| T2 | `oops` expression: droop + wince eyes + sweat drop on wrong | `Mascot.ts`, `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| T9-fix3 | `oops` expression in onboarding wrong-answer moment | `OnboardingScene.ts` | [ ] |

### Group C — Partition interaction

| Task | Description | Files | Done |
|---|---|---|---|
| T3 | Solid navy partition line, sky-tint shape background | `Level01Scene.ts`, `PartitionInteraction.ts` | [ ] |
| T8 | Ghost midpoint after 1st wrong answer | `Level01Scene.ts`, `PartitionInteraction.ts` | [ ] |
| T13 | Snap juice: tint fills + fraction labels + snap sound | `PartitionInteraction.ts`, `SFXService.ts` | [ ] |

### Group D — Small isolates

| Task | Description | Files | Done |
|---|---|---|---|
| T4 | Decouple TTS from Reduce Motion → `ttsEnabled` pref | `deviceMeta.ts`, `SettingsScene.ts` | [ ] |
| T6 | "Back to Menu" 2-tap protection | `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| T7 | Auto-hint on 3rd wrong answer | `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| T10 | Prompt 22→28 px, counter 17→22 px | `Level01Scene.ts`, `LevelScene.ts` | [ ] |

### Group E — Session complete

| Task | Description | Files | Done |
|---|---|---|---|
| T11 | Advance/stay/regress call-to-action banner | `SessionCompleteOverlay.ts`, `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| T15 | Perfect 5/5 gold overlay + doubled confetti | `SessionCompleteOverlay.ts`, `SFXService.ts` | [ ] |

### Group F — Quest personality

| Task | Description | Files | Done |
|---|---|---|---|
| T14 | Idle/boredom 3-stage escalation at 10/18/28 s | `Mascot.ts`, `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| T16 | Speech bubbles at 10 key moments | `Mascot.ts`, `Level01Scene.ts`, `LevelScene.ts` | [ ] |

### Group G — Streaks

| Task | Description | Files | Done |
|---|---|---|---|
| T12 | "3 in a Row! 🔥" mid-session banner | `Level01Scene.ts`, `LevelScene.ts` | [ ] |
| T17 | Daily streak pill in Menu + LevelMap | `MenuScene.ts`, `LevelMapScene.ts` | [ ] |

### Group H — Onboarding

| Task | Description | Files | Done |
|---|---|---|---|
| T9-fix1 | Hand pointer at SHAPE_CY, not below shape | `OnboardingScene.ts` | [ ] |
| T9-fix2 | Tap-to-advance Step 1 | `OnboardingScene.ts` | [ ] |

### Additional UI items (from ui-audit.md)

| ID | Priority | Item | Files |
|---|---|---|---|
| UI-1 | 🔴 | Drag handle zero affordance (no gripper, no pulse) | `PartitionInteraction.ts` |
| UI-2 | 🔴 | Shape too small for a child's hand (340→520 px) | `PartitionInteraction.ts` |
| UI-S1 | 🔴 | Partition line color washed out (PATH_BLUE underlay) | `Level01Scene.ts` |
| UI-S4 | 🟠 | Back button: icon only (`🏠` 36 px, no word) | `Level01Scene.ts`, `LevelScene.ts` |
| UI-3 | 🟠 | Snap fill saturation too low | `PartitionInteraction.ts` |
| UI-M1 | 🟠 | Play! button positioned too low on MenuScene | `MenuScene.ts` |
| UI-M2 | 🟠 | Quest not prominent enough as hero on menu | `MenuScene.ts` |
| UI-7 | 🟡 | Fraction labels: word-first ("half" 48 px, "1/2" 24 px secondary) | `FractionDisplay.ts` |
| UI-12 | 🟡 | Scene animate-in (shape + prompt slide from top) | `Level01Scene.ts`, `LevelScene.ts` |
| UI-10 | 🟡 | Drag scrub sound (Web Audio tone sweep) | `SFXService.ts` |

Full specs: `PLANS/ui-audit.md`.

---

## Phase 4 — Harden

**Status:** R-task hardening shipped via PR #56 (R1–R8, R11–R12, R14, R16–R21, R24, R30). **Sub-phase 4.1 (Level01Scene refactor) ✅ DONE** — 2026-05-02 via PR #57 (commit 9bb3197). Extracted 807 LOC into four focused modules; Level01Scene reduced 2040→1650 LOC (-390 LOC, -19.1%). **Sub-phase 4.2 (LevelScene refactor) ✅ DONE** — 2026-05-02 via PR #59. Extracted Session cluster fully; Layout cluster created but not wired (specialized); Feedback cluster partially wired. LevelScene reduced 1558→1318 LOC (-240 LOC, -15.4%). **Sub-phase 4.3 (LevelScene flow wiring) ✅ DONE** — 2026-05-02 via PR #60 (commit 254d38e). Wired loadQuestion/onSubmit/showHintForTier/pulseHintButton as thin delegators to `src/lib/levelScene{Question,Outcome,Hint,Session}*.ts`. LevelScene at 1215 LOC. **Sub-phase 4.4 (Outcome flow wiring) ✅ DONE** — 2026-05-02. Wired `levelSceneOutcomeFlow.ts` into LevelScene as a thin delegator; deleted duplicate inline `showOutcome`/`onCorrectAnswer`/`onWrongAnswer`/`showStreakBanner` (~127 LOC). Extended lib's `OutcomeFlowContext` with `hintLadder` and `OutcomeFlowCallbacks` with `showHintForTier` to preserve the tier-based hint trigger that was missing from the lib. LevelScene reduced 1215→1096 LOC (-119 LOC, -9.8%). **Total Phase 4 so far: -852 LOC. Target <800 LOC (need ~296 more from 4.5+).** **R-task closeout:** R10 (iOS TTS) already shipped; this branch added a 1500ms `voicesReady` watchdog so `speak()` cannot deadlock on empty-voice browsers. R13 (unlockedLevels) already migrated to Dexie `levelProgressionRepo`. R27 (LOG key) already on `sessionStorage` (allowed under C5). R36 (ambient motion) — `MenuScene` + `LevelMapScene` `fadeIn` and dash tick are gated on `checkReduceMotion()`; Mascot tweens self-gate. Sub-phases 4.5–4.8 queued (chrome creation, session-complete, fallback templates, offline toast).
**Source:** `PLANS/_archive/harden-and-polish-2026-04-30.md` (full file:line specs)

| ID | Severity | Item | File:Line | Status |
|---|---|---|---|---|
| R6 | CRITICAL | Session creation silent collapse → 30 min of data lost | `Level01Scene.ts:314–379` | ✅ PR #56 |
| R1 | CRITICAL | `seedIfEmpty()` no concurrency guard | `seed.ts:54` | ✅ PR #56 |
| R5 | CRITICAL | `validatorRegistry.get(... as never)` swallows undefined | `Level01Scene.ts:752` | ✅ PR #56 |
| R10 | CRITICAL | iOS Safari TTS: missing `onvoiceschanged` listener | `TTSService.ts:21–46` | ✅ shipped + watchdog 2026-05-02 |
| R11 | CRITICAL | FeedbackOverlay text/bg fails WCAG 1.4.3 (correct=2.52:1) | `FeedbackOverlay.ts:35–42` | ✅ PR #56 |
| R13 | CRITICAL | localStorage C5 violation: `unlockedLevels:${studentId}` | `MenuScene.ts:348–384` | ✅ migrated to `levelProgressionRepo` |
| R27 | HIGH | localStorage `LOG` key violates C5 allowlist | `log.ts:40, 113, 118, 122` | ✅ now `sessionStorage` (allowed) |
| R16 | HIGH | `deviceMeta.updatePreferences()` read-modify-write race | `deviceMeta.ts:64–81` | ✅ PR #56 |
| R30 | HIGH | `settings-btn` testid missing → blocks 6 E2E tests | `MenuScene.ts:214–231` | ✅ PR #56 |
| R21 | HIGH | PreferenceToggle has no `:focus` outline (a11y) | `PreferenceToggle.ts:102–120` | ✅ PR #56 |
| R36 | MEDIUM | Ambient menu animations ignore `prefers-reduced-motion` | `MenuScene.ts:128, 745` + `LevelMapScene.ts:111` | ✅ all gated on `checkReduceMotion()` |

Full list (48 items) in `PLANS/_archive/harden-and-polish-2026-04-30.md`.

---

## Phase 5 — Production

**Status:** Pending. Requires Phase 0 exit criterion verified + Phase 4 CRITICAL items resolved.  
**Effort:** ~8 h total

| Task | Command / File | Done |
|---|---|---|
| iPad Safari touch-drag test | Manual — primary K-2 device, never tested | [ ] |
| Playwright L1 happy-path E2E | `tests/e2e/level01.spec.ts` | [ ] |
| Deploy to Cloudflare Pages | `npm run build && npx wrangler pages deploy dist` | [ ] |
| `npm run agent-doctor` step in CI | `.github/workflows/ci.yml` — add after Install step | [ ] |
| Lighthouse workflow Node → 24 | `.github/workflows/lighthouse.yml` | [ ] |

**Agent tooling (D-agent-tooling approved phases):**
- Phase 2 — Blast-radius preflight (~3 h): doc-only PRs skip to 5 s lint-only path
- Phase 7 — PR template + branch enforcement (~1 h)
- Phase 8 — Token telemetry via `CLAUDE_CODE_DIAGNOSTICS_FILE` (~4 h)

---

## Deferred (do not pick up without explicit user authorization)

| Item | Risk | Reason |
|---|---|---|
| Sunset `Level01Scene.ts` (D-25 Path A) | HIGH | 1727 LOC, 15 file deps. Requires side-by-side parity test + 2-week soak. See `PLANS/_archive/AGENT_HANDOFF-2026-05-01.md`. |
| `SessionService` pivot | HIGH | 30 h of focused work. Only after Sunset proves impractical. |
| E2E parameterization L1–L9 | MEDIUM | Needs `data-testid` sentinels on `LevelScene` for L2–L9 that don't exist yet. |
| Tighten coverage gate 45%→75% | MEDIUM | Real coverage ~77% when integration suite runs. Low ROI until pipeline unified. |
| TS→Python validator parity (A2) | MEDIUM | Not blocking MVP. Evaluate after deploy. |
| `sessionAccuracy` dual implementation | LOW | `Level01Scene` uses `correctCount / totalQuestionsAttempted`; `LevelScene` uses `correctCount / responseTimes.length`. Fix during or after sunset. |
| Audio pipeline (OpenAI pre-render) | LOW | Deferred post-MVP. Ship with Web Speech TTS as placeholder. |

---

## How to use this plan

1. **Start every session:** Check Phase 0. If the MVP exit criterion isn't verified, verify it before writing any code.
2. **Pick a task:** Work phases in order. Items within a phase can run in parallel unless noted.
3. **End of session:** Check off completed items. Add discovered issues directly here — no new plan files.
4. **Decision needed:** Bring it to the user. Do not silently choose.
5. **New plan files:** Do not create them. Append findings here instead.

---

*All prior planning documents are in `PLANS/_archive/`. The archive is reference-only — do not treat archive content as active work unless this plan explicitly references it.*
