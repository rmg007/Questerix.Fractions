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

## UI / UX

**Detailed audit:** `PLANS/ui-audit.md` — full screen-by-screen audit (29 items across Gameplay, Menu, Preload, FeedbackOverlay, SessionComplete, LevelMap), priority-ordered with file:line and concrete specs.

### Pre-playtest blockers (🔴 Critical)

| ID | Item | Where |
|---|---|---|
| **S** | Collapse three-island layout (Check button 540 px below shape; Quest+Hint collide; Menu text unreadable) | `Level01Scene.ts`, `LevelScene.ts` |
| UI-1 | Drag handle has zero affordance (no gripper, no chevrons, no pulse) | `Level01Scene.ts`, `PartitionInteraction.ts` |
| UI-2 | Shape too small for a child's hand (340→520 px) | `Level01Scene.ts`, `PartitionInteraction.ts` |
| UI-S1 | Partition line color washed out (PATH_BLUE underlay) | `Level01Scene.ts` `updatePartitionLine()` |
| UI-S2 | Hint button too small (72 px diameter) | `Level01Scene.ts`, `LevelScene.ts` |

The structural fix **S** is the single highest-leverage change — addressing it correctly subsumes UI-1 affordance positioning, UI-S2 hint placement, and UI-S3 collision. Do **S** as one coordinated layout pass, not piecemeal.

### High-priority polish (🟠 — next sprint)

UI-3 (snap fill saturation), UI-S3 (Quest/Hint collision), UI-S4 (back-button icon), UI-M1 (Play! button position), UI-M2 (Quest as hero on menu). Full specs in `PLANS/ui-audit.md`.

### Resolved decisions (already specced in ui-audit.md)

- **UI-11** ✅ — Adventure map post-session routing overlay (Option B). Keep map as-is; intercept post-session return with a 3-button overlay (Next Level / Play Again / Menu). ~3–5 h. Spec at `ui-audit.md` § UI-11.
- **D-1** ✅ — Level unlock: see P8 below.

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

## P8 — Open Decisions

### Resolved

#### D-1 ✅ — Level unlock model: 3/5 raw threshold + never-stuck + researcher toggle (2026-05-01)

**Decision:** None of the original options (A: completion, B: BKT mastery, C: always unlocked) were correct. Resolved as a **modified A**:

- **Unlock condition:** `correctCount >= 3` in the completed session (60 % raw score). Read from existing `correctCount` field on `Level01Scene` / `LevelScene`.
- **If `correctCount < 3`:** do **not** call `levelProgressionRepo.markComplete()`. Show a "Let's practice a little more!" screen (Quest encouraging, **not** a failure message), child replays the same level.
- **Never-stuck guarantee:** after **3 consecutive sessions** on the same level without reaching 3/5, unlock the next level anyway — silently, no announcement. Track a `consecutiveFailedSessions` counter per level on the progression repo.
- **Researcher toggle:** hidden flag in `SettingsScene` (e.g. tap version number 3 times) that bypasses all unlock gates. Researchers get Option C on demand without changing the core game.

**Why not pure B (BKT gate):** simulation showed a child with `CCCWW` (got it the first 3 tries, tired toward the end) ends at mastery 0.315 — blocked despite clearly understanding. BKT priors here are uncalibrated; using them as a gate punishes effort and breaks validation studies (struggling kids never see L2–L9).

**Why not pure A:** raw "any session completes → advance" lets a child who got 1/5 advance with no engagement signal at all.

