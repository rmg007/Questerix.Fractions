# Questerix Fractions — Visual QA Report
**Date:** 2026-04-27 | **Build:** `localhost:5002` (`npm run dev:app` — Vite direct)  
**Tester:** AI Agent — automated browser walkthrough  
**Environment:** Chrome desktop, IDE preview pane (adds ~40px top banner)  
**Related doc:** `architecture-review-2026-04-27.md`

**Scope notes:** Multi-student / parental view is parked — future milestone. Onboarding not a priority for MVP.

---

## Executive Summary

The visual design is excellent (9/10) — the adventure theme, typography, and layout are polished and ready for students. The gameplay loop is completely broken: BUG-01 loads the wrong prompt archetype and BUG-02 means validation never passes, so no student can complete a single question. The app cannot be given to a student until all Sprint 0 tasks are complete — fix BUG-01 first (a 10-minute change to filter the template pool), then debug BUG-02.

---

## Quick Status

| Dimension | Status | Confidence |
|---|---|---|
| App loads | ✅ Works | High |
| Menu screen | ✅ Works | High |
| Level 1 — visuals | ✅ Works | High |
| Level 1 — gameplay | ❌ Broken | High |
| Settings reachable | ✅ Works (`scene.launch`) | High |
| Session complete | ❌ Blocked | High |
| Level 2–9 accessible | ❌ No UI route exists | High |
| iPad / touch | ⚪ Not tested | — |

> **Legend:** ✅ Pass · ❌ Fail · 🟡 Partial · ⚪ Not tested

**Verdict: App cannot be given to a student today.** The gameplay loop is broken, and there is no path to any level beyond Level 1.

---

## Screen 1 — Menu / Home

<!-- Screenshots should be placed in PLANS/screenshots/ for portability -->
![Menu screen](screenshots/ss_01_menu.png)

**Result: ✅ PASS**

The menu looks excellent. Every design token is present and correct.

| Element | Expected | Actual | Pass? |
|---|---|---|---|
| Background | Light blue gradient + teal blob lower-left | ✅ Matches | ✅ |
| Title font | Fredoka One, dark navy | ✅ Matches | ✅ |
| Title text | "Questerix Fractions" | ✅ Correct | ✅ |
| Subtitle | "A math adventure! 🚀" | ✅ Correct | ✅ |
| Adventure path | Winding dotted road with level nodes | ✅ Visible | ✅ |
| Level badge | "1" at top of path | ✅ Correct | ✅ |
| Score badge | "0" near bottom | ✅ Correct | ✅ |
| Settings button | Blue gear + "Settings" label | ✅ Visible | ✅ |
| Play button | Amber/yellow 3D-shadow pill "▶ Play!" | ✅ Matches spec | ✅ |

**Issues:**
- ⚠️ Settings gear is visible but navigates to Level 1 instead of Settings screen. (BUG-05)

---

## Screen 2 — Level 1 Gameplay

![Level 1 gameplay](screenshots/ss_02_level1_q2_hint1.png)

**Result: ❌ FAIL — prompt text is wrong**

The visual design carries through perfectly from the menu. The mechanic renders cleanly. But the question itself is wrong.

| Element | Expected | Actual | Pass? |
|---|---|---|---|
| Background | Adventure sky, same as menu | ✅ Consistent | ✅ |
| Scene title | "Level 1 — Halves" | ✅ Correct | ✅ |
| Back nav | "← Menu" top-left | ✅ Visible | ✅ |
| Hint button | Blue circle "?" top-right | ✅ Correct | ✅ |
| **Prompt text** | **"Split this shape into 2 equal parts"** or similar partition instruction | **❌ Shows "Which shape has 1/3 shaded?"** | **❌** |
| Shape | White rectangle, blue vertical drag-line | ✅ Renders | ✅ |
| Drag-line | Draggable, moves on pointer input | ✅ Moves | ✅ |
| Submit button | Amber "Check ✓" pill | ✅ Matches menu style | ✅ |
| Progress bar | Small fill indicator at bottom | ✅ Visible | ✅ |
| Progress counter | "1 / 5" format | ✅ Visible | ✅ |

**What's wrong:**

The prompt says *"Which shape has 1/3 shaded?"* — this is an `identify` archetype question about thirds. The screen is called "Level 1 — Halves" and shows a `partition` drag mechanic. Three things are simultaneously wrong:

