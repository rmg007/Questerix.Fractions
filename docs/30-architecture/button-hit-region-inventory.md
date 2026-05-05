# Button Hit-Region Inventory

**Plan:** `PLANS/2026-05-04-button-hit-regions.md` — Phase 1 output  
**Audited:** 2026-05-05 (re-audited with canvas-to-CSS scaling; prior version incorrectly marked violations as "ok")

`visualBounds` = rendered visual size in canvas pixels.  
`currentHitArea` = actual interactive hit rectangle in canvas pixels.  
`cssH@360vp` = hit height in CSS px at minimum supported viewport (scale 360/800 = 0.45).  
`status` = `compliant` · `violation` · `fixed` · `deferred` · `not-a-button`

### Conversion note

Canvas is 800 × 1280 px. Phaser Scale.FIT. At 360 CSS px viewport: scale = 0.45.  
WCAG 2.5.5 requires 44 CSS px → **98 canvas px minimum** on each axis at this viewport.

| file | line | symbol | hitArea (canvas px) | cssH@360vp | status | phase | testCoverage |
|---|---|---|---|---|---|---|---|
| `src/scenes/utils/menuButtonHelpers.ts` | 77 | `createStationButton` | `Rect(-half.w,-half.h,w,h+shadow)` ≥100 h | ≥45 CSS px | compliant | — | unit |
| `src/scenes/utils/levelTheme.ts` | 160 | `createActionButton` | `Rect(-W/2,-H/2,W,H+SHADOW)` | ≥36 CSS px | compliant | — | unit |
| `src/scenes/utils/levelTheme.ts` | 241 | `createHintPillButton` | `Rect(-W/2,-H/2,W,H+SHADOW)` H=64 | 29 CSS px | **violation** | 3 | none |
| `src/scenes/utils/levelTheme.ts` | 321 | circle nav button | `Rect(-R,-R,D,D)` D≥100 | ≥45 CSS px | compliant | — | none |
| `src/lib/levelSceneChrome.ts` | 74 | back button | explicit `Rect(-W/2,-H/2,W,H)` | — | compliant | — | none |
| `src/scenes/Level01SceneLayout.ts` | 50 | home emoji back btn | `Rect(-32,-28,64,56)` 64×56 | 25 CSS px | **violation** | 4 | none |
| `src/scenes/OnboardingScene.ts` | 214 | "Skip tutorial" link | transparent `Rect 200×100` | 45 CSS px | compliant | — | none |
| `src/scenes/OnboardingScene.ts` | 332 | demo tap-to-skip zone | full canvas `CW×CH` | n/a | not-a-button | — | — |
| `src/scenes/SettingsScene.ts` | 332 | "Privacy Notice →" link | transparent `Rect 220×100` | 45 CSS px | compliant | — | none |
| `src/scenes/SettingsScene.ts` | 388 | toggle buttons (HC/RM/sound) | `Rect BTN_W×BTN_H` = 360×100 | 45 CSS px | compliant | — | none |
| `src/scenes/FirstRunScene.ts` | 221 | "Let's go! ▶" start btn | `Rect 360×100` | 45 CSS px | compliant | — | none |
| `src/scenes/FirstRunScene.ts` | 244 | "No thanks, just play" skip | `Rect 260×100` | 45 CSS px | fixed | 2 | none |
| `src/scenes/LevelMapScene.ts` | 468 | "← Menu" back btn | `Rect 160×100` | 45 CSS px | compliant | — | none |
| `src/scenes/RecoveryScene.ts` | 178 | recovery action btns | `container.setSize(340,72)` | 32 CSS px | **violation** | 4 | none |
| `src/scenes/DBRecoveryScene.ts` | 169 | recovery action btns | `container.setSize(360,72)` | 32 CSS px | **violation** | 4 | none |
| `src/components/sessionComplete/buttons.ts` | 80 | session-complete primary btn | `Rect 300×(H+SHADOW=107)` | 48 CSS px | compliant | — | unit |
| `src/components/sessionComplete/buttons.ts` | 80 | session-complete secondary btn | `Rect 300×(H+SHADOW=100)` | 45 CSS px | compliant | — | unit |
| `src/components/sessionComplete/scaffoldBanner.ts` | 74 | scaffold recommendation banner | `Rect 440×64` | 29 CSS px | **violation** | 3 | none |
| `src/components/QuestCompleteOverlay.ts` | 173 | "Play Again from Level 1" btn | `Rect 320×71` (H+SHADOW) | 32 CSS px | **violation** | 3 | none |
| `src/components/QuestCompleteOverlay.ts` | 201 | "Back to Menu" btn | `Rect 320×54` | 24 CSS px | **violation** | 3 | none |
| `src/components/StudentSwitcher.ts` | 135 | student chip (collapsed) | `Rect CHIP_W×CHIP_H` = 200×80 | 36 CSS px | **violation** | 4 | none |
| `src/components/StudentSwitcher.ts` | 205 | panel backdrop (scrim) | full canvas | n/a | not-a-button | — | — |
| `src/components/StudentSwitcher.ts` | 264 | student profile card | `Rect 324×CARD_H` = 324×100 | 45 CSS px | compliant | — | none |
| `src/components/StudentSwitcher.ts` | 299 | "Add student" btn | `Rect 324×ADD_BTN_H` = 324×80 | 36 CSS px | **violation** | 4 | none |
| `src/components/UpdateBanner.ts` | 82 | SW update banner | `Rect full-width×BANNER_HEIGHT` = ×80 | 36 CSS px | **violation** | 4 | none |
| `src/components/DragHandle.ts` | 102 | drag handle gripper | `Rect HIT_TARGET×HIT_TARGET` ≥44 | ≥44 CSS px | compliant | — | unit |
| `src/components/PostSessionOverlay.ts` | 97 | modal scrim | full canvas | n/a | not-a-button | — | — |
| `src/components/LevelCard.ts` | 262 | level card container | 220×160 container | 72 CSS px | compliant | — | e2e |
| `src/scenes/utils/menuOverlayHelpers.ts` | 57 | overlay scrim | full canvas | n/a | not-a-button | — | — |
| `src/scenes/utils/menuOverlayHelpers.ts` | 105 | overlay text btns | bare Text `.setInteractive` | ~10 CSS px | deferred | — | none |
| `src/scenes/settings/versionTapToggle.ts` | 42 | version debug tap | bare Text `.setInteractive` | ~11 CSS px | deferred | — | none |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 118 | card drag tokens | `Rect hitW×hitH` hitH=max(52,44)=52 | 23 CSS px | **violation** | 4b | none |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 180 | "Check ordering" btn | `Rect 220×56` | 25 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 252 | rule-option choice btns | `Rect (w-100)×60` | 27 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 294 | submit explain btn | `Rect 220×56` | 25 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/IdentifyInteraction.ts` | 130 | option card hit zones | `Rect cardW×cardH` = ≤180×160 | 72 CSS px | compliant | — | none |
| `src/scenes/interactions/LabelInteraction.ts` | 97 | label tile draggable | `Rect 120×48` (no padding) | 22 CSS px | **violation** | 4b | none |
| `src/scenes/interactions/LabelInteraction.ts` | 179 | submit "Check" btn | `Rect 240×52` | 23 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/MakeInteraction.ts` | 82 | drag handle (via DragHandle) | via DragHandle HIT_TARGET | ≥44 CSS px | compliant | — | unit |
| `src/scenes/interactions/MakeInteraction.ts` | 117 | "Divide" btn | `Rect 240×52` | 23 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/MakeInteraction.ts` | 128 | left shade region | `Rect dynamic×SHAPE_H` = ×520 | 234 CSS px | compliant | — | none |
| `src/scenes/interactions/MakeInteraction.ts` | 132 | right shade region | `Rect dynamic×SHAPE_H` = ×520 | 234 CSS px | compliant | — | none |
| `src/scenes/interactions/MakeInteraction.ts` | 163 | "Check" submit btn | `Rect 240×52` | 23 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/CompareInteraction.ts` | 159 | choice btns (</>/=) | `Rect 180×56` | 25 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/BenchmarkInteraction.ts` | 104 | zone hit btns | `Rect zoneW×64` | 29 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/EqualOrNotInteraction.ts` | 71 | equal/not-equal btns | `Rect btnW×88` | 40 CSS px | **violation** | 4 | none |
| `src/scenes/interactions/SnapMatchInteraction.ts` | 114 | draggable cards | `Rect 120×48` (no padding) | 22 CSS px | **violation** | 4b | none |
| `src/scenes/interactions/OrderInteraction.ts` | 124 | card drag tokens | `Rect hitW×hitH` hitH=max(52,44)=52 | 23 CSS px | **violation** | 4b | none |
| `src/scenes/interactions/utils/NumberLine.ts` | 125 | number-line draggable marker | `Circle r=22` → diameter 44 canvas | 20 CSS px | **violation** | 4b | none |