**Why this works:** keeps BKT for adaptive difficulty *within* levels (where it belongs); screens out zero-engagement (random submitters won't hit 3/5); never punishes effort (3-strike escape); preserves study capability via toggle.

**Effort:** 2–3 h. Code change: check `this.correctCount >= 3` before `levelProgressionRepo.markComplete()` at session end; track `consecutiveFailedSessions` per level on the progression repo; add settings toggle reading the flag.

**Files to touch:**
- `src/persistence/repositories/levelProgression.ts` — add `consecutiveFailedSessions: number` field per level.
- `src/scenes/Level01Scene.ts`, `src/scenes/LevelScene.ts` — gate `markComplete` on `correctCount >= 3 || consecutiveFailedSessions >= 3`; show "Let's practice a little more!" screen otherwise.
- `src/scenes/SettingsScene.ts` — hidden version-tap toggle setting `unlockGateBypass`.

#### D-audio ✅ — Defer audio pipeline to post-MVP (2026-05-01)

**Decision:** Don't build the OpenAI `gpt-4o-mini-tts` pre-render pipeline now. Ship MVP with the existing Web Speech runtime TTS as the placeholder.

Audio architecture (provider, build-time pre-rendering, instruction-style voice control) remains the chosen direction — it just doesn't ship in this release. The pipeline becomes v1.1 work after the first real-child playtest validates that audio matters at all.

**Implication:** Don't include audio polish items inside P5. T4 (decouple TTS from Reduce Motion), T5 (wrong-answer SFX synthesis), UI-10 (drag scrub sound) are all still in scope — they use the existing SFX synthesis path (Web Audio API), not the pre-rendered Quest-voice catalog.

#### D-agent-tooling ✅ — Approve Phase 2, 7, 8 (2026-05-01)

**Decision:** Of the agent-tooling phases pending in `PLANS/_archive/agent-tooling-2026-05-01.md`, approve only the high-ROI remainder:

- **Phase 2 — Blast-radius preflight.** Branch-prefix routes to gate level. Doc-only PRs (`docs/`, `chore/` for `PLANS/`-only changes) skip the 90 s typecheck+lint+test+build pipeline and run a 5 s lint-only fast-path instead. Keeps full pipeline for `feat/`, `fix/`, `refactor/`.
- **Phase 7 — PR template + branch enforcement.** Codify the structure recent PRs already follow into `.github/pull_request_template.md` + a CI check that fails PRs without a populated Test Plan section. Stop relying on convention.
- **Phase 8 — Token telemetry.** Measure session token cost via `CLAUDE_CODE_DIAGNOSTICS_FILE` parsing into `_session-log.md`; the `/economy` and `/retro-weekly` commands then have real data to summarize.

**Skip:** Phase 1 (auto-invoke skills already in CLAUDE.md), Phase 3 (already shipped — both subagents present), Phase 4 (not blocking), Phase 5 (root cause already fixed in PR #36), Phase 6 (already shipped — learnings discipline at SessionStart).

**Effort:** Phase 2 ~3 h · Phase 7 ~1 h · Phase 8 ~4 h. Total ~8 h.

#### D-menu-fraction-badges ✅ — Icons + word labels (2026-05-01)

**Decision:** UI-M4 — Option A (icons), with a label addition. Strip the "0 / ½ / 1" fraction badges from the menu stations entirely. Replace each station with an icon **plus a one-word label** in Fredoka One:

| Station | Icon | Label |
|---|---|---|
| Continue | 📍 | "Continue" |
| Settings | ⚙ | "Settings" |
| Play | 🎮 (or ▶) | "Play" |

**Why:** The number-line metaphor (0 → ½ → 1) is genuinely clever — for adults. A 5-year-old doesn't arrive with a mental model of fraction-progression-as-axis; they'd need to be taught that metaphor before the menu is legible. Asking the UI to pre-teach a notation system before the game starts is a code smell. A first-visit explainer overlay (Option B) just makes the problem worse — it's a mandatory tutorial for navigation.

Icons are universally understood at age 5. The single-word label handles early readers and parents looking over a shoulder. No tutorial, no metaphor to decode.

**Keep:** the wavy number-line path itself stays. It gives the menu visual structure and a sense of journey. The pedagogy of fraction notation belongs *inside* the levels, not on the menu.

**Files to touch:**
- `src/scenes/MenuScene.ts` — remove the fraction-badge render path; add icon + label render at each station. Match Fredoka One sizing to the rest of the scene (~24–28 px label, ~48 px icon).

**Effort:** 1–2 h.

### Open

*No open decisions — all resolved 2026-05-01.*

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