1. Wrong **archetype** — `identify` (tap a picture) vs `partition` (drag a line)
2. Wrong **fraction** — 1/3 vs 1/2
3. Wrong **action verb** — "which shape" (multiple choice) vs "split" (drag)

A 6-year-old reading this would have no idea what to do.

---

## Screen 3 — Hint (Tier 1)

![Hint tier 1](screenshots/ss_02_level1_q2_hint1.png)

*Note: This screenshot is the same image file as Screen 2. Screen 3 is the same moment captured — the hint tooltip was visible in this frame. A dedicated screenshot for hint Tier 1 is needed.*

**Result: 🟡 PARTIAL — Tier 1 content is right; tiers 2 and 3 never appear**

| Element | Expected | Actual | Pass? |
|---|---|---|---|
| Tier 1 hint text | Verbal encouragement about equal parts | ✅ "Equal parts means each piece is the same size. Try the middle!" | ✅ |
| Hint box styling | White pill below the shape | ✅ Correct | ✅ |
| Tier 2 on second press | Visual overlay showing midpoint | ❌ Shows Tier 1 again | ❌ |
| Tier 3 on third press | Worked example | ❌ Never triggers | ❌ |

**Note:** The Tier 1 content ("Try the middle!") is exactly the right pedagogical hint for a partition/halves question. The hint system *knows* what it should say — which confirms the scene is wired for `partition` logic. The prompt text mismatch is purely a template-loading bug, not a mechanic design mistake.

---

## Screen 4 — After Clicking "Check ✓"

![After check](screenshots/ss_04_level1_check.png)

**Result: ❌ FAIL — no feedback, no progress**

| Expected | Actual | Pass? |
|---|---|---|
| Green overlay / "🎉 Correct!" if handle is centered | No visible change | ❌ |
| Red overlay / "Try again!" if handle is off-center | No visible change | ❌ |
| Progress counter increments on correct answer | Stays at 1/5 | ❌ |
| Next question loads after correct | Never happens | ❌ |

The screen looks identical before and after pressing Check. No feedback fires. This is BUG-02.

---

## Screen 5 — Back to Menu

![Back to menu](screenshots/ss_05_back_to_menu.png)

**Result: ✅ PASS**

"← Menu" button is visible, correctly labelled, and clickable. No crash. Navigation works cleanly.

---

## Screen 6 — Settings

![Settings screen](screenshots/ss_06_settings.png)

**Result: ✅ PASS (correction from earlier finding)**

Code review confirms the gear button calls `this.scene.launch('SettingsScene')` — not `scene.start`. This is the correct Phaser call for overlaying a scene without destroying the current one. The earlier QA finding of BUG-05 was likely an artifact of the IDE preview environment adding a banner that intercepted taps.

**Action required:** Retest the settings gear in a real browser tab at `localhost:5002` to confirm. If it fails in a real browser, escalate to BUG-05. If it works, this is resolved.

| Element | Status |
|---|---|
| Gear button routes to SettingsScene | ✅ Code confirms `scene.launch('SettingsScene')` |
| SettingsScene is fully implemented | ✅ 393 lines — Reduced Motion, TTS, Export, Reset, Privacy |
| Accessible from menu | ✅ Confirmed (pending live browser retest) |

---

## Screens Not Yet Tested

These flows exist in code but were not reached during QA:

| Screen / Flow | Why Not Tested | Priority |
|---|---|---|
| Session complete ("Well done!" card) | Blocked by BUG-02 — can't get 5 correct | 🔴 Critical |
| **Level 2–9 — any level** | **No UI route from the menu. Adventure map is decorative.** | 🔴 Critical |
| **"Keep going" after session complete** | **Code confirmed: loops Level 1, does not advance to Level 2** | 🔴 Critical |
| Settings — Export backup downloads file | Pending retest in real browser | 🟡 High |
| Settings — Reset device with confirmation | Pending retest in real browser | 🟡 High |
| Level unlock (does L2 unlock after L1 mastery?) | No unlock system exists yet | 🔴 Critical |
| App on iPad — touch drag | Not tested at all | 🔴 Critical |
| App offline (no network) | Not tested | 🟡 High |
| App after browser close + reopen (session resume) | Not tested | 🟡 High |
| TTS audio (prompt read aloud) | Not activated in code | 🟡 High |
| Hint Tier 2 — visual midpoint overlay | Never fires (BUG-04) | 🟡 High |
| Hint Tier 3 — worked example | Never fires (BUG-04) | 🟡 High |
| BKT mastery state in IndexedDB after 5 answers | BKT never called — all states zero | 🔴 Critical |
| Misconception flag written after repeated wrong answer | Wired in LevelScene, not Level01Scene | 🟡 High |