---

## Violations by fix phase (26 total)

### Phase 2 — text-only & link buttons (0 remaining)

| file | line | current canvas h | fix |
|---|---|---|---|
| ~~`src/scenes/FirstRunScene.ts`~~ | ~~244~~ | ~~80~~ | ✓ fixed — raised `h` to 100 (PR: Phase 2) |

### Phase 3 — shadow-aware & overlay buttons (4)

| file | line | current canvas h | fix |
|---|---|---|---|
| `src/scenes/utils/levelTheme.ts` | 241 | 64 | raise `H` to 100 |
| `src/components/sessionComplete/scaffoldBanner.ts` | 74 | 64 | raise `H` to 100 |
| `src/components/QuestCompleteOverlay.ts` | 173 | 64 (71 w/shadow) | raise `H` to 100 |
| `src/components/QuestCompleteOverlay.ts` | 201 | 54 | raise `H` to 100 |

### Phase 4 — general button sweep (16)

| file | line | current canvas h | fix |
|---|---|---|---|
| `src/scenes/Level01SceneLayout.ts` | 50 | 56 | `Rect(-49,-49,98,98)` |
| `src/scenes/RecoveryScene.ts` | 178 | 72 | raise `BTN_H` to 100 |
| `src/scenes/DBRecoveryScene.ts` | 169 | 72 | raise `BTN_H` to 100 |
| `src/components/StudentSwitcher.ts` | 135 | 80 | raise `CHIP_H` to 100 |
| `src/components/StudentSwitcher.ts` | 299 | 80 | raise `ADD_BTN_H` to 100 |
| `src/components/UpdateBanner.ts` | 82 | 80 | raise `BANNER_HEIGHT` to 100 |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 180 | 56 | raise `H` to 100 |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 252 | 60 | raise `optionH` to 100 |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 294 | 56 | raise `H` to 100 |
| `src/scenes/interactions/LabelInteraction.ts` | 179 | 52 | raise `H` to 100 |
| `src/scenes/interactions/MakeInteraction.ts` | 117 | 52 | raise `H` to 100 |
| `src/scenes/interactions/MakeInteraction.ts` | 163 | 52 | raise `H` to 100 |
| `src/scenes/interactions/CompareInteraction.ts` | 159 | 56 | raise `H` to 100 |
| `src/scenes/interactions/BenchmarkInteraction.ts` | 104 | 64 | raise `H` to 100 |
| `src/scenes/interactions/EqualOrNotInteraction.ts` | 71 | 88 | raise `btnH` to 100 |

