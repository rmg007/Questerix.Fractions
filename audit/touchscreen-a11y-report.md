# Touchscreen Accessibility Audit Report

**Date:** 2026-05-05  
**Auditor:** Claude Code (Phase 1–2 of PLANS/2026-05-04-touchscreen-a11y-audit.md)  
**Canvas size:** 800 × 1280 px (internal Phaser coordinates)  
**Target viewport:** 360 px wide (minimum supported)  
**Standard:** WCAG 2.5.5 — touch targets ≥ 44 × 44 CSS px

---

## Methodology

All scene and component files were read directly. Measurements are in **Phaser canvas pixels** (800 × 1280 internal). At 360 px viewport the device-pixel scale factor is approximately **0.45×** (360 / 800), so a Phaser element must be at least **98 × 98 canvas px** to meet the 44 CSS px minimum on a 360 px device. For non-interactive display items, the threshold is just noting the font size in CSS-equivalent pixels.

**Touch-target CSS size formula:**  
`css_px = canvas_px × (viewport_width / canvas_width) = canvas_px × 0.45`

**Font CSS size formula:**  
`css_px = font_canvas_px × 0.45`

---

## Findings Table

| # | Component / File | Element | Measurement (canvas px) | CSS px @ 360 vp | Required | Status | Severity | Fix Phase |
|---|---|---|---|---|---|---|---|---|
| 1 | `LevelMapScene.ts` → `_drawBackButton()` | Back button hit zone | 136 × 52 canvas | 61 × 23 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 2 | `LevelMapScene.ts` → `_drawConnectingPath()` | Path dashes (decorative) | N/A | N/A | N/A | PASS (non-interactive) | INFO | — |
| 3 | `LevelMapScene.ts` → streak pill | Streak pill text 18 px canvas | 8 CSS | ≥ 16 body | FAIL | WARNING | body text < 16 | Phase 3 |
| 4 | `SettingsScene.ts` → `createButton()` | Settings buttons (Export/Restore/Reset/Update/Refresh/Back) | 360 × 60 canvas | 162 × 27 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 5 | `SettingsScene.ts` → `createPrivacyLink()` | Privacy Notice hit zone | 220 × 44 canvas | 99 × 20 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 6 | `SettingsScene.ts` → `sectionLabel()` | Section label text 22 px | 10 CSS | ≥ 16 body | FAIL | WARNING | label text < 16 CSS | Phase 3 |
| 7 | `OnboardingScene.ts` → skip link | Skip hit zone | 200 × 44 canvas | 90 × 20 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 8 | `OnboardingScene.ts` → step dots | Step indicator dots (non-interactive) | 28 × 28 canvas (14 radius) | 13 CSS diameter | — | PASS (non-interactive) | INFO | — |
| 9 | `OnboardingScene.ts` → action button | "Check ✓" / "Let's Play" button | created via `createActionButton` (levelTheme) | see row 10 | — | — | — | — |
| 10 | `levelTheme.ts` → `createActionButton()` | Action button hit area | ~320 × 64 canvas | 144 × 29 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 11 | `MenuScene.ts` → `createStationButton()` | Play button | 440 × 110 canvas | 198 × 50 CSS | 44 × 44 | PASS | OK | — |
| 12 | `MenuScene.ts` → `createStationButton()` | Continue button | 360 × 90 canvas | 162 × 41 CSS | 44 × 44 | MARGINAL height (41 vs 44) | WARNING | Phase 3 |
| 13 | `MenuScene.ts` → `createStationButton()` | Settings gear button | 100 × 100 canvas | 45 × 45 CSS | 44 × 44 | PASS | OK | — |
| 14 | `MenuScene.ts` → `createChooseLevelButton()` | "Choose Level" pill | 220 × 48 canvas | 99 × 22 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 15 | `MenuScene.ts` → title text | "Questerix Fractions" 76 px canvas | 34 CSS | ≥ 16 heading | PASS (display heading) | INFO | — |
| 16 | `LevelMapScene.ts` → `LevelCard` nodes | LevelCard interactive hit zone | cards scaled at CARD_SCALE=0.65, TestHook overlay 110×110 canvas | 50×50 CSS | 44×44 | PASS (overlay ≥ 44) | OK | — |
| 17 | `HintLadder.ts` | Logic-only (no Phaser GameObjects) | N/A | N/A | N/A | N/A | INFO | — |
| 18 | `FractionDisplay.ts` | Default fontSize 24 px canvas | 11 CSS | ≥ 16 | FAIL (used in badges/chips) | WARNING | Phase 3 |
| 19 | `FractionDisplay.ts` | setInteractive() | Not interactive | — | N/A | PASS | INFO | — |
| 20 | `SessionCompleteOverlay.ts` → `createButton()` | Primary button (Next Level, Play Again) | W=300 × H=64+shadow canvas | 135 × 32 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 21 | `SessionCompleteOverlay.ts` → `createButton()` | Secondary button (Back to Menu) | W=300 × H=54 canvas | 135 × 24 CSS | 44 × 44 | FAIL height | CRITICAL | Phase 3 |
| 22 | `Mascot.ts` | Mascot idle — not interactive (no setInteractive call) | N/A | — | N/A | PASS | INFO | — |
| 23 | `ProgressBar.ts` | Stars display (non-interactive) | 36 px font canvas | 16 CSS | ≥ 16 | PASS | OK | — |
| 24 | `IdentifyInteraction.ts` | Option card hit zone | cardH=160 canvas | 72 CSS | 44 | PASS | OK | — |
| 25 | `IdentifyInteraction.ts` | Option label fallback text 14 px | 6 CSS | ≥ 16 | FAIL | WARNING | — | interaction agent |
| 26 | `PartitionInteraction.ts` | Drag affordance text 16 px canvas | 7 CSS | ≥ 16 | FAIL | WARNING | — | interaction agent |
| 27 | `LabelInteraction.ts` | Label tile 120 × 48 canvas | 54 × 22 CSS | 44 × 44 | FAIL height | CRITICAL | — | interaction agent |
| 28 | `LabelInteraction.ts` | Region label text 13 px | 6 CSS | ≥ 16 | FAIL | WARNING | — | interaction agent |
| 29 | `LabelInteraction.ts` | Submit button 240 × 52 canvas | 108 × 23 CSS | 44 × 44 | FAIL height | CRITICAL | — | interaction agent |
| 30 | `MakeInteraction.ts` | "Confirm Fold" button 240 × 52 canvas | 108 × 23 CSS | 44 × 44 | FAIL height | CRITICAL | — | interaction agent |
| 31 | `MakeInteraction.ts` | "Check" button 240 × 52 canvas | 108 × 23 CSS | 44 × 44 | FAIL height | CRITICAL | — | interaction agent |
| 32 | `CompareInteraction.ts` | Relation buttons 180 × 56 canvas | 81 × 25 CSS | 44 × 44 | FAIL height | CRITICAL | — | interaction agent |
| 33 | `CompareInteraction.ts` | Button font 14 px | 6 CSS | ≥ 16 | FAIL | WARNING | — | interaction agent |
| 34 | `SettingsScene.ts` → `createButton()` | Button text 22 px canvas | 10 CSS | ≥ 16 body | WARNING | text at CSS edge | Phase 3 |
| 35 | `MenuScene.ts` → horizontal at 360 px | Canvas fits 800 wide → letterboxed; no horizontal overflow from Phaser canvas | checked | — | PASS | OK | — |