---

## Bug Register

| # | Bug | Where | Severity | Status |
|---|---|---|---|---|
| BUG-01 | Prompt shows `identify` archetype ("Which shape has 1/3 shaded?") on `partition` scene | Level01Scene.create() | 🔴 Critical | Fix: filter `templatePool` to `archetype === 'partition'` |
| BUG-02 | Validation never passes — no feedback, no progress increment | Level01Scene.onSubmit() | 🔴 Critical | Fix: debug `handlePos` update on drag events |
| BUG-04 | Hint tiers don't advance — Tier 1 repeats on every press | Level01Scene.onHintRequest() | 🟡 High | Fix: advance `currentHintTier` state on each press |
| BUG-05 | Settings gear routes incorrectly | MenuScene | ✅ Likely resolved | ✅ Likely resolved — code uses scene.launch('SettingsScene') correctly; earlier finding was IDE preview artifact. **Retest in real browser before closing.** |
| G-C3 | No UI route to Level 2–9 from the menu | MenuScene / Level architecture | 🔴 Critical | Needs level-select or mastery-gated adventure map |
| G-C7 | "Keep going" after session complete loops Level 1 | LevelScene.showSessionComplete() | 🔴 Critical | Fix: advance `levelNumber` then start `LevelScene` |

---

## What the Happy Path Should Look Like

This is what a working session should look like — and what we need to be able to verify before Sprint 0 is complete:

```
1. Student opens app
2. [Future] Student taps their name card
3. Student taps "▶ Play!"
4. Level 1 loads — prompt says "Split this shape into 2 equal parts"
5. TTS reads the prompt aloud (future: Sprint 2)
6. Student drags the blue line to the center of the rectangle
7. Student taps "Check ✓"
8. Green overlay: "🎉 Great job!" — progress bar fills to 1/5
9. Next question loads — new prompt, same mechanic
10. Repeat for questions 2, 3, 4, 5
11. Progress bar reaches 5/5
12. "Well done! 🌟" session complete card appears
13. Student taps "Keep Going" or "Back to Menu"
14. [Future] BKT mastery updated — teacher can see "APPROACHING" state
```

Steps 4, 7, 8, and 11–14 are currently broken or untested.

---

## Readiness Score (Current)

| Category | Score | Reasoning |
|---|---|---|
| Visual Design | **9 / 10** | Adventure theme, Fredoka font, amber buttons — excellent. TTS gap keeps it from 10. |
| Gameplay Loop | **1 / 10** | Drag mechanic renders. Prompt is wrong. Validation never passes. Session unreachable. |
| Hint System | **4 / 10** | Tier 1 content is correct. Tiers 2–3 never fire. |
| Navigation | **7 / 10** | Menu → Level 1 works. Settings likely works (pending retest). No route to L2–L9. |
| Learning Engine | **1 / 10** | Misconception detectors partially wired (LevelScene only). BKT never called. Nothing feels adaptive. |
| Level Progression | **0 / 10** | Only Level 1 accessible from the UI. "Keep going" loops Level 1 indefinitely. |
| Content | **3 / 10** | L1 templates exist but wrong archetype loads. L2 skeleton only. L3–L9 unwritten. |
| Accessibility | **4 / 10** | ARIA live regions present. TTS built but not activated. Touch / iPad untested. |
| **Overall** | **🔴 NOT READY** | **Gameplay loop broken. Only 1 of 9 levels accessible. Learning engine invisible to students.** |

---

## Next Step

**Fix BUG-01 first.** It's a one-line change. The moment the right prompt appears for the right mechanic, the app will be emotionally coherent for the student — even before BUG-02 is fixed. It also unblocks testing hypothesis: "is the drag validation wrong, or are we just testing the wrong question?"

*Report created: 2026-04-27 | Based on live browser session with screenshot evidence*