### Phase 4b — drag targets (5)

| file | line | current geometry | fix |
|---|---|---|---|
| `src/scenes/interactions/LabelInteraction.ts` | 97 | `Rect 120×48` | raise tile h to 110 canvas px |
| `src/scenes/interactions/SnapMatchInteraction.ts` | 114 | `Rect 120×48` | raise card h to 110 canvas px |
| `src/scenes/interactions/ExplainYourOrderInteraction.ts` | 118 | `hitH=max(52,44)` | raise `cardH` from 44 → 100; hitH follows |
| `src/scenes/interactions/OrderInteraction.ts` | 124 | `hitH=max(52,44)` | raise `cardH` from 44 → 100; hitH follows |
| `src/scenes/interactions/utils/NumberLine.ts` | 125 | `Circle r=22` | raise radius to 55 (d=110 canvas) |

---

## Drag thresholds

| archetype | engageThresholdPx | cancelRevertMs | notes |
|---|---|---|---|
| `label` | Phaser default (~6) | none | snap on `dragend`, no cancel animation |
| `snap_match` | Phaser default (~6) | none | snap on `dragend` |
| `explain_your_order` | Phaser default (~6) | none | snap on `dragend` |
| `order` | Phaser default (~6) | none | snap on `dragend` |
| `make` | via `DragHandle.ts` | `Gesture.dragCancelRevertMs` | DragHandle owns threshold |
| `benchmark` (NumberLine) | Phaser default (~6) | none | snap on `dragend` |

All archetypes use Phaser's default engage threshold. Phase 4b should wire bounce-back cancel-revert to all drag archetypes per the gesture grammar.

---

## Deferred

| file | line | symbol | reason |
|---|---|---|---|
| `src/scenes/utils/menuOverlayHelpers.ts` | 105/157 | overlay text btns | Low-frequency dialog path; audit in Phase 4 if confirmed to be reachable in gameplay |
| `src/scenes/settings/versionTapToggle.ts` | 42 | version debug tap | Dev/debug path, not shown in production flows |