---

## Summary by Severity

### CRITICAL (Phase 3 — in-scope for this agent)
| # | Location | Issue |
|---|---|---|
| 1 | `LevelMapScene._drawBackButton` | Hit zone H=52 canvas → 23 CSS px — below 44 px minimum |
| 4 | `SettingsScene.createButton` | All 6 buttons: H=60 canvas → 27 CSS px — below 44 px minimum |
| 5 | `SettingsScene.createPrivacyLink` | Hit zone H=44 canvas → 20 CSS px — below 44 px minimum |
| 7 | `OnboardingScene` skip link | Hit zone H=44 canvas → 20 CSS px — below 44 px minimum |
| 10 | `levelTheme.createActionButton` | Default hit zone ~64 canvas → 29 CSS px — below 44 px minimum |
| 14 | `MenuScene.createChooseLevelButton` | Pill H=48 canvas → 22 CSS px — below 44 px minimum |
| 20/21 | `SessionCompleteOverlay / buttons.ts` | Primary H=64 → 29 CSS, Secondary H=54 → 24 CSS — both below 44 px |

### CRITICAL (interaction agent — out-of-scope for Phase 3)
| # | Location | Issue |
|---|---|---|
| 27 | `LabelInteraction` label tiles | H=48 canvas → 22 CSS px |
| 29 | `LabelInteraction` submit | H=52 canvas → 23 CSS px |
| 30/31 | `MakeInteraction` buttons | H=52 canvas → 23 CSS px |
| 32 | `CompareInteraction` relation buttons | H=56 canvas → 25 CSS px |

### WARNING
| # | Location | Issue |
|---|---|---|
| 3 | `LevelMapScene` streak pill | Font 18 px canvas → 8 CSS (body text) |
| 6 | `SettingsScene` section labels | Font 22 px canvas → 10 CSS |
| 12 | `MenuScene` Continue button | H=90 canvas → 41 CSS (3 px below minimum) |
| 18 | `FractionDisplay` default fontSize | 24 px canvas → 11 CSS when used at small sizes |
| 25 | `IdentifyInteraction` fallback text | 14 px canvas → 6 CSS |
| 26 | `PartitionInteraction` affordance text | 16 px canvas → 7 CSS |
| 28 | `LabelInteraction` region labels | 13 px canvas → 6 CSS |
| 33 | `CompareInteraction` button labels | 14 px canvas → 6 CSS |
| 34 | `SettingsScene` button text | 22 px canvas → 10 CSS |

### INFO (no action required)
- Mascot: not interactive, no touch target concern
- HintLadder: logic-only, no rendering
- Step dots in OnboardingScene: non-interactive progress indicators
- ProgressBar stars: non-interactive display only
- Path dashes in LevelMapScene: purely decorative

---

## Root cause

The Phaser canvas is 800 px wide but the minimum supported viewport is 360 px. The **scale ratio is 0.45**, meaning all canvas pixel sizes are multiplied by 0.45 for CSS equivalents. All legacy buttons were designed with canvas-space heights of 48–64 px which looked fine on desktop but translate to **22–29 CSS px** on a 360 px phone — well below the 44 CSS px minimum.

**Fix pattern:** buttons must be **at least 98 canvas px tall** to guarantee 44 CSS px at 360 vp (98 × 0.45 ≈ 44). Recommended: use 100 canvas px for all button heights.

---

*Phase 3 fixes applied to:* `LevelMapScene.ts`, `SettingsScene.ts`, `OnboardingScene.ts`, `MenuScene.ts`, `SessionCompleteOverlay.ts` (via `src/components/sessionComplete/buttons.ts`), and `levelTheme.ts` (createActionButton).

*Out-of-scope items (interaction agent):* `IdentifyInteraction`, `LabelInteraction`, `MakeInteraction`, `CompareInteraction`.
